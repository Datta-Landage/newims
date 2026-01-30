import { ExcelColumn } from '../excel/excel.service';

export const poStatusColumns: ExcelColumn[] = [
    { header: "S.No", key: "sNo", type: "number" },
    { header: "Location", key: "location", type: "string" },
    { header: "Vendor ID", key: "vendorId", type: "string" },
    { header: "Vendor Name", key: "vendorName", type: "string" },
    { header: "PO ID", key: "displayId", type: "string" },
    { header: "PO Created By", key: "createdBy", type: "string" },
    { header: "PO Created Date", key: "createdAtDate", type: "date", options: { numFmt: 'dd/mm/yyyy' } },
    { header: "PO Created Time", key: "createdAtTime", type: "string" },
    { header: "Delivery Date", key: "deliveryDate", type: "date", options: { numFmt: 'dd/mm/yyyy' } },
    { header: "GRN ID", key: "grnId", type: "string" },
    { header: "GRN Date", key: "grnDate", type: "date", options: { numFmt: 'dd/mm/yyyy' } },
    { header: "PO Status", key: "status", type: "string" }
];
