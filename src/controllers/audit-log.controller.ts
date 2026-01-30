import { Context } from 'hono';
import { AuditLogService } from '../services';
import { Variables } from '../types';
import { ApiResponse } from '../utils/ApiResponse';

export class AuditLogController {
    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { page = '1', limit = '20', performedBy, entity, startDate, endDate } = c.req.query();

        // Enforce SuperAdmin? The plan said "SuperAdmin will see... Logs".
        // Assuming RBAC middleware handles the permission check (e.g., 'LOGS.VIEW').
        // If strict SA check needed inside controller:
        // if (user.roleCode !== 'SA') return c.json({ error: 'Unauthorized' }, 403); 
        // But RBAC is better.

        const filters = {
            performedBy,
            entity,
            startDate,
            endDate
        };

        const { logs, total } = await AuditLogService.list(
            user.tenantId.toString(),
            filters,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        return c.json(new ApiResponse(200, {
            logs,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Logs retrieved successfully'));
    }
}
