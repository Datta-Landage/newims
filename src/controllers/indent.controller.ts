import { Context } from 'hono';
import { IndentService, ApproveIndentService } from '../services';
import { Indent, IndentItem } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class IndentController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const branchId = c.get('branchId');
        const indent = await IndentService.createIndent(data, user, branchId);
        return c.json(new ApiResponse(201, indent, 'Indent created successfully'), 201);
    }

    static async approve(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.approveIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent approved successfully'));
    }

    static async reject(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.rejectIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent rejected successfully'));
    }

    static async cancel(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.cancelIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent cancelled successfully'));
    }

    static async list(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId');
        const { page = '1', limit = '20', status, startDate, endDate, eligibleForProcurement } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (branchId) query.branchId = branchId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.indentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        if (eligibleForProcurement === 'true') {
            // Find indents that have at least one item with pending PO qty
            // pendingPoQty = approvedQty (or requestedQty) - poQty
            const eligibleIndentIds = await IndentItem.find({
                $expr: {
                    $gt: [
                        {
                            $subtract: [
                                {
                                    $cond: {
                                        if: { $and: [{ $ne: ["$approvedQty", null] }, { $gt: ["$approvedQty", 0] }] },
                                        then: "$approvedQty",
                                        else: "$requestedQty"
                                    }
                                },
                                { $ifNull: ["$poQty", 0] }
                            ]
                        },
                        0
                    ]
                }
            }).distinct('indentId');

            // Add to query
            query._id = { $in: eligibleIndentIds };
            query.isPoRaised = false;
            // Ensure we only show Approved indents for procurement as per requirement
            if (!query.status) {
                query.status = 'APPROVED';
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const [indents, total] = await Promise.all([
            Indent.find(query)
                .sort({ indentDate: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('createdBy', 'name')
                .populate('workAreaId', 'name'),
            Indent.countDocuments(query),
        ]);

        const indentsWithItems = await Promise.all(indents.map(async (indent) => {
            const items = await IndentItem.find({ indentId: indent._id }).populate('itemId');
            return { ...indent.toJSON(), items };
        }));

        return c.json(new ApiResponse(200, {
            indents: indentsWithItems,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Indents retrieved successfully'));
    }

    static async issue(c: Context) {
        const user = c.get('user');
        const data = await c.req.json() as any;
        const branchId = c.get('branchId');
        const issue = await ApproveIndentService.createIssue(data, user, branchId);
        return c.json(new ApiResponse(201, issue, 'Issue created successfully'), 201);
    }

    static async getProcurementPool(c: Context) {
        const user = c.get('user');
        const { categoryId } = c.req.query();
        const items = await IndentService.getProcurementPool(user, { categoryId });
        return c.json(new ApiResponse(200, items, 'Procurement pool retrieved successfully'));
    }

    static async get(c: Context) {
        const user = c.get('user');
        const id = c.req.param('id');

        const indent = await Indent.findOne({ _id: id, tenantId: user.tenantId })
            .populate('workAreaId', 'name')
            .populate('createdBy', 'name');

        if (!indent) {
            throw new ApiError(404, 'Indent not found');
        }

        const items = await IndentItem.find({ indentId: indent._id }).populate('itemId');

        return c.json(new ApiResponse(200, { ...indent.toJSON(), items }, 'Indent retrieved successfully'));
    }

    static async updateItem(c: Context) {
        const user = c.get('user');
        const itemId = c.req.param('itemId');
        const data = await c.req.json();
        const item = await IndentService.updateItem(itemId, data, user);
        return c.json(new ApiResponse(200, item, 'Indent item updated successfully'));
    }

    static async deleteItem(c: Context) {
        const user = c.get('user');
        const itemId = c.req.param('itemId');
        await IndentService.deleteItem(itemId, user);
        return c.json(new ApiResponse(200, null, 'Indent item deleted successfully'));
    }
    static async issueStock(c: Context) {
        const user = c.get('user');
        const id = c.req.param('id');
        const data = await c.req.json();
        const branchId = c.get('branchId');

        const { sourceWorkAreaId, items } = data;
        const indent = await IndentService.issueStock(id, sourceWorkAreaId, items, user, branchId);

        return c.json(new ApiResponse(200, indent, 'Stock issued successfully'));
    }
}
