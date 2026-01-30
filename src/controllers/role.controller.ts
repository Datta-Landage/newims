import { Context } from 'hono';
import { Role } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { ModuleKey } from '../constants/modules';

export class RoleController {
    static async list(c: Context) {
        const roles = await Role.find({});
        return c.json(new ApiResponse(200, roles, 'Roles retrieved successfully'));
    }

    static async get(c: Context) {
        const id = c.req.param('id');
        const role = await Role.findById(id);

        if (!role) {
            throw new ApiError(404, 'Role not found');
        }

        return c.json(new ApiResponse(200, role, 'Role retrieved successfully'));
    }

    static async updateModules(c: Context) {
        const id = c.req.param('id');
        const { modules } = await c.req.json();

        // Validate modules
        if (!Array.isArray(modules)) {
            throw new ApiError(400, 'Modules must be an array');
        }

        const validModules = Object.values(ModuleKey);
        const invalidModules = modules.filter((m: any) => !validModules.includes(m));

        if (invalidModules.length > 0) {
            throw new ApiError(400, `Invalid modules: ${invalidModules.join(', ')}`);
        }

        const role = await Role.findByIdAndUpdate(
            id,
            { modules },
            { new: true }
        );

        if (!role) {
            throw new ApiError(404, 'Role not found');
        }

        return c.json(new ApiResponse(200, role, 'Role modules updated successfully'));
    }
}
