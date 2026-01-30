import { RTV, GRN, GRNItem, InventoryStock, IRTV } from '../models';
import { InventoryService } from './inventory.service';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { generateDisplayId } from '../utils/sequence-generator';

export class RTVService {
    static async createRTV(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Validate GRN and fetch vendorId
            const grn = await GRN.findOne({ _id: data.grnId, tenantId: user.tenantId })
                .populate('poId')
                .session(session);
            if (!grn) throw new ApiError(404, 'GRN not found');

            const vendorId = (grn as any).poId?.vendorId || (grn as any).soId?.vendorId;
            if (!vendorId) throw new ApiError(400, 'Vendor details not found for this GRN');

            // 2. Generate RTV Number
            const displayId = await generateDisplayId('RV');
            const rtvNumber = displayId;

            const items: any[] = [];
            let totalAmount = 0;

            // 3. Process and validate items
            for (const item of data.items) {
                const grnItem = await GRNItem.findOne({ grnId: grn._id, itemId: item.itemId }).session(session);
                if (!grnItem) throw new ApiError(400, `Item ${item.itemId} not found in this GRN`);

                // Check previously returned quantity for this specific GRN item
                const rtvBatches = await RTV.find({ grnId: grn._id, 'items.itemId': item.itemId }).session(session);
                const totalReturned = rtvBatches.reduce((sum, batch) => {
                    const line = batch.items.find((i: any) => i.itemId.toString() === item.itemId.toString());
                    return sum + (line?.returnedQty || 0);
                }, 0);

                if (totalReturned + item.returnedQty > grnItem.receivedQty) {
                    throw new ApiError(400, `Cannot return more than received quantity for item ${item.itemId}`);
                }

                items.push({
                    itemId: item.itemId,
                    returnedQty: item.returnedQty,
                    unitCost: item.unitCost,
                    reason: item.reason
                });
                totalAmount += (item.returnedQty * item.unitCost);

                // 4. Decrement Stock
                await InventoryService.decrementStock(
                    user.tenantId.toString(),
                    branchId,
                    grn.workAreaId.toString(),
                    item.itemId,
                    item.returnedQty,
                    session
                );
            }

            // 5. Create RTV Batch
            const rtvDocs = await RTV.create([{
                rtvNumber,
                displayId,
                cnNumber: data.cnNumber,
                tenantId: user.tenantId,
                branchId: branchId,
                grnId: data.grnId,
                vendorId: vendorId,
                items: items,
                totalAmount: totalAmount,
                status: 'APPROVED',
                processedBy: user._id
            }], { session });

            await session.commitTransaction();
            return rtvDocs[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async list(tenantId: string, filters: any, pagination: { page: number, limit: number }) {
        const query: any = { tenantId };
        if (filters.branchId && filters.branchId !== 'undefined') query.branchId = filters.branchId;
        if (filters.grnId && filters.grnId !== 'undefined') query.grnId = filters.grnId;
        if (filters.vendorId && filters.vendorId !== 'undefined') query.vendorId = filters.vendorId;
        if (filters.isUsed !== undefined) {
            query.isUsed = filters.isUsed === 'true' || filters.isUsed === true;
        }

        const skip = (pagination.page - 1) * pagination.limit;

        const [items, total] = await Promise.all([
            RTV.find(query)
                .populate('vendorId', 'vendorName')
                .populate('items.itemId', 'itemName itemCode')
                .populate('grnId', 'vendorInvoiceNo')
                .populate('processedBy', 'name email firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pagination.limit),
            RTV.countDocuments(query)
        ]);

        return { items, total };
    }

    static async getById(id: string, tenantId: string) {
        return await RTV.findOne({ _id: id, tenantId })
            .populate('vendorId', 'vendorName')
            .populate('items.itemId', 'itemName itemCode')
            .populate('grnId', 'vendorInvoiceNo')
            .populate('processedBy', 'name email');
    }

    static async update(id: string, data: any, tenantId: string) {
        const rtv = await RTV.findOneAndUpdate(
            { _id: id, tenantId },
            { $set: data },
            { new: true }
        );
        if (!rtv) throw new ApiError(404, 'RTV not found');
        return rtv;
    }
}
