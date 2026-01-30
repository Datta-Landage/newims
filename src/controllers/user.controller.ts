import { Context } from "hono";
import mongoose from "mongoose";
import { Role, User, UserStatus } from "../models"; // Added Role import
import { AuthService } from "../services/auth.service";
import { Variables } from "../types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { generateDisplayId } from "../utils/sequence-generator";

export class UserController {
  static async create(c: Context<{ Variables: Variables }>) {
    const user = c.get("user") as any;
    const body = await c.req.json();

    const isSuperAdmin =
      user.roleName === "Super Admin" ||
      user.roleCode === "SA" ||
      user.roleId?.roleName === "Super Admin" ||
      user.roleId?.roleCode === "SA";

    // 1. Check if email already exists in this tenant
    const existingUser = await User.findOne({
      tenantId: user.tenantId,
      email: body.email.toLowerCase(),
    });

    if (existingUser) {
      return c.json(
        new ApiResponse(
          400,
          null,
          "A user with this email address already exists in your organization.",
        ),
        400,
      );
    }

    // RBAC Check: Restrict Role Creation for Non-Super Admin
    if (!isSuperAdmin) {
      const targetRole = await Role.findById(body.roleId);
      if (!targetRole) {
        return c.json(new ApiResponse(400, null, "Invalid Role ID"), 400);
      }

      // Strict Constraint: Branch Manager can only create Purchase Executive, Store Manager, Indent Requester
      const allowedRoles = [
        "Purchase Executive",
        "Store Manager",
        "Indent Requester",
      ];
      if (!allowedRoles.includes((targetRole as any).roleName)) {
        return c.json(
          new ApiResponse(
            403,
            null,
            "You are not authorized to create users with this role.",
          ),
          403,
        );
      }
    }

    // Hashing
    const hashedPassword = await AuthService.hashPassword(body.password);

    // Branch Enforcement
    let branches = body.branches || [];

    if (!isSuperAdmin) {
      // Non-SA (BM) MUST use their own branch for the new user
      // If they try to set branches, ensure all are their branch
      if (branches.length > 0) {
        const invalid = branches.some(
          (b: any) => b.branchId !== user.branchId?.toString(),
        );
        if (invalid) {
          return c.json(
            new ApiResponse(
              403,
              null,
              "Cannot assign users to other branches.",
            ),
            403,
          );
        }
      } else {
        // Default to current branch if no branches provided
        branches = [{ branchId: user.branchId, roleId: body.roleId }];
      }
    }

    // Determine primary branchId
    const primaryBranchId = body.branchId || branches[0]?.branchId || null;
    const primaryRoleId = body.roleId || branches[0]?.roleId;

    if (!primaryRoleId) {
      return c.json(new ApiResponse(400, null, "Role ID is required"), 400);
    }

    // Create user object, explicitly excluding password field
    const { password, ...userData } = body;

    try {
      const newUser = await User.create({
        ...userData,
        branches,
        branchId: primaryBranchId,
        roleId: primaryRoleId,
        passwordHash: hashedPassword,
        tenantId: user.tenantId,
        displayId: await generateDisplayId("US"),
      });

      // Remove password from response
      const userJson = newUser.toJSON();

      return c.json(
        new ApiResponse(201, userJson, "User created successfully"),
        201,
      );
    } catch (error: any) {
      console.error("User creation error:", error);
      // Handle Mongoose validation errors
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors)
          .map((err: any) => err.message)
          .join(", ");
        return c.json(
          new ApiResponse(400, null, `Validation Error: ${validationErrors}`),
          400,
        );
      }
      // Handle duplicate key errors
      if (error.code === 11000) {
        return c.json(
          new ApiResponse(400, null, "A user with this email already exists"),
          400,
        );
      }
      throw error; // Re-throw to be handled by error middleware
    }
  }

  static async list(c: Context<{ Variables: Variables }>) {
    const user = c.get("user") as any;
    const {
      page = "1",
      limit = "20",
      status,
      search,
      branchId: filterBranchId,
      roleId: filterRoleId,
      sortBy = "date",
    } = c.req.query();

    const query: any = { tenantId: user.tenantId };

    // Branch Filtering Logic
    // For SA: Rely strictly on query param (filterBranchId). If missing, show ALL (ignore header).
    // For Others: Rely on query param OR header (context).
    const isSuperAdmin =
      user.roleName === "Super Admin" ||
      user.roleCode === "SA" ||
      user.roleId?.roleName === "Super Admin" ||
      user.roleId?.roleCode === "SA";
    const activeBranchId = isSuperAdmin
      ? filterBranchId
      : filterBranchId || c.get("branchId");

    if (isSuperAdmin) {
      // SA can see all users, but if a branch is selected, show users in that branch OR users with no branch (SA users)
      if (activeBranchId) {
        const branchIdObj = new mongoose.Types.ObjectId(activeBranchId);
        query.$or = [
          { branchId: branchIdObj },
          { branchId: null }, // SuperAdmins with no branch
          { "branches.branchId": branchIdObj }, // Users with this branch in their branches array
        ];
      }
      // If no branch selected, SA sees all users (no branch filter)
    } else {
      // Non-SA users: Filter by their accessible branches
      const accessibleBranchIds: mongoose.Types.ObjectId[] = [];

      // Add primary branch
      if (user.branchId) {
        const branchId =
          user.branchId instanceof mongoose.Types.ObjectId
            ? user.branchId
            : new mongoose.Types.ObjectId(user.branchId);
        accessibleBranchIds.push(branchId);
      }

      // Add branches from branches array
      if (user.branches && Array.isArray(user.branches)) {
        user.branches.forEach((b: any) => {
          const branchId = b.branchId?._id || b.branchId;
          if (branchId) {
            const branchIdObj =
              branchId instanceof mongoose.Types.ObjectId
                ? branchId
                : new mongoose.Types.ObjectId(branchId);
            const exists = accessibleBranchIds.some(
              (id) => id.toString() === branchIdObj.toString(),
            );
            if (!exists) {
              accessibleBranchIds.push(branchIdObj);
            }
          }
        });
      }

      if (activeBranchId) {
        const activeBranchIdObj = new mongoose.Types.ObjectId(activeBranchId);
        // If a specific branch is selected, filter by that branch
        query.$or = [
          { branchId: activeBranchIdObj },
          { "branches.branchId": activeBranchIdObj },
        ];
      } else if (accessibleBranchIds.length > 0) {
        // Otherwise, show users in all accessible branches
        query.$or = [
          { branchId: { $in: accessibleBranchIds } },
          { "branches.branchId": { $in: accessibleBranchIds } },
        ];
      } else if (user.branchId) {
        // Fallback to primary branch
        const branchId =
          user.branchId instanceof mongoose.Types.ObjectId
            ? user.branchId
            : new mongoose.Types.ObjectId(user.branchId);
        query.$or = [{ branchId: branchId }, { "branches.branchId": branchId }];
      }
    }

    // Status filter
    if (status) query.status = status;

    // Role filter
    if (filterRoleId) {
      query.roleId = new mongoose.Types.ObjectId(filterRoleId);
    }

    // Search filter (name or email)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      // If there's already a $or in query (from branch filtering), we need to combine it with search
      if (query.$or) {
        const branchOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: branchOr },
          {
            $or: [{ name: searchRegex }, { email: searchRegex }],
          },
        ];
      } else {
        query.$or = [{ name: searchRegex }, { email: searchRegex }];
      }
    }

    // Sort logic
    let sortOption: any = { createdAt: -1 }; // Default: newest first
    if (sortBy === "name") {
      sortOption = { name: 1 }; // Sort by name ascending
    } else if (sortBy === "date") {
      sortOption = { createdAt: -1 }; // Sort by date descending (newest first)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortOption)
        .populate("roleId", "roleName roleCode")
        .populate("branchId", "branchName")
        .populate("branches.branchId", "branchName")
        .populate("branches.roleId", "roleName roleCode"),
      User.countDocuments(query),
    ]);

    return c.json(
      new ApiResponse(
        200,
        {
          users,
          meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
        "Users retrieved successfully",
      ),
    );
  }

  static async get(c: Context<{ Variables: Variables }>) {
    const user = c.get("user");
    const id = c.req.param("id");

    const fetchedUser = await User.findOne({ _id: id, tenantId: user.tenantId })
      .populate("roleId", "roleName roleCode")
      .populate("branchId", "branchName")
      .populate("branches.branchId", "branchName")
      .populate("branches.roleId", "_id roleName roleCode"); // Include _id so frontend can extract roleId

    if (!fetchedUser) {
      throw new ApiError(404, "User not found");
    }

    return c.json(new ApiResponse(200, fetchedUser, "User details retrieved"));
  }

  static async update(c: Context<{ Variables: Variables }>) {
    const user = c.get("user") as any;
    const id = c.req.param("id");
    const body = await c.req.json();

    // If updating password, hash it
    if (body.password) {
      body.passwordHash = await AuthService.hashPassword(body.password);
      delete body.password;
    }

    // Normalize branches payload (convert string IDs to ObjectId)
    if (body.branches && Array.isArray(body.branches)) {
      body.branches = body.branches.map((b: any) => {
        const branchId =
          b.branchId instanceof mongoose.Types.ObjectId
            ? b.branchId
            : new mongoose.Types.ObjectId(b.branchId);

        const roleId =
          b.roleId instanceof mongoose.Types.ObjectId
            ? b.roleId
            : new mongoose.Types.ObjectId(b.roleId);

        return {
          branchId,
          roleId,
          // permissions is stored as a plain object (Mixed) in schema; frontend already sends a Record<string, boolean>
          ...(b.permissions ? { permissions: b.permissions } : {}),
        };
      });
    }

    // PROTECTION: Prevent modifying SA user if current user is not SA
    const isSuperAdmin =
      user.roleName === "Super Admin" ||
      user.roleCode === "SA" ||
      user.roleId?.roleName === "Super Admin" ||
      user.roleId?.roleCode === "SA";
    if (!isSuperAdmin) {
      const targetUser = await User.findById(id).populate("roleId");
      if (targetUser && (targetUser.roleId as any).roleName === "Super Admin") {
        return c.json(
          {
            status: "error",
            message: "You are not authorized to modify a Super Admin user.",
          },
          403,
        );
      }
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        { _id: id, tenantId: user.tenantId },
        { $set: body },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new ApiError(404, "User not found");
      }

      return c.json(
        new ApiResponse(200, updatedUser, "User updated successfully"),
      );
    } catch (error: any) {
      console.error("User update error:", error);
      throw error;
    }
  }

  static async delete(c: Context<{ Variables: Variables }>) {
    const user = c.get("user") as any;
    const id = c.req.param("id");

    // PROTECTION: Prevent deleting SA user if current user is not SA
    const isSuperAdmin =
      user.roleName === "Super Admin" ||
      user.roleCode === "SA" ||
      user.roleId?.roleName === "Super Admin" ||
      user.roleId?.roleCode === "SA";
    if (!isSuperAdmin) {
      const targetUser = await User.findById(id).populate("roleId");
      if (targetUser && (targetUser.roleId as any).roleName === "Super Admin") {
        return c.json(
          new ApiResponse(
            403,
            null,
            "You are not authorized to delete a Super Admin user.",
          ),
          403,
        );
      }
    }

    // Soft delete
    const deletedUser = await User.findOneAndUpdate(
      { _id: id, tenantId: user.tenantId },
      { $set: { status: UserStatus.INACTIVE } },
      { new: true },
    );

    if (!deletedUser) {
      throw new ApiError(404, "User not found");
    }

    return c.json(new ApiResponse(200, null, "User deactivated successfully"));
  }
}
