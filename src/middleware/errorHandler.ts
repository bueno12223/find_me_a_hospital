import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
    });
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error({ err: error }, error.message);
    }
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, statusCode: error.statusCode },
    });
  }

  request.log.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred', statusCode: 500 },
  });
}
