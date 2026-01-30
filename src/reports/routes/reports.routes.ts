import { Hono } from 'hono';
import { ReportsDownloadController } from '../controllers/reports.download.controller';

const reports = new Hono();

reports.get('/live-stock/download', ReportsDownloadController.downloadLiveStock);
reports.get('/supplier-purchase/download', ReportsDownloadController.downloadSupplierPurchase);
reports.get('/indent-issue/download', ReportsDownloadController.downloadIndentIssue);
reports.get('/consolidated/download', ReportsDownloadController.downloadConsolidated);
reports.get('/po-status/download', ReportsDownloadController.downloadPOStatus);
reports.get('/invoice-summary/download', ReportsDownloadController.downloadInvoiceSummary);

export default reports;
