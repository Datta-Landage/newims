
import {
    InventoryStock, GRN, Indent, PurchaseOrder, Issue, Item, Vendor, WorkArea, RTV
} from '../../models';
import mongoose from 'mongoose';

export class ReportDataService {

    static async getLiveStockData(tenantId: string, branchId?: string) {
        const query: any = { tenantId };
        if (branchId) query.branchId = branchId;

        const [stock, workAreas] = await Promise.all([
            InventoryStock.find(query)
                .populate({
                    path: 'itemId',
                    populate: [{ path: 'categoryId', select: 'name' }]
                })
                .populate('branchId', 'branchName')
                .populate('workAreaId', 'name'),
            WorkArea.find({ tenantId, status: 'ACTIVE' }).select('name')
        ]);

        const activeWorkAreaNames = Array.from(new Set(workAreas.map(wa => wa.name.trim().toUpperCase())));
        const groupedData: Record<string, any> = {};

        stock.forEach((s: any) => {
            const item = s.itemId;
            const branch = s.branchId;
            if (!item || !branch) return;

            const key = `${item._id}_${branch._id} `;
            if (!groupedData[key]) {
                const unitCost = item.unitCost || 0;
                const taxRate = item.taxRate || 0;
                const wac = unitCost + (unitCost * taxRate / 100);

                groupedData[key] = {
                    branch: branch.branchName || 'N/A',
                    category: item.categoryId?.name || 'N/A',
                    hsnCode: item.hsnCode || '-',
                    itemCode: item.itemCode || 'N/A',
                    itemName: item.itemName || 'N/A',
                    entryType: (item.packageDetails?.length > 0) ? 'package' : 'open',
                    uom: item.inventoryUom || 'N/A',
                    taxRate: taxRate,
                    wac: wac,
                    qty_store: 0,
                    total_store: 0,
                    totalStock: 0,
                    grandTotal: 0
                };

                // Pre-initialize work area columns
                activeWorkAreaNames.forEach(wa => {
                    groupedData[key][`qty_${wa} `] = 0;
                    groupedData[key][`total_${wa} `] = 0;
                });
            }

            const row = groupedData[key];
            const qty = s.quantityInStock || 0;
            const total = qty * row.wac;
            const waName = (s.workAreaId?.name || '').toUpperCase().trim();

            if (!s.workAreaId || waName === 'STORE') {
                row.qty_store += qty;
                row.total_store += total;
            } else if (activeWorkAreaNames.includes(waName)) {
                row[`qty_${waName} `] += qty;
                row[`total_${waName} `] += total;
            }

            row.totalStock += qty;
            row.grandTotal += total;
        });

        const dataRows = Object.values(groupedData).map((item, index) => ({ ...item, sNo: index + 1 }));

        return { data: dataRows, workAreas: activeWorkAreaNames };
    }

    static async getIndentIssueData(tenantId: string, branchId?: string, startDate?: string, endDate?: string) {
        // 1. Fetch Explicit Issue Logs (New System)
        const issueQuery: any = { tenantId, type: 'ISSUANCE' };
        if (branchId) issueQuery.branchId = branchId;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            issueQuery.issueDate = { $gte: start, $lte: end };
        }

