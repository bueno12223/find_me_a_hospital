import { Type, TSchema, Static } from '@sinclair/typebox';

export const PaginatedMetaSchema = Type.Object({
  total: Type.Optional(Type.Integer()),
  limit: Type.Integer(),
  offset: Type.Integer(),
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
