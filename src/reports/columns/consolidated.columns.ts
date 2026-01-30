import { ExcelColumn } from '../excel/excel.service';

export const consolidatedColumns: ExcelColumn[] = [
    { header: "S.No", key: "sNo", type: "number" },
    { header: "Location", key: "location", type: "string" },
    { header: "Category", key: "category", type: "string" },
    { header: "HSN/SAC", key: "hsnCode", type: "string" },
    { header: "Item Code", key: "itemCode", type: "string" },
    { header: "Item Name", key: "itemName", type: "string" },
    { header: "WAC(incl.tax,etc)", key: "wac", type: "number" },
    { header: "Average Purchase Cost", key: "avgCost", type: "number" },
    { header: "Ordered Qty", key: "orderedQty", type: "number" },
    { header: "Received Qty", key: "receivedQty", type: "number" },
    { header: "Total(excl.tax)", key: "totalExclTax", type: "number" },
    { header: "Tax Amount", key: "taxAmount", type: "number" },
    { header: "Total(incl.tax,etc)", key: "totalInclTax", type: "number" }
];
