import { Context } from 'hono';
import {
    InventoryStock, GRN, Indent, PurchaseOrder, Issue, AuditLog, Item, Vendor
} from '../models';
import { Variables } from '../types';
import { ApiResponse } from '../utils/ApiResponse';

export class ReportController {

    // 1. Live Stock Store & Work Area
    static async getLiveStock(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        let { branchId, workAreaId } = c.req.query();

        // Strict enforcement
        if (contextBranchId) branchId = contextBranchId;

        const query: any = { tenantId: user.tenantId };

        if (branchId) query.branchId = branchId;
        if (workAreaId) query.workAreaId = workAreaId;

        const stock = await InventoryStock.find(query)
            .populate('itemId', 'itemName itemCode unitCost inventoryUom')
            .populate('branchId', 'branchName')
            .populate('workAreaId', 'name');

        return c.json(new ApiResponse(200, stock, 'Live Stock fetched successfully'));
    }

    // 2. Indent Issue Report
    static async getIndentIssue(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        let { startDate, endDate, branchId } = c.req.query();

        if (contextBranchId) branchId = contextBranchId;

        const query: any = { tenantId: user.tenantId };

        if (branchId) query.branchId = branchId;
        if (startDate && endDate) {
            query.issueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const issues = await Issue.find(query)
            .populate({
                path: 'indentId',
                populate: { path: 'items.itemId', select: 'itemName itemCode' }
            })
            .populate('branchId', 'branchName')
            .populate('issuedBy', 'name');

        return c.json(new ApiResponse(200, issues, 'Indent Issue Report fetched successfully'));
    }

    // 3. Consolidated Purchase & Indent
    static async getPurchaseIndentConsolidated(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        let { startDate, endDate, branchId } = c.req.query();

        if (contextBranchId) branchId = contextBranchId;

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.$gte = new Date(startDate);
            dateFilter.$lte = new Date(endDate);
        }

        const poQuery: any = { tenantId: user.tenantId };
        if (branchId) poQuery.branchId = branchId;
        if (startDate) poQuery.createdAt = dateFilter;

        const indentQuery: any = { tenantId: user.tenantId };
        if (branchId) indentQuery.branchId = branchId;
        if (startDate) indentQuery.createdAt = dateFilter;

        const [pos, indents] = await Promise.all([
            PurchaseOrder.find(poQuery).populate({ path: 'items', populate: { path: 'itemId', select: 'itemName' } }),
            Indent.find(indentQuery).populate({ path: 'items', populate: { path: 'itemId', select: 'itemName' } })
        ]);

        return c.json(new ApiResponse(200, { purchaseOrders: pos, indents: indents }, 'Consolidated Report fetched successfully'));
    }

    // 4. Purchase Order Status
    static async getPOStatus(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        let { status, startDate, endDate, branchId } = c.req.query();

        if (contextBranchId) branchId = contextBranchId;

        const query: any = { tenantId: user.tenantId };

        if (branchId) query.branchId = branchId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const pos = await PurchaseOrder.find(query)
            .populate('vendorId', 'vendorName')
            .populate('branchId', 'branchName');

        return c.json(new ApiResponse(200, pos, 'Purchase Order Status Report fetched successfully'));
    }

