import { z } from 'zod';
import { UserStatus } from '../models';

export const createUserSchema = z.object({
    roleId: z.string().min(1, 'Role ID is required'),
    branchId: z.string().optional().nullable(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
    branches: z.array(z.object({
        branchId: z.string(),
        roleId: z.string(),
        modules: z.array(z.string()).optional(),
        permissions: z.record(z.string(), z.boolean()).optional(),
    })).optional(),
});

export const updateUserSchema = z.object({
    roleId: z.string().optional(),
    branchId: z.string().optional().nullable(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    branches: z.array(z.object({
        branchId: z.string(),
        roleId: z.string(),
        modules: z.array(z.string()).optional(),
        permissions: z.record(z.string(), z.boolean()).optional(), // Keep for backward compatibility if needed, or remove
    })).optional(),
});
