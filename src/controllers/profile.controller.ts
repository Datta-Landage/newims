import { Context } from "hono";
import { User } from "../models";
import { AuthService } from "../services/auth.service";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

import { getUserModules } from "../utils/rbac";

export class ProfileController {
  static async getMe(c: Context) {
    const user = c.get("user");
    // user from context might be lean object or doc.
    // If from auth middleware (lean), it has _id.
    // If virtuals not applied on lean, userId is missing.
    const userId = user._id || user.userId;

    const fullUser = await User.findById(userId)
      .populate("roleId", "roleName roleCode modules") // Ensure modules are fetched
      .populate("branchId", "branchName")
      .populate("tenantId", "tenantName");

    if (!fullUser) {
      throw new ApiError(404, "User not found");
    }

    const modules = await getUserModules(fullUser);

    // Convert to object to attach modules manually if needed, or just return strict shape
    const userObj: any = fullUser.toJSON();
    userObj.modules = modules;

    return c.json(new ApiResponse(200, userObj, "Profile details fetched"));
  }

  static async changePassword(c: Context) {
    const user = c.get("user");
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new password are required");
    }

    const userId = user._id || user.userId;
    const dbUser = await User.findById(userId).select("+passwordHash");
    if (!dbUser) {
      throw new ApiError(404, "User not found");
    }

    // Verify current password
    // Verify current password
    const isValid = await AuthService.comparePassword(
      currentPassword,
      dbUser.passwordHash,
    );
    if (!isValid) {
      throw new ApiError(401, "Incorrect current password");
    }

    // Hash new password
    // Hash new password
    dbUser.passwordHash = await AuthService.hashPassword(newPassword);
    await dbUser.save();

    return c.json(new ApiResponse(200, null, "Password updated successfully"));
  }
}
