import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { HospitalService } from '../../src/modules/hospitals/hospital.service.js';
import { HospitalRepository } from '../../src/modules/hospitals/hospital.repository.js';
import { buildHospital } from '../factories/hospital.factory.js';
import { NotFoundError, ValidationError } from '../../src/errors/AppError.js';

vi.mock('../../src/modules/hospitals/hospital.repository.js');

describe('HospitalService', () => {
  let service: HospitalService;
  let repo: Mocked<HospitalRepository>;

  beforeEach(() => {
    repo = new HospitalRepository() as Mocked<HospitalRepository>;
    service = new HospitalService(repo);
  });

  it('getById — returns hospital when found', async () => {
    const hospital = buildHospital({ id: 1, name: 'City Hospital' });
    repo.findById.mockResolvedValue(hospital);

    const result = await service.getById(1);
    expect(result).toEqual(hospital);
  });

  it('getById — throws NotFoundError when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(99)).rejects.toThrow(NotFoundError);
  });

  it('getRadius — throws ValidationError when distance is 0', async () => {
    await expect(service.getRadius(0, 0, 0, 10, 0)).rejects.toThrow(ValidationError);
  });

  it('getReverse — deliberately omits total from metadata', async () => {
    repo.findReverse.mockResolvedValue([buildHospital({ id: 1 })]);
    const result = await service.getReverse(34, -118, 5);
    
    expect(result.data).toHaveLength(1);
    expect(result.meta.returned).toBe(1);
    expect(result.meta).not.toHaveProperty('total');
  });

  it('search — passes parameters correctly to repository', async () => {
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    
    await service.search('query', 'CA', 10, 20);
    
    expect(repo.search).toHaveBeenCalledWith('query', 'CA', 10, 20);
  });

  it('search — formats the returned meta payload correctly', async () => {
    const mockHospitals = [buildHospital({ id: 1 }), buildHospital({ id: 2 })];
    repo.search.mockResolvedValue({ rows: mockHospitals, total: 100 });
    
    const result = await service.search('query', undefined, 10, 0);
    
    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({
      limit: 10,
      offset: 0,
      total: 100,
      returned: 2
    });
  });

  it('getRadius — passes parameters and formats response correctly', async () => {
    const mockHospitals = [buildHospital({ id: 1 })];
    repo.findWithinRadius.mockResolvedValue({ rows: mockHospitals, total: 50 });
    
    const result = await service.getRadius(34, -118, 10, 50, 5);
    
    expect(repo.findWithinRadius).toHaveBeenCalledWith(34, -118, 10, 50, 5);
    expect(result.meta).toEqual({ limit: 50, offset: 5, total: 50, returned: 1 });
  });
});


