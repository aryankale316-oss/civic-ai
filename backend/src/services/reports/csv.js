function escapeCsvField(value) {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// columns: [{ key, label }], rows: array of plain objects
function toCsv(columns, rows) {
    const header = columns.map((c) => escapeCsvField(c.label)).join(',');
    const lines = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(','));
    return [header, ...lines].join('\r\n');
}

module.exports = { toCsv };
