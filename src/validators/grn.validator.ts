import { z } from 'zod';

export const createGRNSchema = z.object({
    poId: z.string().optional(),
    soId: z.string().optional(),
    vendorInvoiceNo: z.string().min(1),
    vendorInvoiceDate: z.string().datetime().or(z.string()), // Accept ISO string
    goodsReceivedDate: z.string().datetime().or(z.string()).optional(),
    workAreaId: z.string().min(1),
    items: z.array(z.object({
        itemId: z.string().min(1),
        receivedQty: z.number().positive(),
        acceptedQty: z.number().min(0).optional(),
        rejectedQty: z.number().min(0).optional(),
        unitCost: z.number().min(0),
        taxAmount: z.number().min(0).default(0),
    })).min(1),
}).refine((data) => (data.poId && !data.soId) || (!data.poId && data.soId), {
    message: 'Must provide either poId or soId, but not both',
});

export const createRTVSchema = z.object({
    grnId: z.string().min(1),
    itemId: z.string().min(1),
    returnedQty: z.number().positive(),
});
