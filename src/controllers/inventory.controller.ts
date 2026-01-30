import { Context } from 'hono';
import { InventoryStock } from '../models';
import { ApiResponse } from '../utils/ApiResponse';
import { InventoryService } from '../services/inventory.service';
import { Variables } from '../types';

export class InventoryController {
    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const branchId = c.get('branchId');
        const { workAreaId } = c.req.query();
        const query: any = {
            tenantId: user.tenantId
        };
        if (branchId) query.branchId = branchId;
        if (workAreaId) query.workAreaId = workAreaId;

        const stock = await InventoryStock.find(query)
            .populate('itemId', 'itemName itemCode')
            .populate('workAreaId', 'name');

        return c.json(new ApiResponse(200, stock, 'Inventory retrieved successfully'));
    }

    static async adjust(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const data = await c.req.json();

        // Basic validation in controller or rely on middleware/zod?
        // Let's rely on service or minimal check
        if (!data.itemId || !data.workAreaId || data.quantity === undefined) {
            return c.json(new ApiResponse(400, null, 'itemId, workAreaId, quantity are required'), 400);
            // Ideally throw ApiError but for inline
        }

        const branchId = c.get('branchId');
        const stock = await InventoryService.adjustStock(data, user, branchId);
        return c.json(new ApiResponse(200, stock, 'Stock adjusted successfully'));
    }
}
