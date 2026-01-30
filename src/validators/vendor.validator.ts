import { z } from 'zod';
import { VendorStatus } from '../models';

export const createVendorSchema = z.object({
    vendorName: z.string().min(1, 'Vendor Name is required'),
    gstNo: z.string().optional().nullable(),
    panNo: z.string().optional().nullable(),
    contactDetails: z.object({
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
    }).optional(),
    status: z.nativeEnum(VendorStatus).default(VendorStatus.ACTIVE),
});

export const updateVendorSchema = z.object({
    vendorName: z.string().optional(),
    gstNo: z.string().optional().nullable(),
    panNo: z.string().optional().nullable(),
    contactDetails: z.object({
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
    }).optional(),
    status: z.nativeEnum(VendorStatus).optional(),
});
