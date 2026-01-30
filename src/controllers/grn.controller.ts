import { Context } from 'hono';
import { GRNService } from '../services';
import { GRN } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class GRNController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const branchId = c.get('branchId');
        const grn = await GRNService.createGRN(data, user, branchId);
        return c.json(new ApiResponse(201, grn, 'GRN created successfully'), 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId');
        const { page = '1', limit = '20', startDate, endDate, vendorInvoiceNo } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (branchId) query.branchId = branchId;
        if (vendorInvoiceNo) query.vendorInvoiceNo = { $regex: vendorInvoiceNo, $options: 'i' };
        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [grns, total] = await Promise.all([
            GRN.find(query)
                .sort({ goodsReceivedDate: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            GRN.countDocuments(query),
        ]);

        return c.json(new ApiResponse(200, {
            grns,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'GRNs retrieved successfully'));
    }

    static async getById(c: Context) {
        const user = c.get('user');
        const grnId = c.req.param('id');
        const grn = await GRNService.getGRNById(grnId, user);
        return c.json(new ApiResponse(200, grn, 'GRN details retrieved successfully'));
    }
}
