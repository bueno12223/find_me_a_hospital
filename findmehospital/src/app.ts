import fastify from 'fastify';
import { hospitalRoutes } from './modules/hospitals/hospital.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function buildApp(opts = {}) {
  const app = fastify({
    logger: true,
    ...opts
  });

  app.setErrorHandler(errorHandler);

  app.register(hospitalRoutes, { prefix: '/api/v1/hospitals' });

  return app;
}
