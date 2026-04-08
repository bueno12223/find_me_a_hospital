import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HospitalRepository } from '../../src/modules/hospitals/hospital.repository.js';
import { pool } from '../../src/config/db.js';

describe('HospitalRepository Integration', () => {
  let repository: HospitalRepository;

  beforeAll(() => {
    repository = new HospitalRepository();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('search() executes valid SQL and returns correctly shaped data structure with total count', async () => {
    const result = await repository.search('hospital', undefined, 5, 0);

    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.rows)).toBe(true);
    expect(typeof result.total).toBe('number');

    if (result.rows.length > 0) {
      const first = result.rows[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('latitude');
      expect(first).toHaveProperty('longitude');
    }
  });

  it('findReverse() executes valid SQL, retrieves coordinate distances, and orders by proximity', async () => {
    const lat = 34.0522;
    const lng = -118.2437;
    const result = await repository.findReverse(lat, lng, 5);

    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      expect(result[0]).toHaveProperty('distance_meters');
      expect(typeof result[0].distance_meters).toBe('number');

      if (result.length > 1) {
        expect(result[0].distance_meters!).toBeLessThanOrEqual(result[1].distance_meters!);
      }
    }
  });

  it('findWithinRadius() limits results by geographic circle', async () => {
    const lat = 34.0522;
    const lng = -118.2437;
    const radiusKm = 10;

    const result = await repository.findWithinRadius(lat, lng, radiusKm, 10, 0);

    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('total');

    if (result.rows.length > 0) {
      result.rows.forEach(hospital => {
        expect(hospital.distance_meters).toBeLessThanOrEqual(radiusKm * 1000);
      });
    }
  });
});
