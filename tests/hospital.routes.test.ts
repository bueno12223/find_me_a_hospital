import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';

vi.mock('../src/modules/hospitals/hospital.service.js', () => {
  const HospitalService = vi.fn();
  HospitalService.prototype.getById = vi.fn().mockImplementation(async (id: number) => {
    if (id === 999) return null;
    return { id, name: 'Test Hospital' };
  });
  HospitalService.prototype.search = vi.fn().mockResolvedValue({
    data: [{ id: 1, name: 'Search Result' }],
    meta: { limit: 10, offset: 0 }
  });
  HospitalService.prototype.getReverse = vi.fn().mockResolvedValue({
    data: [{ id: 1, name: 'Reverse Result' }],
    meta: { limit: 5, offset: 0 }
  });
  HospitalService.prototype.getRadius = vi.fn().mockResolvedValue({
    data: [{ id: 1, name: 'Radius Result' }],
    meta: { limit: 20, offset: 0 }
  });
  return { HospitalService };
});

describe('Hospital Routes', () => {
  const app = buildApp({ logger: false });

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/hospitals/:id - valid ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/1'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.name).toBe('Test Hospital');
  });

  it('GET /api/v1/hospitals/:id - not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/999'
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/hospitals/search - valid query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/search?q=test'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data[0].name).toBe('Search Result');
  });

  it('GET /api/v1/hospitals/search - missing required param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/search'
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/v1/hospitals/reverse - valid query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/reverse?lat=34.0&lng=-118.0'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data[0].name).toBe('Reverse Result');
  });

  it('GET /api/v1/hospitals/radius - valid query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hospitals/radius?lat=34.0&lng=-118.0&distance=10'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data[0].name).toBe('Radius Result');
  });
});
