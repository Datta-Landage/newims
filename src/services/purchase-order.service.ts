import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Indent, IndentItem } from '../models';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { AuditLogService } from './audit-log.service';
import { generateDisplayId } from '../utils/sequence-generator';

export class PurchaseOrderService {
    static async createPO(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const prefix = data.type === 'SPECIAL' ? 'SO' : 'PO';
            const displayId = await generateDisplayId(prefix);

            const po = await PurchaseOrder.create([{
                tenantId: user.tenantId,
                displayId: displayId,
                branchId: branchId,
                prNo: data.prNo || null,
                vendorId: data.vendorId || null,
                vendorName: data.vendorName || null,
                createdBy: user._id,
                deliveryDate: data.deliveryDate,
                status: data.status || PurchaseOrderStatus.PENDING,
                type: data.type || 'STANDARD',
                totalAmount: 0, // Will update
                rtvCredit: data.rtvCredit || 0,
                linkedRtvId: data.linkedRtvId || null,
                masterCreationFlags: data.masterCreationFlags || { addToVendorMaster: false, addToInventoryMaster: false },
                tempVendorData: data.tempVendorData || null
            }], { session });

            // If an RTV is linked, mark it as used
            if (data.linkedRtvId) {
                const { RTV } = await import('../models/rtv.model');
                const rtv = await RTV.findOneAndUpdate(
                    { _id: data.linkedRtvId, tenantId: user.tenantId },
                    { $set: { isUsed: true, usedInPoId: po[0]._id } },
                    { session, new: true }
                );
                if (!rtv) throw new ApiError(404, 'Linked RTV not found');
            }

            let totalAmount = 0;
            const itemsToCreate = data.items.map((item: any) => {
                const itemInfo = {
                    poId: po[0]._id,
                    itemId: item.itemId || null, // Ensure empty string becomes null
                    name: item.name,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    taxRate: item.taxRate || 0,
                    totalPrice: (item.quantity * item.unitCost) * (1 + (item.taxRate || 0) / 100),
                    indentLinks: (item.indentLinks || []).map((link: any) => ({
                        indentItemId: link.indentItemId || link.id,
                        quantity: link.quantity || link.qty
                    })),
                    tempItemData: item.tempItemData || null
                };
                totalAmount += itemInfo.totalPrice;
                return itemInfo;
            });

            await PurchaseOrderItem.insertMany(itemsToCreate, { session });

            // 4. Handle Indent Updates
            const indentItemUpdates = new Map();
            const parentIndentIds = new Set();

            itemsToCreate.forEach((item: any) => {
                if (item.indentLinks && item.indentLinks.length > 0) {
                    item.indentLinks.forEach((link: any) => {
                        const existingQty = indentItemUpdates.get(link.indentItemId.toString()) || 0;
                        indentItemUpdates.set(link.indentItemId.toString(), existingQty + link.quantity);
                    });
                }
            });

            if (indentItemUpdates.size > 0) {
                const indentItemIds = Array.from(indentItemUpdates.keys());
                const indentItems = await IndentItem.find({ _id: { $in: indentItemIds } }).populate('indentId').session(session);

                const { ProcurementStatus } = await import('../models');

                for (const ii of indentItems) {
                    const qtyToAdd = indentItemUpdates.get(ii._id.toString());
                    ii.poQty = (ii.poQty || 0) + qtyToAdd;
                    ii.procurementStatus = ProcurementStatus.IN_PO;
                    await ii.save({ session });

                    if (ii.indentId) {
                        parentIndentIds.add(ii.indentId._id.toString());
                    }
                }

                // Update Indents to isPoRaised = true
                if (parentIndentIds.size > 0) {
                    await Indent.updateMany(
                        { _id: { $in: Array.from(parentIndentIds) as string[] } },
                        { $set: { isPoRaised: true } },
                        { session }
                    );
                }
            }

            po[0].totalAmount = Math.max(0, totalAmount - (data.rtvCredit || 0));
            await po[0].save({ session });

            await session.commitTransaction();

            // Audit
            AuditLogService.log({
                action: 'PO_CREATE_DIRECT',
                entity: 'PurchaseOrder',
                entityId: po[0]._id,
                performedBy: user._id,
                details: {
                    displayId: po[0].displayId,
                    vendorName: data.vendorName,
                    amount: po[0].totalAmount
                },
                tenantId: user.tenantId,
                branchId: branchId
            });

            return po[0];
        } catch (error) {
            console.error("CreatePO Error:", error); // Debug log
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async createPOFromIndentItems(data: { vendorId: string, indentItemIds: string[], deliveryDate?: Date }, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Fetch Indent Items
            const { IndentItem: ModelIndentItem, Item: ModelItem, ProcurementStatus: ModelProcurementStatus } = await import('../models');

            const indentItems = await ModelIndentItem.find({
                _id: { $in: data.indentItemIds },
                procurementStatus: ModelProcurementStatus.PENDING
            }).populate('itemId').session(session);

            if (indentItems.length !== data.indentItemIds.length) {
                throw new ApiError(400, 'Some indent items not found or already in PO');
            }

            // Check if any indent already has PO raised
            const initialIndentIds = [...new Set(indentItems.map((ii: any) => ii.indentId.toString()))] as string[];
            const linkedIndents = await Indent.find({ _id: { $in: initialIndentIds } }).session(session);
            for (const ind of linkedIndents) {
                if (ind.isPoRaised) {
                    throw new ApiError(400, `Purchase Order already raised for Indent #${ind._id.toString().slice(-6).toUpperCase()}`);
                }
            }

            // 2. Create PO (DRAFT)
            const displayId = await generateDisplayId('PO');
            const po = await PurchaseOrder.create([{
                tenantId: user.tenantId,
                displayId: displayId,
                branchId: branchId,
                vendorId: data.vendorId,
                createdBy: user._id,
                deliveryDate: data.deliveryDate,
                status: PurchaseOrderStatus.PENDING,
                type: 'STANDARD',
                totalAmount: 0
            }], { session });

            // 3. Aggregate Indent Items by ItemId and Create PO Items
            const itemsMap = new Map();
            let totalAmountVal = 0;

            indentItems.forEach((ii: any) => {
                const item = ii.itemId;
                const itemId = item._id.toString();
                const unitCost = item.unitCost || 0;
                const taxRate = item.taxRate || 0;
                const quantity = ii.pendingQty || (ii.approvedQty - ii.poQty);
                const totalPrice = (quantity * unitCost) * (1 + taxRate / 100);
                totalAmountVal += totalPrice;

                if (itemsMap.has(itemId)) {
                    const existing = itemsMap.get(itemId);
                    existing.quantity += quantity;
                    existing.totalPrice += totalPrice;
                    existing.indentLinks.push({ indentItemId: ii._id, quantity });
                } else {
                    itemsMap.set(itemId, {
                        poId: po[0]._id,
                        itemId,
                        name: item.itemName,
                        quantity,
                        unitCost,
                        taxRate,
                        totalPrice,
                        indentLinks: [{ indentItemId: ii._id, quantity }]
                    });
                }
            });

            const poItemsToCreate = Array.from(itemsMap.values());
            await PurchaseOrderItem.insertMany(poItemsToCreate, { session });

            // 4. Update Indent Items and Indents
            await ModelIndentItem.updateMany(
                { _id: { $in: data.indentItemIds } },
                { $set: { procurementStatus: ModelProcurementStatus.IN_PO } },
                { session }
            );

            // Update each ii.poQty individually because they might have different quantities
            for (const ii of indentItems) {
                const qty = ii.pendingQty || (ii.approvedQty - ii.poQty);
                ii.poQty = (ii.poQty || 0) + qty;
                await ii.save({ session });
            }

            await Indent.updateMany(
                { _id: { $in: initialIndentIds } },
                { $set: { isPoRaised: true } },
                { session }
            );

            // 6. Save PO Total
            po[0].totalAmount = totalAmountVal;
            await po[0].save({ session });

            await session.commitTransaction();

            // Audit
            AuditLogService.log({
                action: 'PO_CREATE_FROM_INDENT',
                entity: 'PurchaseOrder',
                entityId: po[0]._id,
                performedBy: user._id,
                details: {
                    displayId: po[0].displayId,
                    indentItemsCount: data.indentItemIds.length,
                    amount: po[0].totalAmount
                },
                tenantId: user.tenantId,
                branchId: branchId
            });

            return po[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async updatePO(poId: string, data: any, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId });
        if (!po) throw new ApiError(404, 'PO not found');
        if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Only PENDING POs can be updated');

        if (data.deliveryDate) po.deliveryDate = data.deliveryDate;
        if (data.vendorId) po.vendorId = data.vendorId;
        // Vendor change might invalidate items prices? Ignoring for now as per requirement complexity.

        await po.save();
        return po;
    }

    static async cancelPO(poId: string, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId });
        if (!po) throw new ApiError(404, 'PO not found');
        if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Only PENDING POs can be cancelled');

