import { IUser } from '../models/user.model';
import { IRole } from '../models/role.model';
import { ModuleKey } from '../constants/modules';
import { Role } from '../models/role.model';

/**
 * Checks if a user has access to a specific module.
 * 
 * Logic:
 * 1. If branch overrides exist for the user's current branch, check those.
 * 2. If no overrides, check the user's active Role.
 */
// Global modules that should be accessible regardless of branch selection (if user has role access)
export const GLOBAL_MODULES = [
    ModuleKey.BRANCHES,
    ModuleKey.SYSTEM_LOGS,
    ModuleKey.USERS
];

/**
 * Checks if a user has access to a specific module.
 * 
 * Logic:
 * 1. If module is Global, check Role access (ignore branch overrides).
 * 2. If branch overrides exist for the user's current branch, check those.
 * 3. If no overrides, check the user's active Role.
 */
export const hasModuleAccess = async (user: IUser, moduleKey: ModuleKey): Promise<boolean> => {
    if (!user || !moduleKey) return false;

    // 0. Fetch Role if not populated
    let roleModules: ModuleKey[] = [];

    // Check if roleId is already a populated object
    if (user.roleId && typeof user.roleId === 'object' && 'modules' in user.roleId) {
        roleModules = (user.roleId as any).modules || [];
    } else {
        const role = await Role.findById(user.roleId).lean();
        if (role) {
            roleModules = (role as any).modules || [];
        }
    }

    // 1. Global Modules: Ignore Branch Context, check Role directly
    if (GLOBAL_MODULES.includes(moduleKey)) {
        return roleModules.includes(moduleKey);
    }

    // 2. Check Branch Overrides
    if (user.branchId && user.branches && user.branches.length > 0) {
        const branchAccess = user.branches.find(b => b.branchId.toString() === user.branchId?.toString());

        // If overrides exist (modules array is present), use it EXCLUSIVELY for non-global modules
        if (branchAccess && branchAccess.modules && branchAccess.modules.length > 0) {
            return branchAccess.modules.includes(moduleKey);
        }
    }

    // 3. Fallback to Role
    return roleModules.includes(moduleKey);
};

/**
 * Returns the list of all modules accessible to the user.
 */
/**
 * Returns the list of all modules accessible to the user.
 */
export const getUserModules = async (user: IUser): Promise<ModuleKey[]> => {
    if (!user) return [];

    // 0. Fetch Role Modules
    let roleModules: ModuleKey[] = [];

    // Check if roleId is already a populated object
    if (user.roleId && typeof user.roleId === 'object' && 'modules' in user.roleId) {
        roleModules = (user.roleId as any).modules || [];
    } else {
        const role = await Role.findById(user.roleId).lean();
        if (role) {
            roleModules = (role as any).modules || [];
        }
    }

    // 1. Identify Global Modules the user has access to (from Role)
    const functionGlobalModules = roleModules.filter(m => GLOBAL_MODULES.includes(m));

    // 2. Check Branch Overrides for Non-Global Modules
    let effectiveModules: ModuleKey[] = [];

    if (user.branchId && user.branches && user.branches.length > 0) {
        const branchAccess = user.branches.find(b => b.branchId.toString() === user.branchId?.toString());

        // If overrides exist, use them modules + global modules
        if (branchAccess && branchAccess.modules && branchAccess.modules.length > 0) {
            // Combine overrides with global modules
            // Use Set to avoid duplicates if for some reason override includes a global module
            effectiveModules = Array.from(new Set([...branchAccess.modules, ...functionGlobalModules]));
            return effectiveModules;
        }
    }

    // 3. Fallback to Role (ALL modules from role)
    return roleModules;
};
