import { GRN, GRNItem, PurchaseOrder, PurchaseOrderStatus } from '../models';
import { InventoryService } from './inventory.service';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';
import { generateDisplayId } from '../utils/sequence-generator';

export class GRNService {
    static async createGRN(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Logic for PO linking
            if (data.poId) {
                const po = await PurchaseOrder.findOne({ _id: data.poId, tenantId: user.tenantId }).session(session);
                if (!po) throw new AppError('PO not found', 404);
                if (po.status !== PurchaseOrderStatus.APPROVED) throw new AppError('PO must be APPROVED', 400);
            }

            const grn = await GRN.create([{
                tenantId: user.tenantId,
                displayId: await generateDisplayId('GR'),
                branchId: branchId,
                poId: data.poId,
                soId: data.soId,
                vendorInvoiceNo: data.vendorInvoiceNo,
                vendorInvoiceDate: data.vendorInvoiceDate,
                workAreaId: data.workAreaId,
                createdBy: user._id,
                totalAmount: 0 // Update later
            }], { session });

            let totalAmount = 0;
            const itemsToCreate = data.items.map((item: any) => {
                const taxAmount = item.taxAmount || 0;
                const itemTotal = (item.receivedQty * item.unitCost) + taxAmount;
                totalAmount += itemTotal;
                return {
                    grnId: grn[0]._id,
                    itemId: item.itemId,
                    receivedQty: item.receivedQty,
                    unitCost: item.unitCost,
                    taxAmount: item.taxAmount,
                    totalAmount: itemTotal,
                };
            });

            await GRNItem.insertMany(itemsToCreate, { session });

            grn[0].totalAmount = totalAmount;
            await grn[0].save({ session });

            // Update Inventory
            for (const item of itemsToCreate) {
                await InventoryService.incrementStock(
                    user.tenantId.toString(),
                    branchId,
                    data.workAreaId,
                    item.itemId,
                    item.receivedQty,
                    session
                );
            }

            // Close PO if applicable? 
            // Docs say: After GRN -> Status: CLOSED.
            // Assuming full GRN closes PO. For simplicity we close it.
            if (data.poId) {
                await PurchaseOrder.findByIdAndUpdate(data.poId, { status: PurchaseOrderStatus.CLOSED }, { session });
            }

            await session.commitTransaction();
            return grn[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getGRNById(grnId: string, user: any) {
        const grn = await GRN.findOne({ _id: grnId, tenantId: user.tenantId })
            .populate('poId', 'poNumber')
            .populate('workAreaId', 'name')
            .populate('createdBy', 'name');

        if (!grn) throw new AppError('GRN not found', 404);

        const items = await GRNItem.find({ grnId: grn._id }).populate('itemId', 'itemName itemCode inventoryUom');

        // Fetch all RTVs for this GRN to calculate returned quantities
        const { RTV } = await import('../models/rtv.model');
        const rtvs = await RTV.find({ grnId: grn._id, tenantId: user.tenantId });

        const itemsWithRtv = items.map(item => {
            const itemObj = item.toJSON();
            const returnedQty = rtvs.reduce((total, rtv) => {
                const rtvItem = rtv.items.find((i: any) => i.itemId.toString() === item.itemId._id.toString());
                return total + (rtvItem?.returnedQty || 0);
            }, 0);

            return {
                ...itemObj,
                returnedQty,
                acceptedQty: item.receivedQty - returnedQty
            };
        });

        return { ...grn.toJSON(), items: itemsWithRtv };
    }
}
