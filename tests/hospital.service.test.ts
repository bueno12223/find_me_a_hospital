import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HospitalService } from '../src/modules/hospitals/hospital.service.js';

vi.mock('../src/modules/hospitals/hospital.repository.js', () => {
  const HospitalRepository = vi.fn();
  HospitalRepository.prototype.findById = vi.fn().mockResolvedValue({ id: 1, name: 'Mock Hospital' });
  HospitalRepository.prototype.search = vi.fn().mockResolvedValue([{ id: 1, name: 'Mock Hospital' }]);
  HospitalRepository.prototype.findReverse = vi.fn().mockResolvedValue([{ id: 1, name: 'Mock Hospital', distance_meters: 100 }]);
  HospitalRepository.prototype.findWithinRadius = vi.fn().mockResolvedValue([{ id: 1, name: 'Mock Hospital', distance_meters: 500 }]);
  return { HospitalRepository };
});

describe('HospitalService', () => {
  let service: HospitalService;

  beforeEach(() => {
    service = new HospitalService();
  });

  it('should find hospital by id', async () => {
    const result = await service.getById(1);
    expect(result).toEqual({ id: 1, name: 'Mock Hospital' });
  });

  it('should perform search', async () => {
    const result = await service.search('Mock', undefined, 10, 0);
    expect(result.data.length).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.offset).toBe(0);
  });

  it('should perform reverse lookup', async () => {
    const result = await service.getReverse(34.05, -118.24, 5);
    expect(result.data.length).toBe(1);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.offset).toBe(0);
  });

  it('should perform radius lookup', async () => {
    const result = await service.getRadius(34.05, -118.24, 10, 20, 0);
    expect(result.data.length).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.offset).toBe(0);
  });
});
