'use strict';

const jwt = require('jsonwebtoken');
const { packRules } = require('@casl/ability/extra');
const uuid4 = require('uuid/v4');

const { compress } = require('../src/arrayCompress');

async function sign(payload, secretOrPrivateKey, options = null) {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secretOrPrivateKey, options, (err, tokenAsString) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokenAsString);
      }
    });
  });
}
// const { createTokensForUser } = require('../src/tokens');

/** @param {import('koa').Context} ctx */
async function login(ctx) {
  const usernameOrEmail = (ctx.request.body.username || ctx.request.body.email);
  const plainPassword = ctx.request.body.password;

  if (!usernameOrEmail || !plainPassword) {
    ctx.throw(403, { code: 54 });
  }


  // NOTE Here we define another requirement (`database.models`) for this module
  const model = global.kernel.database.models.User;

  if (!model) {
    throw new Error('User model wasn\'t defined.');
  }
  // NOTE Here we define another requirement (`model.findAndVerifyCredentials()`) for this module
  if (typeof model.findAndVerifyCredentials !== 'function') {
    throw new Error('findAndVerifyCredentials function couldn\'t be found in User model.');
  }


  let user;
  try {
    user = await model.findAndVerifyCredentials(usernameOrEmail, plainPassword);
  } catch (exception) {
    ctx.throw((exception.status || 401), exception);
  }


  const config = global.kernel.config.token;

  const commonPayload = {
    // Registered claims
    //
    iss: config.issuer,
    sub: user.id,
    // aud: '',
    // nbf: '',
    // NOTE No 'exp', 'iat' for tokens as they
    //      will be assigned upon signing.

    // Private claims
    // NOTE Add private claims for all tokens here
  };
  const accessTokenPayload = {
    // Registered claims
    //
    jti: uuid4(),
    //

    // Private claims
    //
    ttp: 'acc', // Token TyPe
    sar: compress(packRules(user.abilityRules)), // Subject Ability Rules
    // NOTE Add more token-specific private claims here

    ...commonPayload,
  };
  const refreshTokenPayload = {
    // Registered claims
    //
    jti: uuid4(),
    //

    // Private claims
    //
    ttp: 'ref', // token type
    // NOTE Add more token-specific private claims here

    ...commonPayload,
  };

  const accessTokenOpts = {
    mutatePayload: true,
    expiresIn: config.access.lifetime,
  };
  const refreshTokenOpts = {
    mutatePayload: true,
    expiresIn: config.refresh.lifetime,
  };

  const [accessToken, refreshToken] = await Promise.all([
    sign(accessTokenPayload, config.secret, accessTokenOpts),
    sign(refreshTokenPayload, config.secret, refreshTokenOpts),
  ]);
  // const { accessToken, refreshToken } = createTokensForUser(user);
  // const tokenStrings = await Promise.all([
  //   accessToken.toString(),
  //   refreshToken.toString(),
  // ]);


  // NOTE Can cache the tokens (i.e. `accessTokenPayload.exp`, `accessTokenPayload.jti`)


  ctx.body = {
    id: user.id,
    accessToken,
    refreshToken,
    // accessToken: tokenStrings[0],
    // refreshToken: tokenStrings[1],
  };
}

function createTokens(ctx,  forUser, scopes = null) {
  // TODO Check if `ctx.token.can('create', 'User', ['role'/'abilities'])`
  // TODO If `scopes` set use them (but first filter them with user's abilities)
}

module.exports = {
  /** @param {import('koa').Context} ctx */
  async create(ctx) {
    // Create access and refresh tokens for the user
    // with all his/her permissions given as scopes
    // for the access token. In other words resultant
    // access token is going to be treated as the user.

    if (ctx.state.token) {
      // TODO token for someone else
    } else {
      // token for the user (himself/herself)
      await login(ctx);
    }
  },
  //
};
