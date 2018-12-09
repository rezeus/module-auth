'use strict';

const { Ability } = require('@casl/ability');
const { unpackRules } = require('@casl/ability/extra');

const { decompress } = require('../src/arrayCompress');

/**
 * description
 *
 * @param {import('koa').Context} ctx
 * @param {function} next
 */
module.exports = async (ctx, next) => {
  if (
    (ctx.route.meta.requiresAuth && ctx.route.meta.requiresAuth === true)
    || (ctx.state.token !== null && (ctx.route.meta.extractAbilitiesIfPossible
      && ctx.route.meta.extractAbilitiesIfPossible === true))
  ) {
    // TODO See the deprecated `auth` method for how to throw errors
    ctx.assert(ctx.state.token, 401, { code: 75, headers: { 'WWW-Authenticate': 'Bearer' } }); // route requires auth but NO any access token was sent
    if (typeof ctx.state.token.instanceOf === 'function' && ctx.state.token.instanceOf('TokenDecodeException')) {
      ctx.throw(401, { code: ctx.state.token.code });
    }

    if (global.kernel.cache) {
      // const recordOnCache = await redis.client.getAsync(`token:acc:${ctx.state.token.sub}:${ctx.state.token.jti}`);
      const recordOnCache = await global.kernel.cache.getAsync(`token:acc:${ctx.state.token.sub}:${ctx.state.token.jti}`);
      // const recordOnCache = await global.kernel.cache.get(`token:acc:${ctx.state.token.sub}:${ctx.state.token.jti}`);
      ctx.assert(recordOnCache !== null, 401, { code: 25 }); // access token was revoked

      // NOTE Don't forget to `JSON.parse` the `recordOnCache` if further insvestigation needed
    }

    // extract abilities
    // TODO MAYBE a proper way exists to add `.can()`, `.cannot()` \
    //      and `.throwUnlessCan()` to `ctx.state.token`
    const tokenAbility = new Ability(unpackRules(decompress(ctx.state.token.sar)));
    ctx.state.token.ability = tokenAbility;
    // ctx.state.token.can = tokenAbility.can.bind(tokenAbility);
    // ctx.state.token.cannot = tokenAbility.cannot.bind(tokenAbility);
    // ctx.state.token.throwUnlessCan = tokenAbility.throwUnlessCan.bind(tokenAbility);
  } else if (ctx.state.token instanceof Error) {
    // delete ctx.state.token;
    ctx.state.token = null;
  }

  await next();
};
