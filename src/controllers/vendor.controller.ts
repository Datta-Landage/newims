import { Context } from 'hono';
import { Vendor, VendorStatus } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Variables } from '../types';
import { generateDisplayId } from '../utils/sequence-generator';

export class VendorController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const body = await c.req.json();

        const vendor = await Vendor.create({
            ...body,
            tenantId: user.tenantId,
            displayId: await generateDisplayId('VN'),
        });

        return c.json(new ApiResponse(201, vendor, 'Vendor created successfully'), 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { page = '1', limit = '20', search } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (search) {
            query.vendorName = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [vendors, total] = await Promise.all([
            Vendor.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ vendorName: 1 }),
            Vendor.countDocuments(query),
        ]);

        return c.json(new ApiResponse(200, {
            vendors,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Vendors retrieved successfully'));
    }

    static async get(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        const vendor = await Vendor.findOne({ _id: id, tenantId: user.tenantId });

        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        return c.json(new ApiResponse(200, vendor, 'Vendor retrieved successfully'));
    }

    static async update(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const body = await c.req.json();

        const updatedVendor = await Vendor.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedVendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        return c.json(new ApiResponse(200, updatedVendor, 'Vendor updated successfully'));
    }

    static async delete(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        // Soft delete
        const deletedVendor = await Vendor.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: { status: VendorStatus.INACTIVE } },
            { new: true }
        );

        if (!deletedVendor) {
            return c.json({ status: 'error', message: 'Vendor not found' }, 404);
        }

        return c.json({ status: 'success', message: 'Vendor deactivated successfully' });
    }
}
