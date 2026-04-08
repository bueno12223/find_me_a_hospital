import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import { hospitalRoutes } from './modules/hospitals/hospital.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function buildApp(opts = {}) {
  const app = fastify({
    logger: true,
    ...opts
  });

  app.register(cors, {
    origin: (origin, cb) => {
      const corsEnv = process.env.CORS_ORIGIN || '*';
      const allowedOrigins = corsEnv.split(',').map(o => o.trim());
      
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      console.warn(`Blocked by CORS: Origin "${origin}" not in [${allowedOrigins}]`);
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.setErrorHandler(errorHandler);

  app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Find Me a Hospital API',
        description:
          'REST API to search and discover US hospitals by name, location, or geographic radius. ' +
          'Data sourced from public hospital location records with PostGIS spatial indexing.',
        version: '1.0.0',
        contact: {
          name: 'Find Me a Hospital',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        { url: 'https://yf52k32pqn.us-east-1.awsapprunner.com', description: 'Production' },
        { url: 'http://localhost:3000', description: 'Local dev' }
      ],
      tags: [
        {
          name: 'Hospitals',
          description: 'Search, lookup, and geo-query US hospital records',
        },
      ],
    },
  });

  // ── Swagger UI at /docs ──────────────────────────────────────────────────────
  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  app.register(hospitalRoutes, { prefix: '/api/v1/hospitals' });

  app.get('/health', async () => {
    return { status: 'OK' };
  });


  return app;
}
