import { ExcelColumn } from '../excel/excel.service';

export const supplierPurchaseColumns: ExcelColumn[] = [
    { header: "S.No", key: "sNo", type: "number" },
    { header: "GRN No", key: "grnNo", type: "string" },
    { header: "PO No", key: "poNo", type: "string" },
    { header: "Item Code", key: "itemCode", type: "string" },
    { header: "HSN/SAC", key: "hsnCode", type: "string" },
    { header: "Item Name", key: "itemName", type: "string" },
    { header: "Package Name", key: "packageName", type: "string" },
    { header: "Requested Qty", key: "requestedQty", type: "number" },
    { header: "Received Qty", key: "receivedQty", type: "number" },
    { header: "Pending Qty", key: "pendingQty", type: "number" },
    { header: "Unit Price", key: "unitPrice", type: "number" },
    { header: "Tax Rate", key: "taxRate", type: "number" },
    { header: "Sub Total", key: "subTotal", type: "number" },
    { header: "Tax Amount", key: "taxAmount", type: "number" },
    { header: "Other Charges", key: "otherCharges", type: "number" },
    { header: "Total Price", key: "totalPrice", type: "number" }
];
