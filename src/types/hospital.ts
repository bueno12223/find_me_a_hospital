export interface Hospital {
  id: number;
  name: string;
  address: string | null;
  city: string;
  state: string;
  zip: string;
  zip4: string | null;
  location?: string;
  distance_meters?: number;
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
