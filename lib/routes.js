'use strict';

const TokenController = require('./controllers/token');

/** @param {import('@rezeus/korauter')} router */
module.exports = (router) => {
  router.scope('/token', (token) => {
    token.post('/', TokenController.create);
    // TODO Token refresh endpoint
    //
  });
};
