import { WorkArea, IWorkArea, WorkAreaStatus } from '../models/work-area.model';
import { AuditLogService } from './audit-log.service';
import { generateDisplayId } from '../utils/sequence-generator';

export class WorkAreaService {
    static async create(data: Partial<IWorkArea>, user: any): Promise<IWorkArea> {
        const workArea = await WorkArea.create({
            ...data,
            ...data,
            tenantId: user.tenantId,
            displayId: await generateDisplayId('WA'),
            status: data.status || WorkAreaStatus.ACTIVE,
        });

        await AuditLogService.log({
            action: 'WORK_AREA_CREATE',
            entity: 'WorkArea',
            entityId: workArea._id.toString(),
            performedBy: user.userId,
            details: { name: workArea.name, branchIds: workArea.branchIds },
            tenantId: user.tenantId,
            // branchId: workArea.branchIds[0]?.toString() // WorkArea can belong to multiple branches, picking first for log or generic?
            // The AuditLogService interface might require single branchId or none. 
            // Leaving undefined if not strictly required, or user.branchId if available?
            // For now omitting if optional or passing user context branch if relevant.
            branchId: user.branchId || undefined
        });

        return workArea;
    }

    static async list(tenantId: string, filters: { branchId?: string; status?: string }): Promise<IWorkArea[]> {
        const query: any = { tenantId };

        if (filters.branchId) {
            query.branchIds = filters.branchId;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        return WorkArea.find(query).populate('branchIds', 'branchName location').sort({ name: 1 });
    }

    static async getById(id: string, tenantId: string): Promise<IWorkArea | null> {
        return WorkArea.findOne({ _id: id, tenantId }).populate('branchIds', 'branchName location');
    }

    static async update(id: string, data: Partial<IWorkArea>, user: any): Promise<IWorkArea | null> {
        const workArea = await WorkArea.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: data },
            { new: true }
        ).populate('branchIds', 'branchName location');

        if (workArea) {
            await AuditLogService.log({
                action: 'WORK_AREA_UPDATE',
                entity: 'WorkArea',
                entityId: workArea._id.toString(),
                performedBy: user.userId,
                details: data,
                tenantId: user.tenantId,
                branchId: user.branchId || undefined
            });
        }

        return workArea;
    }

    static async delete(id: string, user: any): Promise<IWorkArea | null> {
        const workArea = await WorkArea.findOneAndDelete({ _id: id, tenantId: user.tenantId });

        if (workArea) {
            await AuditLogService.log({
                action: 'WORK_AREA_DELETE',
                entity: 'WorkArea',
                entityId: workArea._id.toString(),
                performedBy: user.userId,
                details: { name: workArea.name },
                tenantId: user.tenantId,
                branchId: user.branchId || undefined
            });
        }

        return workArea;
    }
}
