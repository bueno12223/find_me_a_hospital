import { HospitalRepository } from './hospital.repository.js';
import { Hospital, PaginatedResponse } from '../../types/hospital.js';

export class HospitalService {
  private repository: HospitalRepository;

  constructor() {
    this.repository = new HospitalRepository();
  }

  async getById(id: number): Promise<Hospital | null> {
    return this.repository.findById(id);
  }

  async search(q: string, state: string | undefined, limit: number, offset: number): Promise<PaginatedResponse<Hospital>> {
    const data = await this.repository.search(q, state, limit, offset);
    return {
      data,
      meta: {
        limit,
        offset
      }
    };
  }

  async getReverse(lat: number, lng: number, limit: number): Promise<PaginatedResponse<Hospital>> {
    const data = await this.repository.findReverse(lat, lng, limit);
    return {
      data,
      meta: {
        limit,
        offset: 0
      }
    };
  }

  async getRadius(lat: number, lng: number, distance: number, limit: number, offset: number): Promise<PaginatedResponse<Hospital>> {
    const data = await this.repository.findWithinRadius(lat, lng, distance, limit, offset);
    return {
      data,
      meta: {
        limit,
        offset
      }
    };
  }
}