        po.status = PurchaseOrderStatus.CANCELLED;
        await po.save();
        return po;
    }

    static async deletePO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');

            if (po.status !== PurchaseOrderStatus.PENDING) {
                throw new ApiError(400, 'Cannot delete APPROVED or CLOSED POs');
            }

            await PurchaseOrderItem.deleteMany({ poId: po._id }, { session });
            await PurchaseOrder.deleteOne({ _id: po._id }, { session });

            await session.commitTransaction();
            return { message: 'PO deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async approvePO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');
            if (po.status !== PurchaseOrderStatus.PENDING && (po.status as string) !== 'OPEN') throw new ApiError(400, `PO is not PENDING (Current: ${po.status})`);

            po.status = PurchaseOrderStatus.APPROVED;
            po.approvedBy = user._id;
            await po.save({ session });

            // Handle Special Order Master Creation
            if (po.type === 'SPECIAL') {
                await PurchaseOrderService.processMasterCreation(po, session, user);
            }

            // Auto-GRN logic removed. GRN is manually created in separate module.

            await session.commitTransaction();

            // Audit
            AuditLogService.log({
                action: 'PO_APPROVE',
                entity: 'PurchaseOrder',
                entityId: po._id,
                performedBy: user._id,
                details: {
                    displayId: po.displayId,
                    totalAmount: po.totalAmount
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            return po;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async revertPO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');

            // Allow reverting only if APPROVED
            if (po.status !== PurchaseOrderStatus.APPROVED) {
                throw new ApiError(400, `PO can strictly only be reverted from APPROVED status. Current status: ${po.status}`);
            }

            po.status = PurchaseOrderStatus.PENDING;
            po.approvedBy = undefined; // Clear approval
            await po.save({ session });

            await AuditLogService.log({
                action: 'PO_REVERT_TO_PENDING',
                entity: 'PurchaseOrder',
                entityId: po._id.toString(),
                performedBy: user.userId,
                details: {
                    reason: 'User requested revert to PENDING'
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            await session.commitTransaction();
            return po;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async patchItemQuantity(poId: string, itemId: string, quantity: number, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');
            if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Cannot update items in closed/approved PO');

            const poItem = await PurchaseOrderItem.findOne({ poId: po._id, itemId: itemId }).session(session);
            if (!poItem) throw new ApiError(404, 'Item not found in PO');

            const oldQuantity = poItem.quantity;

            // Update item
            poItem.quantity = quantity;
            poItem.totalPrice = (quantity * poItem.unitCost) * (1 + poItem.taxRate / 100);
            await poItem.save({ session });

            // Recalculate PO Total
            const allItems = await PurchaseOrderItem.find({ poId: po._id }).session(session);
            const newTotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

            po.totalAmount = Math.max(0, newTotal - (po.rtvCredit || 0));
            await po.save({ session });

            // Explicit Audit Log handled in controller or here? Service shouldn't depend on Controller logic but can log.
            // But Controller in previous code did logging. Keeping it consistent?
            // Actually previous code had AuditLogService import but commented out usage or structure was weird.
            // Let's rely on Controller to call AuditLog for simple actions, or Service.
            // Service is better encapsulation.

            // Explicit Audit Log
            await AuditLogService.log({
                action: 'PO_ITEM_QUANTITY_PATCH',
                entity: 'PurchaseOrder',
                entityId: po._id.toString(),
                performedBy: user.userId,
                details: {
                    itemId: itemId,
                    oldQuantity: oldQuantity,
                    newQuantity: quantity
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            await session.commitTransaction();
            return { po, poItem };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    static async getPOById(poId: string, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId })
            .populate('vendorId', 'vendorName')
            .populate('branchId', 'branchName')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');

        if (!po) throw new ApiError(404, 'PO not found');

        const items = await PurchaseOrderItem.find({ poId: po._id }).populate('itemId', 'name code unit inventoryUom');

        return { ...po.toJSON(), items };
    }
    private static async processMasterCreation(po: any, session: mongoose.ClientSession, user: any) {
        if (!po.masterCreationFlags) return;

        const { addToVendorMaster } = po.masterCreationFlags;
        const { tempVendorData } = po;

        // 1. Vendor Creation
        if (addToVendorMaster && tempVendorData && po.vendorName) {
            const { Vendor } = await import('../models/vendor.model');

            // Check duplicate by Name or GST
            const duplicateQuery: any[] = [{ vendorName: { $regex: new RegExp(`^${po.vendorName}$`, 'i') } }];
            if (tempVendorData.gstNo) duplicateQuery.push({ gstNo: tempVendorData.gstNo });

            const existingVendor = await Vendor.findOne({
                tenantId: po.tenantId,
                $or: duplicateQuery
            }).session(session);

            if (existingVendor) {
                // Use existing
                po.vendorId = existingVendor._id;
                await po.save({ session });
            } else {
                const newVendorDisplayId = await generateDisplayId('VN');
                const newVendor = await Vendor.create([{
                    tenantId: po.tenantId,
                    displayId: newVendorDisplayId,
                    vendorName: po.vendorName,
                    gstNo: tempVendorData.gstNo || "",
                    panNo: tempVendorData.panNo || "",
                    categories: tempVendorData.categories || [],
                    status: 'ACTIVE',
                    createdFrom: 'SO',
                    sourceOrderId: po._id,
                    contactDetails: {
                        phone: "",
                        email: "",
                        address: ""
                    }
                }], { session });
                po.vendorId = newVendor[0]._id;
                await po.save({ session });
            }
        }

        // 2. Inventory Creation
        const { Item: ItemModel } = await import('../models/item.model');
        const items = await PurchaseOrderItem.find({ poId: po._id }).session(session);

        for (const item of items) {
            // Only proceed if item has temp data AND explicitly marked to save to master
            if (item.tempItemData && item.tempItemData.saveToMaster) {

                let targetCode = item.tempItemData.code;

                // Auto-generate code if missing
                if (!targetCode) {
                    targetCode = await generateDisplayId('IT'); // e.g., IT-00123
                }

                // Check existence by code
                const existingItem = await ItemModel.findOne({
                    tenantId: po.tenantId,
                    itemCode: targetCode
                }).session(session);

                if (existingItem) {
                    item.itemId = existingItem._id as any;
                    item.name = existingItem.itemName; // Sync name? Maybe keep PO name.
                    await item.save({ session });
                } else {
                    const newItemDisplayId = await generateDisplayId('IT');
                    // Note: If we used generateDisplayId for targetCode, we might burn a number or reuse logic.
                    // Ideally itemCode and displayId are separate but often same.
                    // If targetCode was auto-generated above it might collide if we call generateDisplayId again?
                    // generateDisplayId increments counter. 
                    // So if targetCode was from generateDisplayId, use it for displayId too.

                    const finalDisplayId = targetCode === item.tempItemData.code ? newItemDisplayId : (targetCode || newItemDisplayId);
                    // Actually, if targetCode was generated, it IS the displayId format.

                    const newItem = await ItemModel.create([{
                        tenantId: po.tenantId,
                        displayId: finalDisplayId,
                        itemName: item.name,
                        itemCode: targetCode, // Ensure code is set
                        categoryId: item.tempItemData.category,
                        inventoryUom: item.tempItemData.uom || 'Nos',
                        unitCost: item.unitCost,
                        taxRate: item.taxRate,
                        description: item.tempItemData.description || "",
                        status: 'ACTIVE',
                        createdFrom: 'SO',
                        sourceOrderId: po._id
                    }], { session }) as any;

                    item.itemId = newItem[0]._id;
                    await item.save({ session });
                }
            }
        }
    }
}