        const issues = await Issue.find(issueQuery)
            .populate('branchId', 'branchName')
            .populate('issuedBy', 'name')
            .populate({
                path: 'indentId',
                populate: [
                    { path: 'workAreaId', select: 'name' },
                    { path: 'createdBy', select: 'name' }
                ]
            })
            .populate({
                path: 'items.itemId',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'subCategoryId', select: 'name' }
                ]
            })
            .populate('items.indentItemId');

        // 2. Fetch Indents with potential Legacy Issuances (No logs)
        const indentQuery: any = {
            tenantId,
            status: { $in: ['ISSUED', 'PARTIALLY_ISSUED', 'APPROVED', 'CLOSED'] }
        };
        if (branchId) indentQuery.branchId = branchId;
        if (startDate && endDate) {
            // Ensure end date covers the full day
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // approximation: if updated within range. 
            indentQuery.updatedAt = { $gte: start, $lte: end };
        }

        const indents = await Indent.find(indentQuery)
            .populate('branchId', 'branchName')
            .populate({
                path: 'items',
                populate: {
                    path: 'itemId',
                    populate: [
                        { path: 'categoryId', select: 'name' },
                        { path: 'subCategoryId', select: 'name' }
                    ]
                }
            })
            .populate('workAreaId', 'name')
            .populate('createdBy', 'name');

        const flattenedRows: any[] = [];
        let sNo = 1;

        const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });

        const processedIndentItemMap: Record<string, number> = {}; // Track how much qty we've accounted for via logs

        // Pass 1: Process Logs
        issues.forEach((issue: any) => {
            const indent: any = issue.indentId;
            if (!indent) return;

            (issue.items || []).forEach((issueItem: any) => {
                const item = issueItem.itemId;
                const indentItem = issueItem.indentItemId;
                if (!item) return;

                const issuedQty = issueItem.quantity || 0;

                // Track processed qty
                // Use a composite key of indentId + itemId to track unique items within an indent
                const key = `${indent._id.toString()}_${item._id.toString()} `;
                processedIndentItemMap[key] = (processedIndentItemMap[key] || 0) + issuedQty;

                // Calc stats
                const unitCost = indentItem?.unitPrice || item.unitCost || 0;
                const taxRate = item.taxRate || 0;
                const taxAmount = (unitCost * taxRate) / 100;
                const wac = unitCost + taxAmount;
                const total = issuedQty * wac;

                const reqDate = indent.requiredDate ? new Date(indent.requiredDate) : new Date(indent.indentDate);
                const issDate = new Date(issue.issueDate);

                flattenedRows.push({
                    sNo: sNo++,
                    location: issue.branchId?.branchName || 'N/A',
                    workArea: indent.workAreaId?.name || 'N/A',
                    createdBy: indent.createdBy?.name || 'N/A',
                    displayId: indent.displayId || 'N/A',
                    requiredDate: reqDate,
                    requestedTime: formatTime(reqDate),
                    issueDate: issDate,
                    issueTime: formatTime(issDate),
                    indentDate: indent.indentDate,
                    category: item.categoryId?.name || 'N/A',
                    subCategory: item.subCategoryId?.name || 'N/A',
                    hsnCode: item.hsnCode || '-',
                    itemCode: item.itemCode || 'N/A',
                    itemName: item.itemName || 'N/A',
                    entryType: indent.entryType || 'OPEN',
                    pkgName: item.packageDetails?.[0]?.name || '-',
                    taxRate: taxRate,
                    requestedQty: indentItem?.requestedQty || 0,
                    issuedQty: issuedQty,
                    pendingQty: indentItem?.pendingQty || 0,
                    wac: parseFloat(wac.toFixed(2)),
                    total: parseFloat(total.toFixed(2)),
                    status: indent.status,
                    indentType: indent.entryType === 'PACKAGE' ? 'Package Issue' : 'Direct Issue',
                    itemRemark: indentItem?.remarks || '-',
                    indentRemark: indent.remarks || '-'
                });
            });
        });

        // Pass 2: Process Legacy / Un-logged portions from Indents
        indents.forEach((indent: any) => {
            (indent.items || []).forEach((itemLine: any) => {
                const item = itemLine.itemId;
                if (!item) return;

                const totalIssued = itemLine.issuedQty || 0;
                if (totalIssued <= 0) return;

                const key = `${indent._id.toString()}_${item._id.toString()} `;
                const loggedQty = processedIndentItemMap[key] || 0;
                const remainingLegacyQty = totalIssued - loggedQty;

                if (remainingLegacyQty > 0.001) { // Floating point tolerance
                    // This is a legacy issue event
                    const unitCost = itemLine.unitPrice || item.unitCost || 0;
                    const taxRate = item.taxRate || 0;
                    const taxAmount = (unitCost * taxRate) / 100;
                    const wac = unitCost + taxAmount;
                    const total = remainingLegacyQty * wac;

                    const reqDate = indent.requiredDate ? new Date(indent.requiredDate) : new Date(indent.indentDate);
                    // Use updatedAt as proxy for Issue Date for historical records
                    const issDate = new Date(indent.updatedAt);

                    flattenedRows.push({
                        sNo: sNo++,
                        location: indent.branchId?.branchName || 'N/A',
                        workArea: indent.workAreaId?.name || 'N/A',
                        createdBy: indent.createdBy?.name || 'N/A',
                        displayId: indent.displayId || 'N/A',
                        requiredDate: reqDate,
                        requestedTime: formatTime(reqDate),
                        issueDate: issDate,
                        issueTime: formatTime(issDate),
                        indentDate: indent.indentDate,
                        category: item.categoryId?.name || 'N/A',
                        subCategory: item.subCategoryId?.name || 'N/A',
                        hsnCode: item.hsnCode || '-',
                        itemCode: item.itemCode || 'N/A',
                        itemName: item.itemName || 'N/A',
                        entryType: indent.entryType || 'OPEN',
                        pkgName: item.packageDetails?.[0]?.name || '-',
                        taxRate: taxRate,
                        requestedQty: itemLine.requestedQty || 0,
                        issuedQty: parseFloat(remainingLegacyQty.toFixed(2)),
                        pendingQty: itemLine.pendingQty || 0,
                        wac: parseFloat(wac.toFixed(2)),
                        total: parseFloat(total.toFixed(2)),
                        status: indent.status,
                        indentType: indent.entryType === 'PACKAGE' ? 'Package Issue. (L)' : 'Direct Issue (Legacy)',
                        itemRemark: itemLine.remarks || '-',
                        indentRemark: indent.remarks || '-'
                    });
                }
            });
        });

        return flattenedRows.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
    }

    static async getSupplierItemPurchaseData(tenantId: string, branchId?: string, startDate?: string, endDate?: string) {
        const query: any = { tenantId };
        if (branchId) query.branchId = branchId;
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: end };
        }

        const grns = await GRN.find(query)
            .populate({
                path: 'poId',
                select: 'displayId createdAt totalAmount status vendorId items branchId',
                populate: [
                    { path: 'vendorId', select: 'vendorName' },
                    { path: 'branchId', select: 'branchName' },
                    { path: 'items' } // Populate virtual items
                ]
            })
            .populate({
                path: 'items',
                populate: {
                    path: 'itemId',
                    populate: { path: 'packageDetails' }
                }
            })
            .sort({ goodsReceivedDate: 1 });

        const vendorGroups: Record<string, any[]> = {};

        grns.forEach((grn: any) => {
            // Vendor name can come from populated vendorId or the snapshot vendorName on PO
            const vendorName = grn.poId?.vendorId?.vendorName || grn.poId?.vendorName || 'Unknown Vendor';
            if (!vendorGroups[vendorName]) vendorGroups[vendorName] = [];

            (grn.items || []).forEach((item: any) => {
                const itemDetail = item.itemId;
                // Find matching item in PO to get requested quantity
                const poItem = (grn.poId as any)?.items?.find((pi: any) =>
                    pi.itemId?.toString() === item.itemId?._id?.toString() ||
                    pi.itemId?.toString() === item.itemId?.toString() ||
                    pi.name === itemDetail?.itemName
                );

                const requestedQty = poItem?.quantity || 0;
                const receivedQty = item.receivedQty || 0;
                const pendingQty = Math.max(0, requestedQty - receivedQty);
                const unitPrice = item.unitCost || 0;
                const subTotal = receivedQty * unitPrice;
                const taxRate = itemDetail?.taxRate || 0;
                const taxAmount = item.taxAmount || (subTotal * taxRate / 100);

                vendorGroups[vendorName].push({
                    grnNo: grn.displayId,
                    poNo: grn.poId?.displayId || '-',
                    itemCode: (itemDetail?.itemCode && itemDetail?.packageDetails?.[0]?.name)
                        ? `${itemDetail.itemCode}| ${itemDetail.packageDetails[0].name} `
                        : (itemDetail?.itemCode || 'N/A'),
                    hsnCode: itemDetail?.hsnCode || '-',
                    itemName: itemDetail?.itemName || 'N/A',
                    packageName: itemDetail?.packageDetails?.[0]?.name || '-',
                    requestedQty,
                    receivedQty,
                    pendingQty,
                    unitPrice,
                    taxRate,
                    subTotal,
                    taxAmount,
                    otherCharges: 0,
                    totalPrice: subTotal + taxAmount
                });
            });
        });

        return Object.entries(vendorGroups).map(([vendorName, items]) => ({
            vendorName,
            items: items.map((it, idx) => ({ ...it, sNo: idx + 1 }))
        }));
    }

    static async getConsolidatedData(tenantId: string, branchId?: string, startDate?: string, endDate?: string) {
        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.$gte = new Date(startDate);
            dateFilter.$lte = new Date(endDate);
        }

        const poQuery: any = { tenantId };
        if (branchId) poQuery.branchId = branchId;
        if (startDate) poQuery.createdAt = dateFilter;

        const indentQuery: any = { tenantId };
        if (branchId) indentQuery.branchId = branchId;
        if (startDate) indentQuery.createdAt = dateFilter;

        const [pos, indents] = await Promise.all([
            PurchaseOrder.find(poQuery)
                .populate('branchId', 'branchName')
                .populate({
                    path: 'items',
                    populate: {
                        path: 'itemId',
                        populate: [
                            { path: 'categoryId', select: 'name' },
                            { path: 'subCategoryId', select: 'name' }
                        ]
                    }
                }),
            Indent.find(indentQuery)
                .populate('branchId', 'branchName')
                .populate({
                    path: 'items',
                    populate: {
                        path: 'itemId',
                        populate: [
                            { path: 'categoryId', select: 'name' },
                            { path: 'subCategoryId', select: 'name' }
                        ]
                    }
                })
        ]);

        const combined: any[] = [];

        pos.forEach((po: any) => {
            (po.items || []).forEach((item: any) => {
                const itemDetail = item.itemId;
                const unitCost = item.unitCost || 0;
                const taxRate = item.taxRate || 0;
                const taxPerUnit = (unitCost * taxRate) / 100;
                const wacInclTax = unitCost + taxPerUnit;
                const totalExclTax = item.totalPrice || (unitCost * item.quantity);
                const totalTaxAmount = (totalExclTax * taxRate) / 100;

                combined.push({
                    date: po.createdAt,
                    type: 'Purchase Order',
                    displayId: po.displayId,
                    location: po.branchId?.branchName || 'N/A',
                    category: itemDetail?.categoryId?.name || 'N/A',
                    hsnCode: itemDetail?.hsnCode || '-',
                    itemCode: itemDetail?.itemCode || 'N/A',
                    itemName: itemDetail?.itemName || item.name,
                    wac: wacInclTax,
                    avgCost: unitCost,
                    orderedQty: item.quantity,
                    receivedQty: item.quantity,
                    totalExclTax: totalExclTax,
                    taxAmount: totalTaxAmount,
                    totalInclTax: totalExclTax + totalTaxAmount
                });
            });
        });

        indents.forEach((ind: any) => {
            (ind.items || []).forEach((item: any) => {
                const itemDetail = item.itemId;
                const unitCost = itemDetail?.unitCost || 0;
                const taxRate = itemDetail?.taxRate || 0;
                const taxPerUnit = (unitCost * taxRate) / 100;
                const totalExclTax = (item.requestedQty || 0) * unitCost;

                combined.push({
                    date: ind.createdAt,
                    type: 'Indent',
                    displayId: ind.displayId,
                    location: ind.branchId?.branchName || 'N/A',
                    category: itemDetail?.categoryId?.name || 'N/A',
                    hsnCode: itemDetail?.hsnCode || '-',
                    itemCode: itemDetail?.itemCode || 'N/A',
                    itemName: itemDetail?.itemName || 'N/A',
                    wac: unitCost + taxPerUnit,
                    avgCost: unitCost,
                    orderedQty: item.requestedQty || 0,
                    receivedQty: 0,
                    totalExclTax: totalExclTax,
                    taxAmount: 0,
                    totalInclTax: totalExclTax
                });
            });
        });

        return combined
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((item, index) => ({ ...item, sNo: index + 1 }));
    }

    static async getPOStatusData(tenantId: string, branchId?: string, status?: string, startDate?: string, endDate?: string) {
        const query: any = { tenantId };
        if (branchId) query.branchId = branchId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const pos = await PurchaseOrder.find(query)
            .populate('vendorId', 'vendorName displayId')
            .populate('branchId', 'branchName')
            .populate('createdBy', 'name');

        // Fetch GRNs for these POs
        const poIds = pos.map(po => po._id);
        const grns = await GRN.find({ poId: { $in: poIds } }).select('displayId goodsReceivedDate poId');

        const grnMap: Record<string, any[]> = {};
        grns.forEach((grn: any) => {
            const pid = grn.poId.toString();
            if (!grnMap[pid]) grnMap[pid] = [];
            grnMap[pid].push(grn);
        });

        // Flatten logic: 1 PO row per GRN, or 1 row if no GRN
        const rows: any[] = [];
        let sNo = 1;

        const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });

        pos.forEach((po: any) => {
            const poGrns = grnMap[po._id.toString()] || [];

            if (poGrns.length === 0) {
                rows.push({
                    sNo: sNo++,
                    location: po.branchId?.branchName || 'N/A',
                    vendorId: (po.vendorId as any)?.displayId || 'N/A',
                    vendorName: (po.vendorId as any)?.vendorName || po.vendorName || 'N/A',
                    displayId: po.displayId,
                    createdBy: po.createdBy?.name || 'N/A',
                    createdAtDate: po.createdAt,
                    createdAtTime: formatTime(po.createdAt),
                    deliveryDate: po.deliveryDate,
                    grnId: '-',
                    grnDate: null,
                    status: po.status
                });
            } else {
                poGrns.forEach(grn => {
                    rows.push({
                        sNo: sNo++,
                        location: po.branchId?.branchName || 'N/A',
                        vendorId: (po.vendorId as any)?.displayId || 'N/A',
                        vendorName: (po.vendorId as any)?.vendorName || po.vendorName || 'N/A',
                        displayId: po.displayId,
                        createdBy: po.createdBy?.name || 'N/A',
                        createdAtDate: po.createdAt,
                        createdAtTime: formatTime(po.createdAt),
                        deliveryDate: po.deliveryDate,
                        grnId: grn.displayId,
                        grnDate: grn.goodsReceivedDate,
                        status: po.status
                    });
                });
            }
        });

        return rows.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
    }

    static async getInvoiceSummaryData(tenantId: string, branchId?: string, startDate?: string, endDate?: string, vendorId?: string) {
        const query: any = { tenantId };
        if (branchId) query.branchId = branchId;
        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        let grns = await GRN.find(query)
            .populate({
                path: 'poId',
                select: 'vendorId status',
                populate: { path: 'vendorId', select: 'displayId vendorName' }
            })
            .populate('branchId', 'branchName')
            .populate({
                path: 'items',
                select: 'receivedQty unitCost taxAmount totalAmount'
            });

        if (vendorId) {
            grns = grns.filter((g: any) => g.poId?.vendorId?._id.toString() === vendorId);
        }

        // Fetch RTVs for these GRNs
        const grnIds = grns.map(g => g._id);
        const rtvs = await RTV.find({
            tenantId,
            grnId: { $in: grnIds },
            status: 'APPROVED'
        }).select('grnId totalAmount');

        const rtvMap: Record<string, number> = {};
        rtvs.forEach((rtv: any) => {
            const gid = rtv.grnId.toString();
            rtvMap[gid] = (rtvMap[gid] || 0) + rtv.totalAmount;
        });

        return grns.map((g: any, index: number) => {
            const cnAmount = rtvMap[g._id.toString()] || 0;

            let totalExclTax = 0;
            let totalTax = 0;

            (g.items || []).forEach((item: any) => {
                totalExclTax += (item.receivedQty * item.unitCost);
                totalTax += item.taxAmount;
            });

            // Fallback if virtual items are not loaded or empty but totalAmount exists
            const totalInclTax = g.totalAmount || (totalExclTax + totalTax);

            return {
                sNo: index + 1,
                location: g.branchId?.branchName || 'N/A',
                vendorId: (g.poId?.vendorId as any)?.displayId || 'N/A',
                vendorName: (g.poId?.vendorId as any)?.vendorName || 'N/A',
                invoiceNo: g.vendorInvoiceNo,
                grnSystemDate: g.createdAt,
                goodsReceivedDate: g.goodsReceivedDate,
                vendorInvoiceDate: g.vendorInvoiceDate,
                grnId: g.displayId,
                totalExclTax: totalExclTax,
                taxAmount: totalTax,
                otherCharges: 0,
                creditNoteAmount: cnAmount,
                totalInclTax: totalInclTax,
                transportation: 0,
                labour: 0,
                grandTotal: totalInclTax - cnAmount,
                status: 'completed'
            };
        });
    }
}