    // 5. Rate Variance Report
    static async getRateVariance(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        const { startDate, endDate } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate || 0), $lte: new Date(endDate || Date.now()) };
        }
        if (contextBranchId) query.branchId = contextBranchId;

        // Use virtual populate for items
        const grns = await GRN.find(query).populate({ path: 'items', populate: { path: 'itemId' } });

        const varianceList: any[] = [];

        for (const grn of grns) {
            // grn.items is virtual
            const items = (grn as any).items;
            if (!items) continue;

            for (const grnItem of items) {
                const itemMaster: any = grnItem.itemId;
                if (!itemMaster) continue;

                if (grnItem.unitCost !== itemMaster.unitCost) {
                    varianceList.push({
                        grnNo: grn.vendorInvoiceNo,
                        date: grn.goodsReceivedDate,
                        item: itemMaster.itemName,
                        poCost: grnItem.unitCost, // GRN Cost
                        stdCost: itemMaster.unitCost,
                        variance: grnItem.unitCost - itemMaster.unitCost
                    });
                }
            }
        }

        return c.json(new ApiResponse(200, varianceList, 'Rate Variance Report fetched successfully'));
    }

    // 6. Manual Closing Report
    static async getManualClosing(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');

        const query: any = {
            tenantId: user.tenantId,
            action: { $in: ['MANUAL_ADJUSTMENT', 'STOCK_UPDATE'] }
        };
        if (contextBranchId) query.branchId = contextBranchId;

        const logs = await AuditLog.find(query).populate('performedBy', 'name');

        return c.json(new ApiResponse(200, logs, 'Manual Closing Report fetched successfully'));
    }

    // 7. Invoice Summary Report
    static async getInvoiceSummary(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        const { startDate, endDate, vendorId } = c.req.query();
        const query: any = { tenantId: user.tenantId };

        if (contextBranchId) query.branchId = contextBranchId;

        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        let grns = await GRN.find(query).populate({
            path: 'poId',
            populate: { path: 'vendorId' }
        });

        if (vendorId) {
            grns = grns.filter((g: any) => g.poId?.vendorId?._id.toString() === vendorId);
        }

        const summary = grns.map((g: any) => ({
            date: g.goodsReceivedDate,
            invoiceNo: g.vendorInvoiceNo,
            vendor: g.poId?.vendorId?.vendorName || 'N/A',
            amount: g.totalAmount
        }));

        return c.json(new ApiResponse(200, summary, 'Invoice Summary Report fetched successfully'));
    }

    // 8. Store Variance
    static async getStoreVariance(c: Context<{ Variables: Variables }>) {
        return ReportController.getManualClosing(c);
    }

    // 9. Detailed GRN
    static async getDetailedGRN(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');
        let { branchId, startDate, endDate } = c.req.query();

        if (contextBranchId) branchId = contextBranchId;

        const query: any = { tenantId: user.tenantId };

        if (branchId) query.branchId = branchId;
        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // Use virtual populate
        const grns = await GRN.find(query)
            .populate({ path: 'items', populate: { path: 'itemId', select: 'itemName itemCode' } })
            .populate('branchId', 'branchName');

        return c.json(new ApiResponse(200, grns, 'Detailed GRN Report fetched successfully'));
    }

    // 10. FLR Report
    static async getFLR(c: Context<{ Variables: Variables }>) {
        return c.json(new ApiResponse(200, [], 'FLR Report requires Revenue Integration. Providing Consumption data only.'));
    }

    // 11. Supplier Item-wise Purchases
    static async getSupplierItemPurchase(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');

        const match: any = { tenantId: user.tenantId };
        if (contextBranchId) {
            const mongoose = await import('mongoose');
            match.branchId = new mongoose.Types.ObjectId(contextBranchId);
        }

        const aggregation: any[] = [
            { $match: match },
            { $lookup: { from: 'purchase_orders', localField: 'poId', foreignField: '_id', as: 'po' } },
            { $unwind: '$po' },
            { $lookup: { from: 'vendors', localField: 'po.vendorId', foreignField: '_id', as: 'vendor' } },
            { $unwind: '$vendor' },
            { $lookup: { from: 'grn_items', localField: '_id', foreignField: 'grnId', as: 'items' } }, // Physical lookup
            { $unwind: '$items' },
            { $lookup: { from: 'items', localField: 'items.itemId', foreignField: '_id', as: 'itemDetail' } },
            { $unwind: '$itemDetail' },
            {
                $group: {
                    _id: { vendor: '$vendor.vendorName', item: '$itemDetail.itemName' },
                    totalQty: { $sum: '$items.receivedQty' },
                    totalAmount: { $sum: { $multiply: ['$items.receivedQty', '$items.unitCost'] } }
                }
            },
            { $sort: { '_id.vendor': 1 } }
        ];

        const result = await GRN.aggregate(aggregation);
        return c.json(new ApiResponse(200, result, 'Supplier Item-wise Purchase Report fetched successfully'));
    }

    // 12. Supplier Wise Purchases
    static async getSupplierPurchase(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const contextBranchId = c.get('branchId');

        const match: any = { tenantId: user.tenantId };
        if (contextBranchId) {
            const mongoose = await import('mongoose');
            match.branchId = new mongoose.Types.ObjectId(contextBranchId);
        }

        const aggregation: any[] = [
            { $match: match },
            { $lookup: { from: 'purchase_orders', localField: 'poId', foreignField: '_id', as: 'po' } },
            { $unwind: '$po' },
            { $lookup: { from: 'vendors', localField: 'po.vendorId', foreignField: '_id', as: 'vendor' } },
            { $unwind: '$vendor' },
            {
                $group: {
                    _id: '$vendor.vendorName',
                    totalAmount: { $sum: '$totalAmount' },
                    grnCount: { $sum: 1 }
                }
            }
        ];

        const result = await GRN.aggregate(aggregation);
        return c.json(new ApiResponse(200, result, 'Supplier Wise Purchase Report fetched successfully'));
    }
}
