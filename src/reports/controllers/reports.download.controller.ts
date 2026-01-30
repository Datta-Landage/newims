import { Context } from 'hono';
import { ExcelService } from '../excel/excel.service';
import { ReportDataService } from '../services/report-data.service';
import { Branch, WorkArea, Tenant } from '../../models';
import { stockColumns } from '../columns/stock.columns';
import { supplierPurchaseColumns } from '../columns/supplierPurchase.columns';
import { indentIssueColumns } from '../columns/indentIssue.columns';
import { consolidatedColumns } from '../columns/consolidated.columns';
import { poStatusColumns } from '../columns/poStatus.columns';
import { invoiceSummaryColumns } from '../columns/invoiceSummary.columns';

export class ReportsDownloadController {

    private static async handleDownload(c: Context, title: string, columns: any, data: any[], filters?: any, headerLines?: string[]) {
        const workbook = await ExcelService.generateExcelReport({
            title,
            columns,
            rows: data,
            filters,
            headerLines
        });

        const buffer = await workbook.xlsx.writeBuffer();

        c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        c.header('Content-Disposition', `attachment; filename=${title.replace(/\s+/g, '_')}.xlsx`);

        return c.body(buffer as any);
    }

    private static async getBranchName(branchId: string | undefined): Promise<string> {
        if (!branchId || branchId === 'undefined' || branchId === 'All') return 'All Branches';
        const branch = await Branch.findById(branchId);
        return branch ? branch.branchName : 'Unknown Branch';
    }

    private static async getWorkAreaName(workAreaId: string | undefined): Promise<string> {
        if (!workAreaId || workAreaId === 'undefined' || workAreaId === 'All') return 'All Work Areas';
        const wa = await WorkArea.findById(workAreaId);
        return wa ? wa.name : 'Unknown Work Area';
    }

    private static async getTenantName(tenantId: string): Promise<string> {
        const tenant = await Tenant.findById(tenantId);
        return tenant ? tenant.tenantName : 'IMS SYSTEM';
    }

    private static formatReportTimestamp(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const hStr = String(hours).padStart(2, '0');
        return `${day}-${month}-${year}/${hStr}:${minutes}_${ampm}`;
    }

    private static formatRangeDate(dateStr: string | undefined): string {
        if (!dateStr) return 'ALL';
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
    }

