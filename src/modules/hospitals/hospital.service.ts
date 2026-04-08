import { HospitalRepository } from './hospital.repository.js';
import { Hospital } from './hospital.schema.js';
import { PaginatedResponse } from '../../schemas/index.js';
import { NotFoundError, ValidationError } from '../../errors/AppError.js';

export class HospitalService {
  constructor(private repository: HospitalRepository = new HospitalRepository()) { }

  async getById(id: number): Promise<Hospital> {
    const hospital = await this.repository.findById(id);
    if (!hospital) throw new NotFoundError('Hospital');
    return hospital;
  }

  async search(q: string, state: string | undefined, limit: number, offset: number): Promise<PaginatedResponse<Hospital>> {
    const { rows, total } = await this.repository.search(q, state, limit, offset);
    return { data: rows, meta: { limit, offset, total, returned: rows.length } };
  }

  async getReverse(lat: number, lng: number, limit: number): Promise<PaginatedResponse<Hospital>> {
    const data = await this.repository.findReverse(lat, lng, limit);
    return { data, meta: { limit, offset: 0, returned: data.length } };
  }

  async getRadius(lat: number, lng: number, distance: number, limit: number, offset: number): Promise<PaginatedResponse<Hospital>> {
    if (distance <= 0) throw new ValidationError('distance must be greater than 0');
    const { rows, total } = await this.repository.findWithinRadius(lat, lng, distance, limit, offset);
    return { data: rows, meta: { limit, offset, total, returned: rows.length } };
  }

}
