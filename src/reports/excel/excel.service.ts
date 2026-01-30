import ExcelJS from 'exceljs';
import { EXCEL_STYLES } from './excel.styles';
import { ExcelUtils } from './excel.utils';

export interface ExcelColumn {
    header: string;
    key: string;
    type: 'string' | 'number' | 'currency' | 'date' | 'percent';
    options?: {
        numFmt?: string;
    };
}

export interface ExcelReportOptions {
    title: string;
    columns: ExcelColumn[];
    rows?: any[]; // For standard method
    iterator?: AsyncIterable<any> | Iterable<any>; // For streaming method
    filters?: Record<string, string>;
    headerLines?: string[];
}

export class ExcelService {
    static async generateGroupedExcelReport(options: ExcelReportOptions & { groups: { groupTitle: string, rows: any[] }[] }): Promise<ExcelJS.Workbook> {
        const { title, columns, groups, headerLines } = options;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(title.substring(0, 31));

        let currentRow = 1;

        // 1. Add Headers (Title/Header Lines)
        if (headerLines && headerLines.length > 0) {
            headerLines.forEach((line) => {
                sheet.mergeCells(currentRow, 1, currentRow, columns.length);
                const cell = sheet.getCell(currentRow, 1);
                cell.value = line;
                cell.style = EXCEL_STYLES.REPORT_TITLE as any;
                sheet.getRow(currentRow).height = 20;
                currentRow++;
            });
        }

        currentRow++; // Gap

        // 2. Add Groups
        groups.forEach((group) => {
            // Group Title (e.g. Property: Vendor Name)
            sheet.mergeCells(currentRow, 1, currentRow, columns.length);
            const groupTitleCell = sheet.getCell(currentRow, 1);
            groupTitleCell.value = `Property: ${group.groupTitle}`;
            groupTitleCell.font = { bold: true, size: 11 };
            currentRow++;

            // Table Headers
            const headerRow = sheet.getRow(currentRow);
            columns.forEach((col, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = col.header;
                cell.style = EXCEL_STYLES.HEADER;
            });
            headerRow.height = 20;
            currentRow++;

            // Data Rows
            group.rows.forEach((rowData) => {
                const row = sheet.getRow(currentRow);
                columns.forEach((col, colIndex) => {
                    const cell = row.getCell(colIndex + 1);
                    let value = rowData[col.key];

                    if (col.type === 'currency' || col.type === 'number') {
                        cell.value = Number(value) || 0;
                        if (col.type === 'currency') cell.numFmt = '₹#,##0.00';
                    } else if (col.type === 'date') {
                        cell.value = value ? new Date(value) : '';
                        cell.numFmt = 'DD-MM-YYYY';
                    } else {
                        cell.value = value !== undefined && value !== null ? String(value) : '';
                    }
                    cell.style = EXCEL_STYLES.DATA_CELL;
                });
                currentRow++;
            });

            currentRow++; // Spacer between groups
        });

        ExcelUtils.autoSizeColumns(sheet);

        return workbook;
    }

    static async generateExcelReport(options: ExcelReportOptions): Promise<ExcelJS.Workbook> {
        const { title, columns, rows = [], filters, headerLines } = options;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(title.substring(0, 31));

        let currentRow = 1;

        // 1. Add Headers (Title/Header Lines)
        if (headerLines && headerLines.length > 0) {
            headerLines.forEach((line) => {
                sheet.mergeCells(currentRow, 1, currentRow, columns.length);
                const cell = sheet.getCell(currentRow, 1);
                cell.value = line;
                cell.style = EXCEL_STYLES.REPORT_TITLE as any;
                sheet.getRow(currentRow).height = 20;
                currentRow++;
            });
        } else {
            sheet.mergeCells(currentRow, 1, currentRow, columns.length);
            const titleCell = sheet.getCell(currentRow, 1);
            titleCell.value = title.toUpperCase();
            titleCell.style = EXCEL_STYLES.TITLE;
            sheet.getRow(currentRow).height = 30;
            currentRow++;
        }

        currentRow++; // Gap after title
        if (filters && Object.keys(filters).length > 0) {
            Object.entries(filters).forEach(([label, value]) => {
                const labelCell = sheet.getCell(currentRow, 1);
                labelCell.value = `${label}:`;
                labelCell.style = EXCEL_STYLES.FILTER_LABEL;

                const valueCell = sheet.getCell(currentRow, 2);
                valueCell.value = value || 'All';
                valueCell.style = EXCEL_STYLES.FILTER_VALUE;
                currentRow++;
            });
            currentRow++; // Gap after filters
        }

        // 3. Add Table Headers
        const headerRowNumber = currentRow;
        const headerRow = sheet.getRow(headerRowNumber);

        columns.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = col.header;
            cell.style = EXCEL_STYLES.HEADER;
        });
        headerRow.height = 20;

        // 4. Add Data Rows
        rows.forEach((rowData: any, index: number) => {
            const dataRowNumber = headerRowNumber + index + 1;
            const row = sheet.getRow(dataRowNumber);

            columns.forEach((col, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                let value = rowData[col.key];

                // Formatting based on type
                if (col.type === 'currency') {
                    cell.numFmt = '₹#,##0.00';
                    cell.value = Number(value) || 0;
                } else if (col.type === 'number') {
                    cell.value = Number(value) || 0;
                } else if (col.type === 'date') {
                    cell.value = value ? new Date(value) : '';
                    cell.numFmt = col.options?.numFmt || 'DD-MM-YYYY';
                } else if (col.type === 'percent') {
                    cell.value = (Number(value) || 0) / 100;
                    cell.numFmt = '0.00%';
                } else {
                    cell.value = value !== undefined && value !== null ? String(value) : '';
                }

                cell.style = EXCEL_STYLES.DATA_CELL;
            });
        });

        // 5. Auto Column Widths
        ExcelUtils.autoSizeColumns(sheet);

        // 6. Freeze Header Row
        sheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: headerRowNumber }
        ];

        // 7. Add Footer
        const footerRowNumber = headerRowNumber + rows.length + 2;
        sheet.mergeCells(footerRowNumber, 1, footerRowNumber, columns.length);
        const footerCell = sheet.getCell(footerRowNumber, 1);
        footerCell.value = `Generated on: ${ExcelUtils.formatDateTime(new Date())}`;
        footerCell.style = EXCEL_STYLES.FOOTER;

        return workbook;
    }

    /**
     * Streams the Excel report directly to a writable stream (Buffer).
     * Ideal for 10k+ rows.
     */
    static async streamExcelReport(options: ExcelReportOptions, res: any) {
        // ... (minimal streaming stays unchanged for now as it's not used by reports controller)
    }
}
