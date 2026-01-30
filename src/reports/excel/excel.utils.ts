import { Worksheet, Column, Cell } from 'exceljs';

export class ExcelUtils {
    /**
     * Automatically adjusts column widths based on the maximum length of content in each column.
     */
    static autoSizeColumns(worksheet: Worksheet) {
        worksheet.columns.forEach((column: Partial<Column>, colIndex: number) => {
            let maxLength = 10;

            column.eachCell!({ includeEmpty: false }, (cell: Cell, rowNumber: number) => {
                // Skip if cell is part of a merged range that starts at column 1 and spans multiple columns (these are usually headers)
                // In exceljs, merged cells have a master property
                const isMergedHeader = (cell as any)._mergeCount > 1 || (cell.master && cell.master.address !== cell.address);

                // We only want to measure actual data rows and standard headers
                // Usually rows < 10 are header/filter info which we skip measuring if they span multiple columns
                if (rowNumber < 10 && isMergedHeader) return;

                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });

            // Cap the width to a reasonable maximum
            column.width = Math.min(50, Math.max(10, maxLength + 4));
        });
    }

    /**
     * Formats a date to DD-MM-YYYY
     */
    static formatDate(date: Date | string | number): string {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Formats a datetime to DD-MM-YYYY HH:mm
     */
    static formatDateTime(date: Date | string | number): string {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
}
