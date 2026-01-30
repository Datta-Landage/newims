import { AuditLog } from '../models';
import mongoose from 'mongoose';

interface LogData {
    action: string;
    entity: string;
    entityId?: string | mongoose.Types.ObjectId;
    performedBy: string | mongoose.Types.ObjectId;
    details?: any;
    tenantId: string | mongoose.Types.ObjectId;
    branchId?: string | mongoose.Types.ObjectId;
}

export class AuditLogService {
    static async log(data: LogData) {
        try {
            await AuditLog.create({
                ...data,
                timestamp: new Date(),
            } as any);
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking, we don't want to fail the main request if logging fails, 
            // though in strictly audited systems we might want to throw.
        }
    }

    static async list(tenantId: string, filters: any = {}, pagination: { page: number; limit: number }) {
        const query: any = { tenantId };

        if (filters.performedBy) {
            query.performedBy = filters.performedBy;
        }
        if (filters.entity) {
            query.entity = filters.entity;
        }
        if (filters.startDate && filters.endDate) {
            query.timestamp = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
        }

        const skip = (pagination.page - 1) * pagination.limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(pagination.limit)
                .populate({
                    path: 'performedBy',
                    select: 'name email roleId',
                    populate: {
                        path: 'roleId',
                        select: 'roleName'
                    }
                }),
            AuditLog.countDocuments(query),
        ]);

        return { logs, total };
    }
}
