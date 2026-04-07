export const SearchQuerySchema = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    state: { type: 'string', minLength: 2, maxLength: 2 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    offset: { type: 'integer', minimum: 0, default: 0 }
  },
  required: ['q']
};

export const ReverseQuerySchema = {
  type: 'object',
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 5 }
  },
  required: ['lat', 'lng']
};

export const RadiusQuerySchema = {
  type: 'object',
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 },
    distance: { type: 'number', minimum: 0, default: 10 }, // in km
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 }
  },
  required: ['lat', 'lng']
};

export const IdParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' }
  },
  required: ['id']
};
