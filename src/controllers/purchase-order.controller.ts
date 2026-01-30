import { Context } from 'hono';
import { PurchaseOrderService } from '../services';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class PurchaseOrderController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json(); // Validated by middleware

        // Ensure SA provides context or inject it? PO creation usually requires branchId in body
        // But Service.createPO likely handles it.
        const branchId = c.get('branchId'); // From branchMiddleware

        if (!branchId) {
            throw new ApiError(400, 'Branch context required');
        }

        const po = await PurchaseOrderService.createPO(data, user, branchId);
        return c.json(new ApiResponse(201, po, 'Purchase Order created successfully'), 201);
    }

    static async createFromPool(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const branchId = c.get('branchId'); // From branchMiddleware

        if (!data.vendorId || !data.indentItemIds || !Array.isArray(data.indentItemIds)) {
            throw new ApiError(400, 'Vendor ID and List of Indent Item IDs are required');
        }

        const po = await PurchaseOrderService.createPOFromIndentItems(data, user, branchId);
        return c.json(new ApiResponse(201, po, 'Draft PO created successfully'), 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        const { page = '1', limit = '20', status, type } = c.req.query();

        const query: any = { tenantId: user.tenantId };

        // Standardized Branch Filtering from Middleware
        const branchId = c.get('branchId');
        if (branchId) {
            query.branchId = branchId;
        }
        // If SA and no branchId, show all? Yes ("Global View").

        if (status) query.status = status;
        if (type) query.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const { PurchaseOrder } = await import('../models'); // Dynamic import model

        const [pos, total] = await Promise.all([
            PurchaseOrder.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('vendorId', 'vendorName')
                .populate('branchId', 'branchName')
                .populate('createdBy', 'name'),
            PurchaseOrder.countDocuments(query)
        ]);

        return c.json(new ApiResponse(200, {
            pos,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Purchase Orders retrieved successfully'));
    }

    static async approve(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const po = await PurchaseOrderService.approvePO(poId, user);
        return c.json(new ApiResponse(200, po, 'Purchase Order approved successfully'));
    }

    static async revert(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const po = await PurchaseOrderService.revertPO(poId, user);
        return c.json(new ApiResponse(200, po, 'Purchase Order reverted to PENDING successfully'));
    }

    static async update(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const data = await c.req.json();
        const po = await PurchaseOrderService.updatePO(poId, data, user);
        return c.json(new ApiResponse(200, po, 'Purchase Order updated successfully'));
    }

    static async cancel(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const po = await PurchaseOrderService.cancelPO(poId, user);
        return c.json(new ApiResponse(200, po, 'Purchase Order cancelled successfully'));
    }

    static async delete(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const result = await PurchaseOrderService.deletePO(poId, user);
        return c.json(new ApiResponse(200, result, 'Purchase Order deleted successfully'));
    }

    static async patchItemQuantity(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const itemId = c.req.param('itemId');
        const { quantity } = await c.req.json();

        if (quantity === undefined || quantity <= 0) {
            return c.json(new ApiResponse(400, null, 'Valid quantity required'), 400);
        }

        const result = await PurchaseOrderService.patchItemQuantity(poId, itemId, quantity, user);

        // Log Audit
        const { AuditLogService } = await import('../services/audit-log.service');
        await AuditLogService.log({
            action: 'PATCH_PO_ITEM_QUANTITY',
            entity: 'PurchaseOrder',
            entityId: poId,
            performedBy: user._id,
            details: { itemId, quantity },
            tenantId: user.tenantId,
            branchId: user.branchId
        });

        return c.json(new ApiResponse(200, result, 'Item quantity updated successfully'));
    }
    static async getById(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const po = await PurchaseOrderService.getPOById(poId, user);
        return c.json(new ApiResponse(200, po, 'Purchase Order retrieved successfully'));
    }
}
