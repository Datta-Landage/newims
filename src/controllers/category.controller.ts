import { Context } from 'hono';
import { CategoryService } from '../services';
import { Category } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class CategoryController {
    static async create(c: Context) {
        const user = c.get('user');

        // Standardized Branch Resolution
        let branchId = c.get('branchId');

        // If SA and no branch in context/token, try header (fallback, though middleware usually handles this)
        if (!branchId && user.roleCode === 'SA') {
            branchId = c.req.header('x-branch-id');
        }

        // Strict Requirement: Categories MUST belong to a branch
        if (!branchId) {
            return c.json(new ApiResponse(400, null, 'Branch context is required to create a category.'), 400);
        }

        const body = await c.req.json();
        const { name, status } = body;

        // Create Category
        const category = await Category.create({
            tenantId: user.tenantId,
            name,
            status: status || 'ACTIVE',
            branchId: branchId
        });

        return c.json(new ApiResponse(201, category, 'Category created successfully'), 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        // Filter by branch
        // SA sees filtered if branch selected, or maybe all?
        // "limited to their branch" implies strict scoping.

        let branchId = user.branchId;
        if (user.roleCode === 'SA' && !branchId) {
            branchId = c.req.header('x-branch-id');
        }

        const categories = await CategoryService.list(user.tenantId, branchId);
        return c.json(new ApiResponse(200, categories, 'Categories fetched successfully'));
    }
}
