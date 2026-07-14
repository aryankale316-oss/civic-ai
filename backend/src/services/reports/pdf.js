const PDFDocument = require('pdfkit');

function collectBuffer(doc) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}

function drawHeader(doc, title, subtitle) {
    doc.fontSize(18).font('Helvetica-Bold').text(title);
    if (subtitle) {
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(subtitle);
        doc.fillColor('#000000');
    }
    doc.fontSize(9).font('Helvetica').fillColor('#999999').text(`Generated ${new Date().toLocaleString()}`);
    doc.fillColor('#000000').moveDown(1);
}

// columns: [{ key, label, width }] widths in points, sum should fit page width (~495 usable)
function drawTable(doc, columns, rows) {
    const startX = doc.page.margins.left;
    const rowHeight = 18;
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    function drawRow(y, values, opts = {}) {
        let x = startX;
        doc.fontSize(9).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
        columns.forEach((col, i) => {
            doc.text(String(values[i] ?? ''), x, y, { width: col.width, ellipsis: true });
            x += col.width;
        });
    }

    let y = doc.y;
    drawRow(y, columns.map((c) => c.label), { bold: true });
    y += rowHeight;
    doc.moveTo(startX, y - 4).lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y - 4).strokeColor('#cccccc').stroke();

    for (const row of rows) {
        if (y + rowHeight > pageBottom) {
            doc.addPage();
            y = doc.page.margins.top;
            drawRow(y, columns.map((c) => c.label), { bold: true });
            y += rowHeight;
        }
        drawRow(y, columns.map((c) => row[c.key]));
        y += rowHeight;
    }
}

async function buildTablePdf({ title, subtitle, columns, rows }) {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait' });
    drawHeader(doc, title, subtitle);
    if (rows.length === 0) {
        doc.fontSize(11).fillColor('#666666').text('No data available for this report.');
    } else {
        drawTable(doc, columns, rows);
    }
    return collectBuffer(doc);
}

async function buildKpiPdf({ title, subtitle, kpis, sections }) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    drawHeader(doc, title, subtitle);

    doc.fontSize(13).font('Helvetica-Bold').text('Summary').moveDown(0.3);
    kpis.forEach((kpi) => {
        doc.fontSize(10).font('Helvetica').text(`${kpi.label}: `, { continued: true }).font('Helvetica-Bold').text(String(kpi.value));
    });
    doc.moveDown(1);

    for (const section of sections) {
        if (doc.y > doc.page.height - 150) doc.addPage();
        doc.fontSize(13).font('Helvetica-Bold').text(section.title).moveDown(0.3);
        if (section.rows.length === 0) {
            doc.fontSize(10).font('Helvetica').fillColor('#666666').text('No data.').fillColor('#000000');
        } else {
            drawTable(doc, section.columns, section.rows);
        }
        doc.moveDown(1);
    }

    return collectBuffer(doc);
}

module.exports = { buildTablePdf, buildKpiPdf };
