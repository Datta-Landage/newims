import { Context } from 'hono';
import { ApiError } from '../utils/ApiError';
import { AppError } from '../utils/errors';
import { ApiResponse } from '../utils/ApiResponse';
import { ZodError } from 'zod';
import { StatusCode } from 'hono/utils/http-status';

export const errorHandler = (err: Error, c: Context) => {
    console.error(err); // Optional logging

    if (err instanceof ApiError) {
        return c.json(
            new ApiResponse(
                err.statusCode,
                null,
                err.message
            ),
            err.statusCode as any
        );
    }

    if (err instanceof AppError) {
        return c.json(
            new ApiResponse(
                err.statusCode as StatusCode,
                null,
                err.message
            ),
            err.statusCode as any
        );
    }

    if (err instanceof ZodError) {
        const validationErrors = err.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));

        return c.json(
            new ApiResponse(
                400,
                { errors: validationErrors },
                'Validation Error'
            ),
            400
        );
    }

    // Handle Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const mongooseErrors = Object.values((err as any).errors || {}).map((val: any) => ({
            field: val.path,
            message: val.message
        }));

        return c.json(
            new ApiResponse(
                400,
                { errors: mongooseErrors },
                (err as any).message || 'Validation Error'
            ),
            400
        );
    }

    // Handle Mongoose Cast Error (Invalid ID)
    if (err.name === 'CastError') {
        return c.json(
            new ApiResponse(
                400,
                null,
                `Invalid ${(err as any).path}: ${(err as any).value}`
            ),
            400
        );
    }

    // Handle MongoDB Duplicate Key Errors
    if ((err as any).code === 11000) {
        return c.json(
            new ApiResponse(
                400,
                null,
                'A record with this information already exists (Duplicate Entry)'
            ),
            400
        );
    }

    // Default Interal Server Error
    // In development, exposing the message helps debugging
    return c.json(
        new ApiResponse(
            500 as StatusCode,
            null,
            err.message || 'Internal Server Error'
        ),
        500
    );
};
