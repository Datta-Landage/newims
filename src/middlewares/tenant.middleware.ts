import { Context, Next } from 'hono';
import { AppError } from '../utils/errors';

export const tenantMiddleware = async (c: Context, next: Next) => {
    const tenantId = c.get('tenantId');
    if (!tenantId) {
        throw new AppError('Tenant context missing', 400);
    }
    await next();
};

export const branchMiddleware = async (c: Context, next: Next) => {
    const branchId = c.get('branchId');
    const isGetRequest = c.req.method === 'GET';
    const user = c.get('user');
    const isSuperAdmin = user?.roleCode === 'SA';

    if (!branchId && !isSuperAdmin && !isGetRequest) {
        throw new AppError('Branch context required for this operation', 400);
    }
    await next();
};
