import { ExcelColumn } from '../excel/excel.service';

export const invoiceSummaryColumns: ExcelColumn[] = [
    { header: "S.No", key: "sNo", type: "number" },
    { header: "Location", key: "location", type: "string" },
    { header: "Vendor Id", key: "vendorId", type: "string" },
    { header: "Vendor Name", key: "vendorName", type: "string" },
    { header: "Invoice Id", key: "invoiceNo", type: "string" },
    { header: "GRN Date(System Entry Date)", key: "grnSystemDate", type: "date" },
    { header: "Goods Received Date", key: "goodsReceivedDate", type: "date" },
    { header: "Based on Vendor Invoice Date", key: "vendorInvoiceDate", type: "date" },
    { header: "GRN Id", key: "grnId", type: "string" },
    { header: "Total(excl tax)", key: "totalExclTax", type: "currency" },
    { header: "Tax Amount", key: "taxAmount", type: "currency" },
    { header: "Other Charges", key: "otherCharges", type: "currency" },
    { header: "Credit Note Amount", key: "creditNoteAmount", type: "currency" },
    { header: "Total(incl tax,etc)", key: "totalInclTax", type: "currency" },
    { header: "Transportation", key: "transportation", type: "currency" },
    { header: "Labour", key: "labour", type: "currency" },
    { header: "Grand Total", key: "grandTotal", type: "currency" },
    { header: "Status", key: "status", type: "string" }
];
