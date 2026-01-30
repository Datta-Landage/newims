import { z } from 'zod';
import { CategoryStatus } from '../models';

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Category Name is required'),
    status: z.nativeEnum(CategoryStatus).default(CategoryStatus.ACTIVE),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1, 'Category Name is required').optional(),
    status: z.nativeEnum(CategoryStatus).optional(),
});
