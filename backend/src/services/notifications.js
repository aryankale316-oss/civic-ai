const pool = require('../config/db');

let ioInstance = null;

function setIO(io) {
    ioInstance = io;
}

async function createNotification({ userId, complaintId, type, title, message }) {
    const { rows } = await pool.query(
        `INSERT INTO notifications (user_id, complaint_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, complaint_id, type, title, message, is_read, created_at`,
        [userId, complaintId || null, type, title, message]
    );
    const notification = rows[0];
    ioInstance?.to(`user:${userId}`).emit('notification', notification);
    return notification;
}

async function notifyAdmins({ complaintId, type, title, message }) {
    const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    await Promise.all(
        admins.map((admin) => createNotification({ userId: admin.id, complaintId, type, title, message }))
    );
}

module.exports = { setIO, createNotification, notifyAdmins };
