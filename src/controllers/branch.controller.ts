import { Context } from 'hono';
import { BranchService } from '../services';
import { Branch } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { generateDisplayId } from '../utils/sequence-generator';

export class BranchController {
    static async list(c: Context) {
        const user = c.get('user');
        // Any authenticated user can list branches? 
        // Requirements say "Select Workspace" screen is for SA.
        // But BM might need to see their branch details?
        // For now, let's allow it, but maybe filter? 
        // SA sees all. BM sees only their own?
        // "Select Workspace" implies switching. BM cannot switch.
        // But the API might be reused.
        // Current requirement: "Workspace Selection" for SA.
        // So `BranchService.list` returns all.
        // If BM calls this, they see all branches? 
        // The "Role Inheritance Rule" says BM actions are STRICTLY limited to their own branch.
        // So if BM calls list, they should ONLY get their own branch.

        // I will implement logic:
        // IF SA: Return All.
        // IF BM/Others: Return Only Own Branch.

        // AuthMiddleware Populates `roleId`, but maybe not `roleCode` directly in `user` object passed to context?
        // I need to check AuthMiddleware.
        // If not available, I might need to fetch Role or assume SA check via other means.
        // AuthMiddleware sets `roleId`.
        // Let's assume I can get Role Code or I rely on `user.branchId`.

        // If `user.branchId` is present, filtering is mandatory.

        const tenantId = c.get('tenantId');
        const roleCode = user.roleCode || user.roleId?.roleCode;
        const roleName = user.roleName || user.roleId?.roleName;

        // SA sees all for their tenant, others see assigned
        if (roleCode === 'SA' || roleName === 'Super Admin') {
            const branches = await Branch.find({ tenantId });
            return c.json(new ApiResponse(200, branches, 'Branches fetched successfully'));
        } else {
            // Get all branch IDs user has access to
            const branchIds = new Set<string>();
            if (user.branchId) branchIds.add(user.branchId.toString());
            if (user.branches && Array.isArray(user.branches)) {
                user.branches.forEach((b: any) => {
                    const id = b.branchId?._id || b.branchId;
                    if (id) branchIds.add(id.toString());
                });
            }

            const branches = await Branch.find({
                _id: { $in: Array.from(branchIds) },
                tenantId
            });
            return c.json(new ApiResponse(200, branches, 'Branches fetched successfully'));
        }
    }

    static async create(c: Context) {
        // Permission middleware handles "BRANCH.CREATE" check.
        const user = c.get('user');
        const tenantId = c.get('tenantId');
        const { branchName, location, status } = await c.req.json();

        const branch = await Branch.create({
            tenantId,
            displayId: await generateDisplayId('BR'),
            branchName,
            location: location || 'Main Office',
            status
        });

        return c.json(new ApiResponse(201, branch, 'Branch created successfully'), 201);
    }

    static async update(c: Context) {
        const user = c.get('user');
        const id = c.req.param('id');
        const updates = await c.req.json(); // Use 'updates' as per the provided snippet
        const branch = await Branch.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            updates,
            { new: true }
        );

        if (!branch) throw new ApiError(404, 'Branch not found');

        return c.json(new ApiResponse(200, branch, 'Branch updated successfully'));
    }
}
