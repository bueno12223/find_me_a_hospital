import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HospitalService } from './hospital.service.js';
import { SearchQuerySchema, ReverseQuerySchema, RadiusQuerySchema, IdParamsSchema } from './hospital.schema.js';

export async function hospitalRoutes(fastify: FastifyInstance) {
  const service = new HospitalService();

  fastify.get('/search', {
    schema: { querystring: SearchQuerySchema }
  }, async (request: FastifyRequest<{ Querystring: { q: string, state?: string, limit: number, offset: number } }>, reply: FastifyReply) => {
    const { q, state, limit, offset } = request.query;
    const result = await service.search(q, state, limit, offset);
    return reply.send(result);
  });

  fastify.get('/reverse', {
    schema: { querystring: ReverseQuerySchema }
  }, async (request: FastifyRequest<{ Querystring: { lat: number, lng: number, limit: number } }>, reply: FastifyReply) => {
    const { lat, lng, limit } = request.query;
    const result = await service.getReverse(lat, lng, limit);
    return reply.send(result);
  });

  fastify.get('/radius', {
    schema: { querystring: RadiusQuerySchema }
  }, async (request: FastifyRequest<{ Querystring: { lat: number, lng: number, distance: number, limit: number, offset: number } }>, reply: FastifyReply) => {
    const { lat, lng, distance, limit, offset } = request.query;
    const result = await service.getRadius(lat, lng, distance, limit, offset);
    return reply.send(result);
  });

  fastify.get('/:id', {
    schema: { params: IdParamsSchema }
  }, async (request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const result = await service.getById(id);
    if (!result) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Hospital not found',
          statusCode: 404
        }
      });
    }
    return reply.send({ data: result });
  });
}
