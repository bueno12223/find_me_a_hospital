import { Hospital } from '../../src/modules/hospitals/hospital.schema.js';
import { PaginatedMeta } from '../../src/schemas/common.schema.js';

export const buildHospital = (overrides: Partial<Hospital> = {}): Hospital => ({
  id: 1,
  name: 'General Hospital',
  address: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  zip4: null,
  latitude: 34.0522,
  longitude: -118.2437,
  distance_meters: undefined,
  ...overrides,
});

export const buildPaginatedResponse = <T>(
  data: T[],
  overrides: Partial<PaginatedMeta> = {}
) => ({
  data,
  meta: { limit: 10, offset: 0, total: data.length, returned: data.length, ...overrides },
});
