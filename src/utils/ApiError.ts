import type { StatusCode } from 'hono/utils/http-status';

class ApiError extends Error {
  statusCode: StatusCode;
  message: string;
  errors: unknown[];
  meta?: Record<string, unknown>;
  constructor(
    statusCode: StatusCode,
    message: string = 'something went wrong',
    errors: unknown[] = [],
    stack: string = '',
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.meta = meta;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
