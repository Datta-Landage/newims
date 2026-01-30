import { z } from 'zod';

export const createPOSchema = z.object({
    vendorId: z.string().nullable().optional(),
    vendorName: z.string().nullable().optional(),
    deliveryDate: z.string().datetime().optional().nullable(),
    status: z.string().optional(),
    type: z.enum(['STANDARD', 'SPECIAL']).optional(),
    items: z.array(z.object({
        itemId: z.string().nullable().optional(),
        indentItemId: z.string().optional(), // deprecated in favor of indentLinks
        indentLinks: z.array(z.object({
            indentItemId: z.string(),
            quantity: z.number()
        })).optional(),
        name: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().min(0),
        taxRate: z.number().min(0).max(100).default(0),
    })).min(1),
});

export const approvePOSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']), // Assuming REJECTED might be needed, but docs say APPROVED. Strict: APPROVED.
});
