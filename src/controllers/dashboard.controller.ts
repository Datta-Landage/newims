import { Context } from 'hono';
import mongoose from 'mongoose';
import { InventoryStock, PurchaseOrder, Indent, Item, ItemStatus } from '../models';
import { Variables } from '../types';
import { ApiResponse } from '../utils/ApiResponse';

export class DashboardController {
    static async getStats(c: Context<{ Variables: Variables }>) {
        try {
            const user = c.get('user');
            const branchId = c.get('branchId'); // This branchId is the raw ID from the middleware

            const branchQuery: any = { tenantId: user.tenantId };

            // Strict Branch Enforcement
            if (branchId) {
                try {
                    // Ensure it is an ObjectId for aggregation queries
                    branchQuery.branchId = new mongoose.Types.ObjectId(branchId.toString());
                } catch (e) {
                    console.error('Invalid branchId format:', branchId);
                }
            }

            // 1. Total Stock Value
            const stockValueAggregation = [
                { $match: branchQuery },
                {
                    $lookup: {
                        from: 'items',
                        localField: 'itemId',
                        foreignField: '_id',
                        as: 'itemDetails'
                    }
                },
                { $unwind: '$itemDetails' },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: { $multiply: ['$quantityInStock', '$itemDetails.unitCost'] } }
                    }
                }
            ];

            const stockValueResult = await InventoryStock.aggregate(stockValueAggregation);
            const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;

            // 2. Low Stock Alerts
            const lowStockCount = await InventoryStock.countDocuments({
                ...branchQuery,
                quantityInStock: { $lt: 10 }
            });

            // 3. Pending Purchase Orders
            const poQuery: any = { tenantId: user.tenantId, status: 'PENDING' };
            if (branchId) poQuery.branchId = branchId;
            const pendingPO = await PurchaseOrder.countDocuments(poQuery);

            // 4. Pending Indents
            const indentQuery: any = { tenantId: user.tenantId, status: 'OPEN' };
            if (branchId) indentQuery.branchId = branchId;
            const pendingIndent = await Indent.countDocuments(indentQuery);

            // 4.5 Pending Issue Indents (Approved but not fully issued)
            const pendingIssueQuery: any = {
                tenantId: user.tenantId,
                status: { $in: ['APPROVED', 'PARTIALLY_ISSUED'] }
            };
            if (branchId) pendingIssueQuery.branchId = branchId;
            const pendingIssueIndent = await Indent.countDocuments(pendingIssueQuery);

            // 5. Total Active Items
            const itemQuery: any = { tenantId: user.tenantId, status: ItemStatus.ACTIVE };
            if (branchId) {
                const { Category } = await import('../models');
                const categories = await Category.find({ tenantId: user.tenantId, branchId }).select('_id');
                const categoryIds = categories.map(cat => cat._id);
                if (categoryIds.length > 0) {
                    itemQuery.categoryId = { $in: categoryIds };
                } else {
                    // No categories in branch -> No items
                    return c.json(new ApiResponse(200, {
                        totalStockValue: 0,
                        lowStockCount: 0,
                        pendingPO: 0,
                        pendingIndent: 0,
                        totalItems: 0
                    }, 'No items found for this branch'));
                }
            }
            const totalItems = await Item.countDocuments(itemQuery);

            return c.json(new ApiResponse(200, {
                totalStockValue,
                lowStockCount,
                pendingPO,
                pendingIndent,
                pendingIssueIndent,
                totalItems
            }, 'Dashboard stats retrieved successfully'));
        } catch (error: any) {
            console.error('Error fetching dashboard stats:', error);
            return c.json(new ApiResponse(500, null, error.message || 'Internal Server Error'), 500);
        }
    }
}
