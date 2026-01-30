import { z } from 'zod';
import { ItemStatus } from '../models';

export const createItemSchema = z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    // subCategoryId: z.string().min(1, 'SubCategory ID is required'),
    itemCode: z.string().min(1, 'Item Code is required'),
    itemName: z.string().min(1, 'Item Name is required'),
    hsnCode: z.string().optional().nullable(),
    inventoryUom: z.string().min(1, 'UOM is required'),
    unitCost: z.number().min(0).default(0),
    taxRate: z.number().min(0).max(100).default(0),
    status: z.nativeEnum(ItemStatus).default(ItemStatus.ACTIVE),

    // Optional Fields
    ledger: z.string().optional(),
    classification: z.string().optional(),
    yield: z.number().optional(),
    weight: z.number().optional(),
    leadTime: z.number().optional(),
    packageDetails: z.array(z.object({
        name: z.string().optional(),
        brand: z.string().optional(),
        qty: z.number().optional(),
        price: z.number().optional(),
        parLevel: z.number().optional()
    })).optional(),
});

export const updateItemSchema = z.object({
    categoryId: z.string().optional(),
    // subCategoryId: z.string().optional(),
    itemCode: z.string().optional(),
    itemName: z.string().optional(),
    hsnCode: z.string().optional().nullable(),
    inventoryUom: z.string().optional(),
    unitCost: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    status: z.nativeEnum(ItemStatus).optional(),
});
