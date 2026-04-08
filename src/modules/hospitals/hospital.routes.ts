import { FastifyInstance } from 'fastify';
import { HospitalService } from './hospital.service.js';
import {
  SearchRouteSchema, SearchQuery,
  ReverseRouteSchema, ReverseQuery,
  RadiusRouteSchema, RadiusQuery,
  GetByIdRouteSchema, IdParams,
} from './hospital.schema.js';

export async function hospitalRoutes(fastify: FastifyInstance) {
  const service = new HospitalService();

  fastify.get<{ Querystring: SearchQuery }>('/search', {
    schema: SearchRouteSchema,
  }, async (request) => {
    const { q, state, limit, offset } = request.query;
    return service.search(q, state, limit, offset);
  });

  fastify.get<{ Querystring: ReverseQuery }>('/reverse', {
    schema: ReverseRouteSchema,
  }, async (request) => {
    const { lat, lng, limit } = request.query;
    return service.getReverse(lat, lng, limit);
  });

  fastify.get<{ Querystring: RadiusQuery }>('/radius', {
    schema: RadiusRouteSchema,
  }, async (request) => {
    const { lat, lng, distance, limit, offset } = request.query;
    return service.getRadius(lat, lng, distance, limit, offset);
  });

  fastify.get<{ Params: IdParams }>('/:id', {
    schema: GetByIdRouteSchema,
  }, async (request) => {
    const { id } = request.params;
    return { data: await service.getById(id) };
  });
}
