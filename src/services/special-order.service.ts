import { SpecialOrder, SpecialOrderStatus } from '../models';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export class SpecialOrderService {
    static async create(data: any, user: any, branchId: string) {
        // Basic Create
        const so = await SpecialOrder.create({
            tenantId: user.tenantId,
            branchId: branchId, // SA might pass branchId
            vendorId: data.vendorId,
            createdBy: user._id,
            soDate: data.soDate || new Date(),
            deliveryDate: data.deliveryDate,
            totalAmount: data.totalAmount || 0,
            status: SpecialOrderStatus.OPEN
        });
        return so;
    }

    static async list(tenantId: string, filters: any, pagination: { page: number, limit: number }) {
        const query: any = { tenantId };
        if (filters.branchId) query.branchId = filters.branchId;
        if (filters.status) query.status = filters.status;
        if (filters.startDate && filters.endDate) {
            query.soDate = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
        }

        const skip = (pagination.page - 1) * pagination.limit;

        const [items, total] = await Promise.all([
            SpecialOrder.find(query)
                .populate('vendorId', 'vendorName')
                .populate('branchId', 'branchName')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pagination.limit),
            SpecialOrder.countDocuments(query)
        ]);

        return { items, total };
    }

    static async approve(id: string, user: any) {
        const so = await SpecialOrder.findOne({ _id: id, tenantId: user.tenantId });
        if (!so) throw new ApiError(404, 'Special Order not found');

        if (so.status !== SpecialOrderStatus.OPEN) {
            throw new ApiError(400, 'Only OPEN orders can be approved');
        }

        // Logic: Approve.
        // Special Orders might not impact stock immediately or ever?
        // Assuming just status change for now.
        so.status = SpecialOrderStatus.APPROVED;
        so.approvedBy = user._id;
        await so.save();
        return so;
    }

    static async close(id: string, user: any) {
        const so = await SpecialOrder.findOne({ _id: id, tenantId: user.tenantId });
        if (!so) throw new ApiError(404, 'Special Order not found');

        if (so.status !== SpecialOrderStatus.APPROVED) {
            throw new ApiError(400, 'Only APPROVED orders can be closed');
        }

        so.status = SpecialOrderStatus.CLOSED;
        await so.save();
        return so;
    }
}
