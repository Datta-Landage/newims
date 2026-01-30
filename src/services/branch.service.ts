import { Branch, IBranch } from '../models';
import { AuditLogService } from './audit-log.service';

export class BranchService {
    static async list(tenantId: string): Promise<IBranch[]> {
        return Branch.find({ tenantId, status: 'ACTIVE' }).sort({ branchName: 1 });
    }

    static async create(data: Partial<IBranch>, user: any): Promise<IBranch> {
        // Enforce: Only SA can create branches. 
        // Although Controller/Middleware checks permissions, Service double-check is good practice, 
        // but typically Service trusts Controller. 
        // However, I will inject tenantId server-side.

        const branch = await Branch.create({
            ...data,
            tenantId: user.tenantId, // Always use User's Tenant
        });

        await AuditLogService.log({
            action: 'BRANCH_CREATE',
            entity: 'Branch',
            entityId: branch._id.toString(),
            performedBy: user.userId,
            details: { branchName: branch.branchName },
            tenantId: user.tenantId,
            branchId: branch._id.toString()
        });

        return branch;
    }

    static async update(id: string, data: Partial<IBranch>, user: any): Promise<IBranch | null> {
        const branch = await Branch.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: data },
            { new: true, runValidators: true }
        );

        if (branch) {
            await AuditLogService.log({
                action: 'BRANCH_UPDATE',
                entity: 'Branch',
                entityId: branch._id.toString(),
                performedBy: user.userId,
                details: data,
                tenantId: user.tenantId,
                branchId: branch._id.toString()
            });
        }

        return branch;
    }
}