    // 1. Live Stock
    static async downloadLiveStock(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { workAreaId } = c.req.query();

        const [{ data, workAreas }, branchName, waName, tenantName] = await Promise.all([
            ReportDataService.getLiveStockData(user.tenantId, branchId),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getWorkAreaName(workAreaId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());

        // Build dynamic columns
        const dynamicColumns: any[] = [
            { header: "S.No", key: "sNo", type: "number" },
            { header: "Location", key: "branch", type: "string" },
            { header: "Category", key: "category", type: "string" },
            { header: "HSN/SAC", key: "hsnCode", type: "string" },
            { header: "Item Code", key: "itemCode", type: "string" },
            { header: "Item Name", key: "itemName", type: "string" },
            { header: "Entry Type", key: "entryType", type: "string" },
            { header: "UOM", key: "uom", type: "string" },
            { header: "Tax(%)", key: "taxRate", type: "number" },
            { header: "Store Stock", key: "qty_store", type: "number" },
            { header: "WAC(incl.tax,etc)", key: "wac", type: "number" },
            { header: "Store Total(incl.tax,etc)", key: "total_store", type: "number" },
        ];

        // Add dynamic work area columns
        workAreas.forEach(wa => {
            dynamicColumns.push({ header: wa, key: `qty_${wa}`, type: "number" });
            dynamicColumns.push({ header: `${wa} Total(incl.tax,etc)`, key: `total_${wa}`, type: "number" });
        });

        dynamicColumns.push({ header: "Total Stock(Store + Workarea)", key: "totalStock", type: "number" });
        dynamicColumns.push({ header: "Grand Total(incl.tax,etc)", key: "grandTotal", type: "number" });

        const headerLines = [
            tenantName,
            'LIVE STOCK REPORT',
            `Generated On : ${timestamp}|As of Today|Based On Current Inventory Levels`
        ];

        return ReportsDownloadController.handleDownload(c, 'Live Stock Report', dynamicColumns, data, {
            'Branch': branchName,
            'Work Area': waName
        }, headerLines);
    }

    // 2. Supplier Item-wise Purchases
    static async downloadSupplierPurchase(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { startDate, endDate } = c.req.query();

        const [groups, branchName, tenantName] = await Promise.all([
            ReportDataService.getSupplierItemPurchaseData(user.tenantId, branchId, startDate, endDate),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());
        const dateRangeStr = `From ${ReportsDownloadController.formatRangeDate(startDate)} To ${ReportsDownloadController.formatRangeDate(endDate)}`;

        const headerLines = [
            tenantName,
            'PURCHASE INVOICE',
            'Based on GRN Date(System Entry Date)',
            `${dateRangeStr} | Generated On : ${timestamp}`
        ];

        const workbook = await ExcelService.generateGroupedExcelReport({
            title: 'Supplier Purchases',
            columns: supplierPurchaseColumns,
            groups: (groups as any).map((g: any) => ({
                groupTitle: g.vendorName,
                rows: g.items
            })),
            headerLines
        });

        const buffer = await workbook.xlsx.writeBuffer();

        c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        c.header('Content-Disposition', `attachment; filename=Supplier_Purchase_Report.xlsx`);

        return c.body(buffer as any);
    }

    // 3. Indent Issue Report
    static async downloadIndentIssue(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { startDate, endDate } = c.req.query();

        const [data, branchName, tenantName] = await Promise.all([
            ReportDataService.getIndentIssueData(user.tenantId, branchId, startDate, endDate),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());
        const dateRangeStr = `${ReportsDownloadController.formatRangeDate(startDate)} to ${ReportsDownloadController.formatRangeDate(endDate)}`;
        const headerLines = [
            tenantName,
            'INDENT ISSUE REPORT',
            `Generated On : ${timestamp}|${dateRangeStr}|Based On Issue Date`
        ];

        return ReportsDownloadController.handleDownload(c, 'Indent Issue Report', indentIssueColumns, data, {
            'Branch': branchName
        }, headerLines);
    }

    // 4. Consolidated Purchase & Indent
    static async downloadConsolidated(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { startDate, endDate } = c.req.query();

        const [data, branchName, tenantName] = await Promise.all([
            ReportDataService.getConsolidatedData(user.tenantId, branchId, startDate, endDate),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());
        const dateRangeStr = `${ReportsDownloadController.formatRangeDate(startDate)} to ${ReportsDownloadController.formatRangeDate(endDate)}`;

        const headerLines = [
            tenantName,
            'CONSOLIDATED PURCHASE & INDENT',
            `Generated On : ${timestamp}|${dateRangeStr}|Based On GRN Date(System Entry Date)`
        ];

        return ReportsDownloadController.handleDownload(c, 'Consolidated Purchase & Indent', consolidatedColumns, data, {
            'Branch': branchName
        }, headerLines);
    }

    // 5. Purchase Order Status
    static async downloadPOStatus(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { status, startDate, endDate } = c.req.query();

        const [data, branchName, tenantName] = await Promise.all([
            ReportDataService.getPOStatusData(user.tenantId, branchId, status, startDate, endDate),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());
        const dateRangeStr = `${ReportsDownloadController.formatRangeDate(startDate)} to ${ReportsDownloadController.formatRangeDate(endDate)}`;
        const headerLines = [
            tenantName,
            'PURCHASE ORDER STATUS REPORT',
            `Generated On : ${timestamp}|${dateRangeStr}|Based On PO Date`
        ];

        return ReportsDownloadController.handleDownload(c, 'Purchase Order Status', poStatusColumns, data, {
            'Branch': branchName,
            'Status': status || 'All'
        }, headerLines);
    }

    // 6. Invoice Summary Report
    static async downloadInvoiceSummary(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId') || c.req.query('branchId');
        const { startDate, endDate, vendorId } = c.req.query();

        const [data, branchName, tenantName] = await Promise.all([
            ReportDataService.getInvoiceSummaryData(user.tenantId, branchId, startDate, endDate, vendorId),
            ReportsDownloadController.getBranchName(branchId),
            ReportsDownloadController.getTenantName(user.tenantId)
        ]);

        const timestamp = ReportsDownloadController.formatReportTimestamp(new Date());
        const dateRangeStr = `${ReportsDownloadController.formatRangeDate(startDate)} to ${ReportsDownloadController.formatRangeDate(endDate)}`;
        const headerLines = [
            tenantName,
            'INVOICE SUMMARY REPORT',
            `Generated On : ${timestamp}|${dateRangeStr}|Based On GRN Date`
        ];

        return ReportsDownloadController.handleDownload(c, 'Invoice Summary Report', invoiceSummaryColumns, data, {
            'Branch': branchName
        }, headerLines);
    }
}
