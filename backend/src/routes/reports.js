const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { toCsv } = require('../services/reports/csv');
const { buildExcelBuffer } = require('../services/reports/excel');
const { buildTablePdf, buildKpiPdf } = require('../services/reports/pdf');
const {
    getComplaintsReport,
    getDepartmentsReport,
    getMonthlyReport,
    getAnalyticsReport,
} = require('../services/reports/data');

const router = express.Router();

const REPORT_LOADERS = {
    complaints: (query) => getComplaintsReport({ status: query.status, departmentId: query.department_id }),
    departments: () => getDepartmentsReport(),
    monthly: () => getMonthlyReport(),
    analytics: () => getAnalyticsReport(),
};

const VALID_FORMATS = ['csv', 'excel', 'pdf'];

router.get('/:type', requireAuth, requireRole('admin'), async (req, res) => {
    const loader = REPORT_LOADERS[req.params.type];
    if (!loader) {
        return res.status(404).json({ error: `Unknown report type. Use one of: ${Object.keys(REPORT_LOADERS).join(', ')}` });
    }

    const format = req.query.format || 'csv';
    if (!VALID_FORMATS.includes(format)) {
        return res.status(400).json({ error: `format must be one of: ${VALID_FORMATS.join(', ')}` });
    }

    const report = await loader(req.query);
    const filename = `${req.params.type}-report-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(toCsv(report.columns, report.rows));
    }

    if (format === 'excel') {
        const buffer = await buildExcelBuffer(report.title, report.columns, report.rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        return res.send(buffer);
    }

    // pdf
    const buffer = report.kpis
        ? await buildKpiPdf(report)
        : await buildTablePdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(buffer);
});

module.exports = router;
