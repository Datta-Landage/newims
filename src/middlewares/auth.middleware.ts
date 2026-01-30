import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { Config } from '../config';
import { AppError } from '../utils/errors';
import { User, UserStatus } from '../models';

export const authMiddleware = async (c: Context, next: Next) => {
    const token = getCookie(c, 'accessToken') || c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw new AppError('Not authorized, no token', 401);
    }

    try {
        const decoded = jwt.verify(token, Config.JWT_SECRET) as any;

        // Optimistic check: we rely on token, but could fetch user to be sure status is still active.
        // For high security, we fetch user.
        // We populate roleId to get access to role info
        const user = (await User.findById(decoded.userId).populate('roleId').lean()) as any;

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new AppError('User not found or inactive', 401);
        }

        // Standardize userId across the system. 
        // Virtuals are missing in lean objects, so we add it manually.
        user.userId = user._id.toString();

        // Inject roleName/isSystemRole for easier access in controllers
        user.roleCode = user.roleId?.roleCode;
        user.roleName = user.roleId?.roleName;
        user.isSystemRole = user.roleId?.isSystemRole;

        console.log('[Auth Debug] Populated User Role:', user.roleId?.roleCode || 'NOT_POPULATED');
        console.log('[Auth Debug] Injected roleCode:', user.roleCode);

        c.set('user', user);
        c.set('tenantId', user.tenantId.toString());

        // Handle Branch Switching
        const requestedBranchId = c.req.header('x-branch-id');
        const isSuperAdmin = user.roleName === 'Super Admin';

        if (requestedBranchId) {
            if (isSuperAdmin) {
                // SA can access any branch
                c.set('branchId', requestedBranchId);
            } else {
                // Check if user has access to this branch
                const branchAccess = user.branches?.find(
                    (b: any) => (b.branchId?._id?.toString?.() || b.branchId?.toString?.()) === requestedBranchId
                );

                if (branchAccess) {
                    c.set('branchId', requestedBranchId);
                    user.roleId = branchAccess.roleId;
                } else {
                    throw new AppError('Forbidden: No access to this branch', 403);
                }
            }
        } else {
            // Default to primary branch
            c.set('branchId', user.branchId?.toString());
        }

        await next();
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('Auth Error:', error);
        throw new AppError('Not authorized, invalid token', 401);
    }
};
