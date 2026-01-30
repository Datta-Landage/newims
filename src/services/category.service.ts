import { Category, ICategory } from '../models';
import { AuditLogService } from './audit-log.service';

export class CategoryService {
    static async create(data: Partial<ICategory>, user: any): Promise<ICategory> {
        const category = await Category.create({
            ...data,
            tenantId: user.tenantId,
            branchId: user.branchId, // Scoped to branch
        });

        await AuditLogService.log({
            action: 'CATEGORY_CREATE',
            entity: 'Category',
            entityId: category._id.toString(),
            performedBy: user.userId,
            details: { name: category.name },
            tenantId: user.tenantId,
            branchId: user.branchId?.toString(),
        });

        return category;
    }

    static async list(tenantId: string, branchId?: string): Promise<ICategory[]> {
        const query: any = { tenantId, status: 'ACTIVE' };
        if (branchId) {
            query.branchId = branchId;
        }
        return Category.find(query).sort({ name: 1 });
    }
}
