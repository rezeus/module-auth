'use strict';

const decodeAuthorizationHeader = require('./middlewares/decodeAuthorizationHeader');
const requiresAuth = require('./middlewares/requiresAuth');

// Register middlewares
//
global.kernel.on('server::afterRouterResolveMiddleware', (server) => {
  server.use(decodeAuthorizationHeader);
  server.use(requiresAuth);
});

// Add routes
//
// NOTE This `require` (for routes) MUST be done in here
// NOTE Due to listening the event 'router::beforeAppRoutes', \
//      app routes MAY override this module's routes. Be aware.
// eslint-disable-next-line global-require
global.kernel.on('router::beforeAppRoutes', router => require('./routes')(router));
