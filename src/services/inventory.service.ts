import { InventoryStock } from '../models';
import mongoose from 'mongoose';
import { AuditLogService } from './audit-log.service';

export class InventoryService {
    static async incrementStock(
        tenantId: string,
        branchId: string,
        workAreaId: string,
        itemId: string,
        quantity: number,
        session?: mongoose.ClientSession
    ) {
        return await InventoryStock.findOneAndUpdate(
            { tenantId, branchId, workAreaId, itemId },
            { $inc: { quantityInStock: quantity } },
            { upsert: true, new: true, session }
        );
    }

    static async decrementStock(
        tenantId: string,
        branchId: string,
        workAreaId: string,
        itemId: string,
        quantity: number,
        session?: mongoose.ClientSession
    ) {
        const stock = await InventoryStock.findOne({ tenantId, branchId, workAreaId, itemId }).session(session || null);

        if (!stock || stock.quantityInStock < quantity) {
            throw new Error(`Insufficient stock for item ${itemId}`);
        }

        stock.quantityInStock -= quantity;
        await stock.save({ session });
        return stock;
    }

    static async adjustStock(data: any, user: any, branchId: string) {
        // data: { itemId, workAreaId, quantity, reason }
        // quantity can be positive (add) or negative (remove)

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let stock;
            if (data.quantity > 0) {
                stock = await InventoryService.incrementStock(user.tenantId.toString(), branchId, data.workAreaId, data.itemId, data.quantity, session);
            } else {
                stock = await InventoryService.decrementStock(user.tenantId.toString(), branchId, data.workAreaId, data.itemId, Math.abs(data.quantity), session);
            }

            await AuditLogService.log({
                action: 'MANUAL_STOCK_ADJUSTMENT',
                entity: 'InventoryStock',
                entityId: stock._id.toString(),
                performedBy: user.userId,
                details: {
                    itemId: data.itemId,
                    workAreaId: data.workAreaId,
                    quantity: data.quantity,
                    reason: data.reason
                },
                tenantId: user.tenantId,
                branchId: branchId
            });

            await session.commitTransaction();
            return stock;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
