const ExcelJS = require('exceljs');

// columns: [{ key, label, width? }], rows: array of plain objects
async function buildExcelBuffer(sheetName, columns, rows) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel sheet name limit

    sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 22 }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((row) => sheet.addRow(row));

    return workbook.xlsx.writeBuffer();
}

module.exports = { buildExcelBuffer };
