import { z } from 'zod';
import { BranchStatus } from '../models/branch.model';

export const createBranchSchema = z.object({
    branchName: z.string().min(1, 'Branch Name is required'),
    location: z.string().default('Main Office'),
    status: z.nativeEnum(BranchStatus).default(BranchStatus.ACTIVE),
});

export const updateBranchSchema = z.object({
    branchName: z.string().min(1, 'Branch Name is required').optional(),
    location: z.string().optional(),
    status: z.nativeEnum(BranchStatus).optional(),
});
