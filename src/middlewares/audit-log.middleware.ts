import { Context, Next } from 'hono';
import { AuditLogService } from '../services/audit-log.service';

export const auditLogMiddleware = async (c: Context, next: Next) => {
    // Only log state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
        const method = c.req.method;
        const path = c.req.path;

        await next();

        // 2. Fetch user from context after next() 
        const user = c.get('user');
        const statusCode = c.res.status;

        // 3. Only log if successful (2xx or 3xx) and user is present
        if (user && statusCode < 400) {
            // Skip redundant logs for paths that have explicit logging or are sensitive
            const skipPaths = ['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/audit-logs'];
            if (skipPaths.some(p => path.startsWith(p))) {
                return;
            }

            await AuditLogService.log({
                action: `${method} ${path}`,
                entity: 'System',
                performedBy: user._id || user.userId,
                tenantId: user.tenantId,
                branchId: c.get('branchId') || user.branchId,
                details: {
                    method,
                    path,
                    statusCode,
                }
            });
        }
    } else {
        await next();
    }
};

// NOTE: For better granularity (e.g. "Create Vendor"), we should explicitly call AuditLogService in controllers.
// This middleware acts as a fallback "Safety Net" or "Access Log".
// I will implement explicit calls in PO/Indent/etc. as well for better "Entity" tracking.
