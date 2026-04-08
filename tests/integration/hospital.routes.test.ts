import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { FastifyInstance } from 'fastify';
import { HospitalRepository } from '../../src/modules/hospitals/hospital.repository.js';

describe('Hospital Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/hospitals/search — returns 400 when q is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hospitals/search' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeDefined();
  });

  it('GET /api/v1/hospitals/reverse — returns 400 for invalid coordinates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/reverse?lat=999&lng=0'
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/v1/hospitals/:id — returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hospitals/999999' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/hospitals/search — happy path returns paginated response', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/search?q=general&state=CA'
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      data: expect.any(Array),
      meta: expect.objectContaining({ limit: expect.any(Number) })
    });
  });

  it('GET /api/v1/hospitals/search — applies default pagination when omitted', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hospitals/search?q=general' });
    expect(res.statusCode).toBe(200);
    expect(res.json().meta.limit).toBe(10);
    expect(res.json().meta.offset).toBe(0);
  });

  it('GET /api/v1/hospitals/reverse — happy path includes geodata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/hospitals/reverse?lat=34&lng=-118' });
    expect(res.statusCode).toBe(200);
    expect(res.json().meta).not.toHaveProperty('total');
    expect(res.json().data[0]).toHaveProperty('distance_meters');
  });

  it('GET /api/v1/hospitals/search — masks unhandled errors accurately with 500', async () => {
    const errorSpy = vi.spyOn(HospitalRepository.prototype, 'search').mockRejectedValueOnce(new Error('Super secret DB crash details'));
    
    const res = await app.inject({ method: 'GET', url: '/api/v1/hospitals/search?q=crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(res.json())).not.toContain('Super secret DB crash details');

    errorSpy.mockRestore();
  });
});

