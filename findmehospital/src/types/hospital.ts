export interface Hospital {
  id: number;
  name: string;
  address: string | null;
  city: string;
  state: string;
  zip: string;
  zip4: string | null;
  location?: string; // We might get this back as a WKB or GeoJSON string depending on the query
  distance_meters?: number; // Used for distance-based queries
}

export interface PaginatedMeta {
  total?: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}
