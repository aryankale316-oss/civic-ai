require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const DEPARTMENTS = [
    'Roads',
    'Water Supply',
    'Electricity',
    'Garbage',
    'Drainage',
    'Health',
    'Transport',
    'Public Safety',
];

// Turns "Water Supply" into "water.supply" for a predictable seeded login.
function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

async function seed() {
    const departmentIds = {};
    for (const name of DEPARTMENTS) {
        const { rows } = await pool.query(
            `INSERT INTO departments (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [name]
        );
        departmentIds[name] = rows[0].id;
    }
    console.log('Departments seeded.');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            ['Platform Admin', adminEmail, hash, 'admin']
        );
        console.log(`Admin user created: ${adminEmail} / ${adminPassword}`);
    } else {
        console.log('Admin user already exists, skipping.');
    }

    // One department-admin account per department, so AI-routed complaints
    // have somewhere real to land. Shares ADMIN_PASSWORD for local/dev
    // convenience — rotate these in any real deployment.
    for (const name of DEPARTMENTS) {
        const email = `${slugify(name)}.admin@civicai.gov`;
        const existingDeptAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingDeptAdmin.rows.length === 0) {
            const hash = await bcrypt.hash(adminPassword, 10);
            await pool.query(
                'INSERT INTO users (name, email, password_hash, role, department_id) VALUES ($1, $2, $3, $4, $5)',
                [`${name} Admin`, email, hash, 'dept_admin', departmentIds[name]]
            );
            console.log(`Dept admin created: ${email} / ${adminPassword} (${name})`);
        }
    }

    await pool.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
