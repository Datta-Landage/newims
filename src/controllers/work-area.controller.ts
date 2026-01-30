
import { Context } from 'hono';
import { WorkAreaService } from '../services';
import { WorkArea, Branch } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class WorkAreaController {
    static async create(c: Context) {
        try {
            const user = c.get('user');
            const body = await c.req.json();
            const { name, branchIds, status, type } = body;

            if (!name || !branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
                throw new ApiError(400, 'Name and at least one Branch ID are required');
            }

            // Validate branch IDs
            const count = await Branch.countDocuments({ _id: { $in: branchIds }, tenantId: user.tenantId });
            if (count !== branchIds.length) {
                throw new ApiError(400, 'One or more invalid Branch IDs');
            }

            const workArea = await WorkAreaService.create({
                branchIds,
                name,
                type,
                status
            } as any, user);

            return c.json(new ApiResponse(201, workArea, 'Work Area created successfully'), 201);
        } catch (error: any) {
            console.error('Create WorkArea Error:', error);
            if (error instanceof ApiError) {
                return c.json(new ApiResponse(error.statusCode, null, error.message), error.statusCode as any);
            }
            return c.json(new ApiResponse(500, null, 'Internal server error'), 500);
        }
    }

    static async list(c: Context) {
        try {
            const user = c.get('user');
            const branchId = c.get('branchId');

            const filters: any = {};

            // Strict Branch Enforcement via Middleware
            if (branchId) {
                filters.branchId = branchId;
            }

            const workAreas = await WorkAreaService.list(user.tenantId, filters);
            return c.json(new ApiResponse(200, { workAreas }, 'Work Areas retrieved successfully'));
        } catch (error: any) {
            console.error('List WorkAreas Error:', error);
            const statusCode = error instanceof ApiError ? error.statusCode : 500;
            return c.json(new ApiResponse(statusCode, null, error.message || 'Internal server error'), statusCode as any);
        }
    }

    static async getById(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');

            const workArea = await WorkAreaService.getById(id, user.tenantId);

            if (!workArea) {
                throw new ApiError(404, 'Work Area not found');
            }

            return c.json(new ApiResponse(200, workArea, 'Work Area retrieved successfully'));
        } catch (error: any) {
            console.error('Get WorkArea By ID Error:', error);
            if (error instanceof ApiError) {
                return c.json(new ApiResponse(error.statusCode, null, error.message), error.statusCode as any);
            }
            return c.json(new ApiResponse(500, null, 'Internal server error'), 500);
        }
    }

    static async update(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');
            const body = await c.req.json();

            const workArea = await WorkAreaService.update(id, body, user);

            if (!workArea) {
                throw new ApiError(404, 'Work Area not found');
            }

            return c.json(new ApiResponse(200, workArea, 'Work Area updated successfully'));
        } catch (error: any) {
            console.error('Update WorkArea Error:', error);
            const statusCode = error instanceof ApiError ? error.statusCode : 500;
            return c.json(new ApiResponse(statusCode, null, error.message || 'Internal server error'), statusCode as any);
        }
    }

    static async delete(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');

            const workArea = await WorkAreaService.delete(id, user);

            if (!workArea) {
                throw new ApiError(404, 'Work Area not found');
            }

            return c.json(new ApiResponse(200, null, 'Work Area deleted successfully'));
        } catch (error: any) {
            console.error('Delete WorkArea Error:', error);
            const statusCode = error instanceof ApiError ? error.statusCode : 500;
            return c.json(new ApiResponse(statusCode, null, error.message || 'Internal server error'), statusCode as any);
        }
    }
}
