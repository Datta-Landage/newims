import { Fill, Font, Alignment, Borders } from 'exceljs';

export const EXCEL_STYLES = {
    TITLE: {
        font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FF000000' } } as Partial<Font>,
        alignment: { horizontal: 'center', vertical: 'middle' } as Partial<Alignment>,
    },
    REPORT_TITLE: {
        font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } } as Partial<Font>,
        alignment: { horizontal: 'left', vertical: 'middle' } as Partial<Alignment>,
    },
    HEADER: {
        font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } } as Partial<Font>,
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF333333' }
        } as Fill,
        alignment: { horizontal: 'center', vertical: 'middle' } as Partial<Alignment>,
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        } as Partial<Borders>,
    },
    DATA_CELL: {
        font: { name: 'Arial', size: 10 },
        alignment: { vertical: 'middle' } as Partial<Alignment>,
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        } as Partial<Borders>,
    },
    FILTER_LABEL: {
        font: { name: 'Arial', size: 10, bold: true },
        alignment: { horizontal: 'left' } as Partial<Alignment>,
    },
    FILTER_VALUE: {
        font: { name: 'Arial', size: 10 },
        alignment: { horizontal: 'left' } as Partial<Alignment>,
    },
    FOOTER: {
        font: { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } } as Partial<Font>,
        alignment: { horizontal: 'right' } as Partial<Alignment>,
    }
};
