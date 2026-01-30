import { Hono } from 'hono';
import { ReportController } from '../controllers/report.controller';
import { ReportsDownloadController } from '../reports/controllers/reports.download.controller';
import { authMiddleware } from '../middlewares';

const reportRoutes = new Hono();

reportRoutes.use('*', authMiddleware);

reportRoutes.get('/live-stock', ReportController.getLiveStock);
reportRoutes.get('/indent-issue', ReportController.getIndentIssue);
reportRoutes.get('/purchase-indent-consolidated', ReportController.getPurchaseIndentConsolidated);
reportRoutes.get('/po-status', ReportController.getPOStatus);
reportRoutes.get('/rate-variance', ReportController.getRateVariance);
reportRoutes.get('/manual-closing', ReportController.getManualClosing);
reportRoutes.get('/invoice-summary', ReportController.getInvoiceSummary);
reportRoutes.get('/store-variance', ReportController.getStoreVariance);
reportRoutes.get('/detailed-grn', ReportController.getDetailedGRN);
reportRoutes.get('/flr', ReportController.getFLR);
reportRoutes.get('/supplier-item-purchase', ReportController.getSupplierItemPurchase);
reportRoutes.get('/supplier-purchase', ReportController.getSupplierPurchase);

// Excel Downloads
reportRoutes.get('/live-stock/download', ReportsDownloadController.downloadLiveStock);
reportRoutes.get('/supplier-purchase/download', ReportsDownloadController.downloadSupplierPurchase);
reportRoutes.get('/indent-issue/download', ReportsDownloadController.downloadIndentIssue);
reportRoutes.get('/consolidated/download', ReportsDownloadController.downloadConsolidated);
reportRoutes.get('/po-status/download', ReportsDownloadController.downloadPOStatus);
reportRoutes.get('/invoice-summary/download', ReportsDownloadController.downloadInvoiceSummary);

export default reportRoutes;
