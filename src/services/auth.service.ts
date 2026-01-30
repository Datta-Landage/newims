
import jwt from 'jsonwebtoken';
import { User, Tenant, UserStatus, TenantStatus } from '../models';
import { Config } from '../config';
import { AppError } from '../utils/errors';
import mongoose from 'mongoose';
//
import { AuditLogService } from './audit-log.service';
import bcrypt from 'bcryptjs';
import { getUserModules } from '../utils/rbac';

export class AuthService {
    static async hashPassword(password: string): Promise<string> {
        if (typeof Bun !== 'undefined') {
            return await Bun.password.hash(password);
        }
        return await bcrypt.hash(password, 10);
    }

    static async comparePassword(plain: string, hashed: string): Promise<boolean> {
        if (typeof Bun !== 'undefined') {
            return await Bun.password.verify(plain, hashed);
        }
        return await bcrypt.compare(plain, hashed);
    }

    static generateTokens(user: any) {
        const accessToken = jwt.sign(
            {
                userId: user._id,
                tenantId: user.tenantId,
                roleId: user.roleId,
                branchId: user.branchId
            },
            Config.JWT_SECRET,
            { expiresIn: '1h' } // Increased from 15m to 1h for better UX
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            Config.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    static async login(tenantId: string, email: string, password: string) {
        // 1. Check Tenant
        const tenant = await Tenant.findOne({ _id: tenantId, status: TenantStatus.ACTIVE });
        if (!tenant) {
            throw new AppError('Tenant not found or inactive', 404);
        }

        // 2. Check User in Tenant (without status filter first to check status separately)
        const user = await User.findOne({
            tenantId,
            email: email.toLowerCase()
        });

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // 3. Check User Status
        if (user.status !== UserStatus.ACTIVE) {
            throw new AppError('Your account has been deactivated. Please contact your administrator.', 403);
        }

        // 4. Check Password
        const isMatch = await this.comparePassword(password, user.passwordHash);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        // 5. Generate Tokens
        const tokens = this.generateTokens(user);

        // 6. Get Modules
        const modules = await getUserModules(user);

        // 7. Audit Log
        await AuditLogService.log({
            action: 'USER_LOGIN',
            entity: 'User',
            entityId: user._id,
            performedBy: user._id,
            details: {
                userAgent: 'Web Client', // In future pass from controller
                ipByPass: true
            },
            tenantId: user.tenantId,
            branchId: user.branchId || undefined
        });

        return { user, tokens, modules };
    }

    static async refreshAccessToken(refreshToken: string) {
        try {
            const decoded = jwt.verify(refreshToken, Config.JWT_REFRESH_SECRET) as any;
            const user = await User.findById(decoded.userId);

            if (!user || user.status !== UserStatus.ACTIVE) {
                throw new AppError('User not found or inactive', 401);
            }

            const tokens = this.generateTokens(user);
            return tokens;
        } catch (error) {
            throw new AppError('Invalid refresh token', 401);
        }
    }
}
