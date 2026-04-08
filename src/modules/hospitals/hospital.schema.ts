import { Type, Static } from '@sinclair/typebox';
import { PaginatedSchema, ErrorSchema } from '../../schemas/index.js';


export const HospitalSchema = Type.Object({
  id: Type.Integer({ description: 'Unique hospital ID' }),
  name: Type.String({ description: 'Hospital name' }),
  address: Type.Union([Type.String(), Type.Null()], { description: 'Street address' }),
  city: Type.String({ description: 'City' }),
  state: Type.String({ description: 'Two-letter state code' }),
  zip: Type.String({ description: '5-digit ZIP code' }),
  zip4: Type.Union([Type.String(), Type.Null()], { description: 'ZIP+4 extension' }),
  distance_meters: Type.Optional(
    Type.Number({ description: 'Distance from query point in meters (geo queries only)' }),
  ),
});

export type Hospital = Static<typeof HospitalSchema>;

const PaginatedHospitalsSchema = PaginatedSchema(HospitalSchema);


// ── Query / Params schemas ────────────────────────────────────────────────────

export const SearchQuerySchema = Type.Object({
  q: Type.String({ description: 'Search term (name or address, trigram text search)', minLength: 1 }),
  state: Type.Optional(Type.String({ description: 'Filter by 2-letter state code (e.g. CA, TX)', minLength: 2, maxLength: 2 })),
  limit: Type.Integer({ description: 'Page size', minimum: 1, maximum: 100, default: 10 }),
  offset: Type.Integer({ description: 'Page offset', minimum: 0, default: 0 }),
});
export type SearchQuery = Static<typeof SearchQuerySchema>;

export const ReverseQuerySchema = Type.Object({
  lat: Type.Number({ description: 'Latitude (-90 to 90)', minimum: -90, maximum: 90 }),
  lng: Type.Number({ description: 'Longitude (-180 to 180)', minimum: -180, maximum: 180 }),
  limit: Type.Integer({ description: 'Max results', minimum: 1, maximum: 100, default: 5 }),
});
export type ReverseQuery = Static<typeof ReverseQuerySchema>;

export const RadiusQuerySchema = Type.Object({
  lat: Type.Number({ description: 'Center latitude (-90 to 90)', minimum: -90, maximum: 90 }),
  lng: Type.Number({ description: 'Center longitude (-180 to 180)', minimum: -180, maximum: 180 }),
  distance: Type.Number({ description: 'Search radius in kilometers', minimum: 0, default: 10 }),
  limit: Type.Integer({ description: 'Page size', minimum: 1, maximum: 100, default: 20 }),
  offset: Type.Integer({ description: 'Page offset', minimum: 0, default: 0 }),
});
export type RadiusQuery = Static<typeof RadiusQuerySchema>;

export const IdParamsSchema = Type.Object({
  id: Type.Integer({ description: 'Hospital ID' }),
});
export type IdParams = Static<typeof IdParamsSchema>;

// ── Route-level schemas ───────────────────────────────────────────────────────

export const SearchRouteSchema = {
  tags: ['Hospitals'],
  summary: 'Full-text search hospitals',
  description:
    'Trigram-based text search on hospital name and address. ' +
    'Optionally filter by state. Supports pagination via `limit` and `offset`.',
  querystring: SearchQuerySchema,
  response: { 200: PaginatedHospitalsSchema, 400: ErrorSchema },
};

export const ReverseRouteSchema = {
  tags: ['Hospitals'],
  summary: 'Reverse geocode — nearest hospitals',
  description: 'Returns the N closest hospitals to the given GPS coordinate, ordered by distance ascending.',
  querystring: ReverseQuerySchema,
  response: { 200: PaginatedHospitalsSchema, 400: ErrorSchema },
};

export const RadiusRouteSchema = {
  tags: ['Hospitals'],
  summary: 'Hospitals within a radius',
  description:
    'Returns all hospitals within `distance` kilometres of the given point, ordered by distance ascending. ' +
    'Supports pagination.',
  querystring: RadiusQuerySchema,
  response: { 200: PaginatedHospitalsSchema, 400: ErrorSchema },
};

export const GetByIdRouteSchema = {
  tags: ['Hospitals'],
  summary: 'Get hospital by ID',
  description: 'Returns a single hospital record by its numeric ID.',
  params: IdParamsSchema,
  response: {
    200: Type.Object({ data: HospitalSchema }),
    404: ErrorSchema,
  },
};
