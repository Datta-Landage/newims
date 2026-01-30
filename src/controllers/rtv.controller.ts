import { Context } from 'hono';
import { RTVService } from '../services/rtv.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Variables } from '../types';

export class RTVController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const data = await c.req.json();

        // Basic validation for multi-item RTV
        if (!data.grnId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
            throw new ApiError(400, 'Invalid RTV data: items array required');
        }

        const branchId = c.get('branchId');
        const rtv = await RTVService.createRTV(data, user, branchId);
        return c.json(new ApiResponse(201, rtv, 'RTV processed successfully'), 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { branchId, grnId, vendorId, isUsed, page = '1', limit = '20' } = c.req.query();

        const filters: any = {};

        // Branch Logic: SA can filter, BM is fixed
        if (user.roleCode === 'SA') {
            const headerBranch = c.req.header('x-branch-id');
            if (headerBranch) filters.branchId = headerBranch;
            if (branchId) filters.branchId = branchId;
        } else {
            filters.branchId = user.branchId?.toString();
        }

        if (grnId) filters.grnId = grnId;
        if (vendorId) filters.vendorId = vendorId;
        if (isUsed !== undefined) filters.isUsed = isUsed;

        const { items, total } = await RTVService.list(user.tenantId.toString(), filters, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return c.json(new ApiResponse(200, {
            rtvs: items.map((r: any) => ({
                ...r.toJSON(),
                vendor: r.vendorId?.vendorName || 'Unknown'
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        }, 'RTVs retrieved successfully'));
    }

    static async getById(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const rtv = await RTVService.getById(id, user.tenantId.toString());
        if (!rtv) throw new ApiError(404, 'RTV not found');

        return c.json(new ApiResponse(200, {
            ...rtv.toJSON(),
            vendor: (rtv as any).vendorId?.vendorName || 'Unknown'
        }, 'RTV details retrieved successfully'));
    }

    static async update(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const data = await c.req.json();

        const updatedRTV = await RTVService.update(id, data, user.tenantId.toString());
        return c.json(new ApiResponse(200, updatedRTV, 'RTV updated successfully'));
    }
}
