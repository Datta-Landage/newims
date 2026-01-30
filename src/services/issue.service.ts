import { Issue, Indent, IndentItem, IndentStatus } from '../models';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

export class ApproveIndentService {
    static async createIssue(data: any, user: any, branchId: string) {
        // LEGACY: usage of "createIssue" is actually "approveIndent" for workflow compatibility
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.findOne({ _id: data.indentId, tenantId: user.tenantId }).session(session);
            if (!indent) throw new AppError('Indent not found', 404);

            // Allow OPEN or PENDING to be Approved (Issued)
            const allowedStatuses = ['OPEN', 'PENDING'];
            if (indent.status === IndentStatus.APPROVED || indent.status === IndentStatus.ISSUED) {
                // Idempotent success? Or throw?
                throw new AppError(`Indent is already Approved/Issued.`, 400);
            }

            // Create "Issue" record as audit log for Approval
            const issue = await Issue.create([{
                tenantId: user.tenantId,
                branchId: branchId,
                indentId: data.indentId,
                issuedBy: user._id,
                type: 'APPROVAL',
                remarks: "Auto-generated Issue record for Approval Action"
            }], { session });

            const indentItems = await IndentItem.find({ indentId: data.indentId }).session(session);

            // Full Approval Only
            for (const indentItem of indentItems) {
                // Set Approved Qty to Requested Qty
                indentItem.approvedQty = indentItem.requestedQty;
                // Ensure Issued Qty is 0 (as stock hasn't moved)
                indentItem.issuedQty = 0;

                // Pending Qty remains Requested (since none issued)
                indentItem.pendingQty = indentItem.requestedQty;

                // Reset PO Qty tracking if clean slate needed? 
                // No, keep existing if any.

                await indentItem.save({ session });
            }

            // Set Status to ISSUED (Legacy Mapping for APPROVED)
            indent.status = IndentStatus.ISSUED;
            await indent.save({ session });

            await session.commitTransaction();
            return issue[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

// Backward Compatibility Export
export const IssueService = ApproveIndentService;
