import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { NotFoundError, ValidationError, InvalidCoordinatesError } from '../../src/errors/AppError.js';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('Error Handler', () => {
  const mockRequest = {
    log: { error: vi.fn() },
  } as unknown as FastifyRequest;

  const mockReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles AppError properly (NotFoundError)', () => {
    const error = new NotFoundError('Hospital');
    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Hospital not found', statusCode: 404 }
    });
  });

  it('handles AppError properly (InvalidCoordinatesError)', () => {
    const error = new InvalidCoordinatesError();
    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: { code: 'INVALID_COORDINATES', message: 'Coordinates are out of valid range', statusCode: 400 }
    });
  });

  it('handles Fastify validation errors (validation array)', () => {
    const error: any = new Error('Querystring invalid');
    error.validation = [{ message: 'should be string' }];
    
    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Querystring invalid', statusCode: 400 }
    });
  });

  it('masks unknown errors as 500 INTERNAL_SERVER_ERROR', () => {
    const error = new Error('Database connection failed');
    errorHandler(error, mockRequest, mockReply);

    expect(mockRequest.log.error).toHaveBeenCalledWith({ err: error }, 'Unhandled error');
    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred', statusCode: 500 }
    });
  });
});
