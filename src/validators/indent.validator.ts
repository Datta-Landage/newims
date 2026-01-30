import { z } from 'zod';

export const createIndentSchema = z.object({
    workAreaId: z.string().min(1),
    items: z.array(z.object({
        itemId: z.string().min(1),
        requestedQty: z.number().positive(),
    })).min(1),
});

export const issueIndentSchema = z.object({
    indentId: z.string().min(1),
    sourceWorkAreaId: z.string().optional(),
    // Issue usually involves confirming items.
    // Docs say: Created by SM user from APPROVED indent.
    // Maybe explicit items to issue if partial?
    // Docs: "Updates IndentItem.issuedQty".
    // Assuming full issue or based on input.
    // Let's assume input maps itemId -> quantity Issued.
    items: z.array(z.object({
        indentItemId: z.string().min(1),
        issuedQty: z.number().min(0),
    })).optional(),
});
