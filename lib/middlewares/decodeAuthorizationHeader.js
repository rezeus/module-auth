'use strict';

const jwt = require('jsonwebtoken');

/**
 * Promise-returning wrapper for the jsonwebtoken's 'verify' method.
 *
 * @param {string} token
 * @param {string|Buffer} secretOrPublicKey
 * @param {jwt.VerifyOptions} options
 */
function verify(token, secretOrPublicKey, options = {}) {
  // TODO Maybe use bluebird's 'fromCallback' or something like that
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, options, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        if (!Object.prototype.hasOwnProperty.call(decoded, 'exp')) {
          reject(new Error('No expiration claim.')); // TODO How to handle this (on `decodeHeader`)?
        }
        // NOTE Further checks can be done here

        resolve(decoded);
      }
    });
  });
}

/**
 * Decodes Authorization header (if set)
 * and assigns `ctx.state.token`.
 * If header is missing or invalid sets
 * `ctx.state.token` to `null`.
 *
 * @param {import('koa').Context} ctx
 * @param {function} next
 */
module.exports = async (ctx, next) => {
  if (ctx.route.meta.skipHeaderDecode && ctx.route.meta.skipHeaderDecode === true) {
    ctx.state.token = null;
    await next();
    return;
  }

  /** @type {string} */
  const header = ctx.header.authorization;

  if (header === undefined) {
    ctx.state.token = null;
    await next();
    return;
  }

  if (!header.startsWith('Bearer ')) {
    ctx.state.token = null;
    await next();
    return;
  }

  const token = header.substring(7 /* = 'Bearer '.length */);

  try {
    // const decoded = await verify(token, global.config.app.secret, {
    const decoded = await verify(token, global.kernel.config.token.secret, {
      issuer: (global.kernel.config.token.issuer || global.kernel.config.appName),
      //
    });

    ctx.state.token = decoded;
  } catch (err) {
    // console.log(err);
    // ctx.throw(403, 'Invalid access token.');
    // NOTE Do NOT throw error here since we do not know whether [NOTHROW]
    //      authentication is required or not. Let another
    //      middleware take care of throwing. Here just
    //      store the error in place of token.

    if (err.name === 'TokenExpiredError') {
      // ctx.throw(401, { code: 19 }); // [NOTHROW]
      ctx.state.token = new Exception(err.name, { code: 19 }, 'TokenDecodeException');
    } else if (err.name === 'JsonWebTokenError') {
      let code;

      switch (err.message) {
        case 'jwt malformed': code = 33; break;
        case 'jwt signature is required': code = 35; break;
        case 'invalid signature': code = 31; break;
        default: {
          switch (true) {
            case err.message.startsWith('jwt audience invalid'): code = 36; break;
            case err.message.startsWith('jwt issuer invalid'): code = 32; break;
            case err.message.startsWith('jwt id invalid'): code = 37; break;
            case err.message.startsWith('jwt subject invalid'): code = 34; break;
            default: code = 38; // unknown error
          }
        }
      }

      // ctx.throw(401, { code }); // [NOTHROW]
      ctx.state.token = new Exception(err.name, { code }, 'TokenDecodeException');
    } else {
      throw err;
    }

    // ctx.state.token = null; // [NOTHROW]
  }

  await next();
};
