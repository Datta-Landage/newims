import { zValidator } from '@hono/zod-validator';
import { ApiError } from '../utils/ApiError';

export function zJsonValidator(
  schema: any,
  options?: {
    customErrorMessage?: string;
  }
) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      if (options?.customErrorMessage) {
        throw new ApiError(400, options.customErrorMessage);
      }
      throw result.error; // Will be caught by errorHandler as ZodError
    }
  });
}

export function zParamsValidator(schema: any) {
  return zValidator('param', schema, (result, c) => {
    // removed debug logging
    if (!result.success) {
      throw result.error;
    }
  });
}

export function zQueryValidator(schema: any) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) {
      throw result.error;
    }
  });
}
