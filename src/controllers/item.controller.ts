import { Context } from 'hono';
import { Item, ItemStatus, Category } from '../models';
import { Variables } from '../types';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { generateDisplayId } from '../utils/sequence-generator';

export class ItemController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const {
            itemCode, itemName, categoryId, subCategoryId, inventoryUom,
            unitCost, taxRate, status, classification, hsnCode,
            yield: yieldVal, weight, leadTime, packageDetails
        } = await c.req.json();

        // Check if category exists
        const category = await Category.findOne({ _id: categoryId, tenantId: user.tenantId });
        if (!category) throw new ApiError(404, 'Category not found');

        const item = await Item.create({
            tenantId: user.tenantId,
            displayId: await generateDisplayId('IT'),
            itemCode,
            itemName,
            categoryId,
            subCategoryId,
            inventoryUom,
            unitCost,
            taxRate,
            status,
            classification,
            hsnCode,
            yield: yieldVal,
            weight,
            leadTime,
            packageDetails
        });

        return c.json(new ApiResponse(201, item, 'Item created successfully'), 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { page = '1', limit = '20', search, categoryId } = c.req.query();

        const query: any = { tenantId: user.tenantId };

        // Determine Branch Context
        const branchId = c.get('branchId');

        // Filter by Branch (via Categories)
        if (branchId) {
            // Find all categories for this branch
            const { Category } = await import('../models');
            const categories = await Category.find({ tenantId: user.tenantId, branchId }).select('_id');
            const categoryIds = categories.map(cat => cat._id);

            // If specific category requested, ensure it belongs to this branch
            if (categoryId) {
                if (!categoryIds.some(id => id.toString() === categoryId)) {
                    // The requested category is not in this branch -> return empty
                    return c.json(new ApiResponse(200, {
                        items: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
                    }, 'No items found for the requested category/branch'));
                }
                query.categoryId = categoryId;
            } else {
                // Filter items by these categories
                if (categoryIds.length > 0) {
                    query.categoryId = { $in: categoryIds };
                } else {
                    // No categories in branch -> No items
                    return c.json(new ApiResponse(200, {
                        items: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
                    }, 'No items found for the requested category/branch'));
                }
            }
        } else {
            // No Branch Context (SA Global View): Allow filtering by specific category if provided
            if (categoryId) query.categoryId = categoryId;
        }

        if (search) {
            query.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { itemCode: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            Item.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ itemName: 1 })
                .populate('categoryId', 'name')
                .lean(), // Use lean for easier modification
            Item.countDocuments(query),
        ]);

        // Aggregate Stock
        const { InventoryStock } = await import('../models');
        const itemIds = items.map(i => i._id);

        // Build stock query
        const stockQuery: any = {
            tenantId: user.tenantId,
            itemId: { $in: itemIds }
        };

        // If context is specific to a branch, only fetch stock for that branch
        // Otherwise (Global view), we sum up stock across all branches potentially? 
        // For now, let's respect appropriate branch context if available.
        if (branchId) {
            stockQuery.branchId = branchId;
        }

        // Filter stock by Work Area if provided
        const { workAreaId } = c.req.query();
        if (workAreaId && workAreaId !== 'All') {
            stockQuery.workAreaId = workAreaId;
        }

        const stocks = await InventoryStock.find(stockQuery);

        // Map stock to items
        const itemsWithStock = items.map((item: any) => {
            // Filter stocks for this item
            const itemStocks = stocks.filter(s => s.itemId.toString() === item._id.toString());
            // Sum quantity
            const totalStock = itemStocks.reduce((sum, s) => sum + s.quantityInStock, 0);

            return {
                ...item,
                itemId: item._id, // Ensure itemId is present as virtuals don't run on lean()
                stock: totalStock
            };
        });

        return c.json(new ApiResponse(200, {
            items: itemsWithStock,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Items retrieved successfully'));
    }

    static async get(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        const item = await Item.findOne({ _id: id, tenantId: user.tenantId }).populate('categoryId', 'name');

        if (!item) {
            throw new ApiError(404, 'Item not found');
        }

        return c.json(new ApiResponse(200, item, 'Item retrieved successfully'));
    }

    static async update(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const updates = await c.req.json();

        if (updates.categoryId) {
            const category = await Category.findOne({ _id: updates.categoryId, tenantId: user.tenantId });
            if (!category) throw new ApiError(404, 'Category not found');
        }

        const item = await Item.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            updates,
            { new: true }
        ).populate('categoryId', 'name');

        if (!item) throw new ApiError(404, 'Item not found');

        return c.json(new ApiResponse(200, item, 'Item updated successfully'));
    }

    static async delete(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        // Soft delete
        const deletedItem = await Item.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: { status: ItemStatus.INACTIVE } },
            { new: true }
        );

        if (!deletedItem) {
            return c.json({ status: 'error', message: 'Item not found' }, 404);
        }

        return c.json({ status: 'success', message: 'Item deactivated successfully' });
    }
}
