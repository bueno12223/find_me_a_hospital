import { Type, TSchema, Static } from '@sinclair/typebox';

export const PaginatedMetaSchema = Type.Object({
  total: Type.Optional(Type.Integer({ description: 'Total number of records matching the query' })),
  returned: Type.Optional(Type.Integer({ description: 'Number of records returned in this response' })),
  limit: Type.Integer({ description: 'Maximum number of records requested' }),
  offset: Type.Integer({ description: 'Number of records skipped' }),
});

export type PaginatedMeta = Static<typeof PaginatedMetaSchema>;

export type PaginatedResponse<T> = { data: T[]; meta: PaginatedMeta };

export function PaginatedSchema<T extends TSchema>(itemSchema: T) {
  return Type.Object({
    data: Type.Array(itemSchema),
    meta: PaginatedMetaSchema,
  });
}

export const ErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    statusCode: Type.Integer(),
  }),
});
