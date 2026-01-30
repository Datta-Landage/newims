import { Indent, IndentItem, IndentStatus, Issue } from '../models';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { generateDisplayId } from '../utils/sequence-generator';
import { AuditLogService } from './audit-log.service';

export class IndentService {
    static async createIndent(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.create([{
                tenantId: user.tenantId,
                displayId: await generateDisplayId('IN'),
                branchId: branchId,
                workAreaId: data.workAreaId,
                createdBy: user._id,
                remarks: data.remarks,
                entryType: data.entryType || 'OPEN',
                status: IndentStatus.OPEN,
            }], { session });

            const itemsToCreate = data.items.map((item: any) => ({
                indentId: indent[0]._id,
                itemId: item.itemId,
                requestedQty: item.requestedQty,
                issuedQty: 0,
                pendingQty: item.requestedQty
            }));

            await IndentItem.insertMany(itemsToCreate, { session });

            await session.commitTransaction();

            // Audit
            AuditLogService.log({
                action: 'INDENT_CREATE',
                entity: 'Indent',
                entityId: indent[0]._id,
                performedBy: user._id,
                details: {
                    displayId: indent[0].displayId,
                    workArea: data.workAreaId, // Just ID for now
                    itemsCount: itemsToCreate.length
                },
                tenantId: user.tenantId,
                branchId: branchId
            });

            return indent[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async approveIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Indent is not OPEN');

        indent.status = IndentStatus.APPROVED;
        await indent.save();
        return indent;
    }

    static async rejectIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Only OPEN indents can be rejected');

        indent.status = IndentStatus.REJECTED;
        await indent.save();
        return indent;
    }

    static async cancelIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Only OPEN indents can be cancelled');

        indent.status = IndentStatus.CANCELLED;
        await indent.save();
        return indent;
    }

    static async getProcurementPool(user: any, filters: any = {}) {
        // IndentItem does not have tenantId, filtering must happen via Indent lookup
        const query: any = {
            pendingQty: { $gt: 0 },
            procurementStatus: 'PENDING'
        };

        // TODO: Filter by categoryId require lookup or aggregation.
        // For now, let's fetch items and populate.

        const items = await IndentItem.find(query)
            .populate({
                path: 'indentId',
                match: {
                    status: { $in: [IndentStatus.APPROVED, IndentStatus.PARTIALLY_ISSUED] },
                    tenantId: user.tenantId
                }
            })
            .populate('itemId');

        // Filter out items where indentId is null (because match failed or indent deleted)
        const validItems = items.filter(item => item.indentId);

        // Filter by category if requested
        let result = validItems;
        if (filters.categoryId) {
            result = result.filter((item: any) => item.itemId.categoryId.toString() === filters.categoryId);
        }

        return result;
    }

    static async updateItem(itemId: string, data: any, user: any) {
        // Ensure user has permission / owns the tenant
        // We need to fetch item and verify indent status is OPEN
        // Optimization: Find item, populate indent
        const item = await IndentItem.findById(itemId).populate('indentId');
        if (!item) throw new ApiError(404, 'Indent Item not found');

        const indent: any = item.indentId;
        if (indent.tenantId !== user.tenantId) throw new ApiError(403, 'Unauthorized');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Cannot update items in non-OPEN indent');

        if (data.requestedQty) {
            item.requestedQty = data.requestedQty;
            item.pendingQty = data.requestedQty; // Reset pending to full requested (assuming none issued yet if OPEN)
        }

        await item.save();
        return item;
    }

    static async deleteItem(itemId: string, user: any) {
        const item = await IndentItem.findById(itemId).populate('indentId');
        if (!item) throw new ApiError(404, 'Indent Item not found');

        const indent: any = item.indentId;
        if (indent.tenantId !== user.tenantId) throw new ApiError(403, 'Unauthorized');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Cannot delete items in non-OPEN indent');

        await IndentItem.deleteOne({ _id: itemId });
        return { success: true };
    }
    static async issueStock(indentId: string, sourceWorkAreaId: string, items: any[], user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId }).session(session);
            if (!indent) throw new ApiError(404, 'Indent not found');

            // Allowed statuses for issue: APPROVED (shown as PENDING in UI), PARTIALLY_ISSUED, ISSUED (legacy/fallback)
            const allowedStatuses = ['APPROVED', 'PARTIALLY_ISSUED', 'ISSUED'];
            if (!allowedStatuses.includes(indent.status)) {
                throw new ApiError(400, `Cannot issue stock for indent with status ${indent.status}`);
            }

            const InventoryService = (await import('./inventory.service')).InventoryService;

            // Prepare items for Issue Record
            const issuedItemsRecord: any[] = [];

            for (const itemData of items) {
                const { indentItemId, issueQty } = itemData;
                if (issueQty <= 0) continue;

                const indentItem = await IndentItem.findOne({ _id: indentItemId, indentId }).session(session);
                if (!indentItem) throw new ApiError(404, `Indent item ${indentItemId} not found`);

                const pending = (indentItem.approvedQty || indentItem.requestedQty) - indentItem.issuedQty;
                if (issueQty > pending) {
                    throw new ApiError(400, `Issue quantity ${issueQty} exceeds pending quantity ${pending} for item ${indentItem.itemId}`);
                }

                // 1. Deduct Stock from source work area
                await InventoryService.decrementStock(
                    user.tenantId,
                    branchId,
                    sourceWorkAreaId,
                    indentItem.itemId.toString(),
                    issueQty,
                    session
                );

                // 2. Update Indent Item quantities
                indentItem.issuedQty += issueQty;
                indentItem.pendingQty = Math.max(0, (indentItem.approvedQty || indentItem.requestedQty) - indentItem.issuedQty); // Explicit update
                await indentItem.save({ session });

                issuedItemsRecord.push({
                    indentItemId: indentItem._id,
                    itemId: indentItem.itemId,
                    quantity: issueQty
                });
            }

            // 3. Create Issue Record (Audit/Report)
            if (issuedItemsRecord.length > 0) {
                // Import Issue model dynamically if needed to avoid circular dep, or use existing if safe
                // IndentService imports Issue at top, should be fine.
                await Issue.create([{
                    tenantId: user.tenantId,
                    branchId: branchId,
                    indentId: indent._id,
                    issuedBy: user._id,
                    type: 'ISSUANCE',
                    items: issuedItemsRecord,
                    remarks: `Stock Issued from WorkArea ${sourceWorkAreaId}`,
                    issueDate: new Date()
                }], { session });
            }

            // 4. Update Indent Status
            const allItems = await IndentItem.find({ indentId }).session(session);
            const totalApproved = allItems.reduce((sum, item) => sum + (item.approvedQty || item.requestedQty), 0);
            const totalIssued = allItems.reduce((sum, item) => sum + item.issuedQty, 0);

            if (totalIssued >= totalApproved) {
                indent.status = IndentStatus.ISSUED;
            } else if (totalIssued > 0) {
                indent.status = IndentStatus.PARTIALLY_ISSUED;
            }

            await indent.save({ session });

            await session.commitTransaction();
            return indent;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
