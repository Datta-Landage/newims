import { Context, Next } from 'hono';
import { ModuleKey } from '../constants/modules';
import { AppError } from '../utils/errors';
import { User } from '../models/user.model';
import { hasModuleAccess } from '../utils/rbac';

export const authorizeModule = (requiredModuleOrModules: ModuleKey | ModuleKey[]) => {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            throw new AppError('Unauthorized', 401);
        }

        // Standardized userId is sets in authMiddleware in c.get('user')
        const userId = user.userId || user._id;

        // If the user in context is already a document (not lean) and has roleId populated, we can use it.
        // However, authorizeModule is generic. Let's ensure we have role access.
        let dbUser = user;
        if (!user.populated || typeof user.populated !== 'function') {
            // It's a lean object from authMiddleware. We need fresh doc for hasModuleAccess (if it uses Mongoose methods)
            // OR we update hasModuleAccess to handle lean objects.
            dbUser = await User.findById(userId).populate('roleId');
        }

        if (!dbUser) {
            throw new AppError('User not found', 401);
        }

        const allowedModules = Array.isArray(requiredModuleOrModules)
            ? requiredModuleOrModules
            : [requiredModuleOrModules];

        // Check if user has access to ANY of the allowed modules
        let hasAccess = false;
        for (const module of allowedModules) {
            if (await hasModuleAccess(dbUser, module)) {
                hasAccess = true;
                break;
            }
        }

        if (!hasAccess) {
            throw new AppError(`Forbidden: You do not have access to required modules (${allowedModules.join(', ')})`, 403);
        }

        // Update context with full user if needed for downstream
        c.set('user', dbUser);

        await next();
    };
};
