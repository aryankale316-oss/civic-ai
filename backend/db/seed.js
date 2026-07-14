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

async function seed() {
    for (const name of DEPARTMENTS) {
        await pool.query(
            'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
            [name]
        );
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

    await pool.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
