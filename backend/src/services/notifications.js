const pool = require('../config/db');
const { sendEmail } = require('./email');

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
    // Persist and deliver in-app notifications independently of email. A slow
    // or unavailable SMTP service must not delay the Socket.IO event/API flow.
    ioInstance?.to(`user:${userId}`).emit('notification', notification);

    void pool.query('SELECT email FROM users WHERE id = $1', [userId])
        .then(({ rows: users }) => {
            if (users[0]?.email) {
                return sendEmail({ to: users[0].email, subject: title, text: message });
            }
            return undefined;
        })
        .catch((err) => console.error(`Could not queue notification email for user ${userId}:`, err.message));
    return notification;
}

async function notifyAdmins({ complaintId, type, title, message }) {
    const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    await Promise.all(
        admins.map((admin) => createNotification({ userId: admin.id, complaintId, type, title, message }))
    );
}

// Routes a notification to the dept_admin(s) scoped to a department, instead
// of broadcasting to every admin. Falls back to notifyAdmins when a
// complaint has no department (classifier couldn't route it) so it still
// surfaces to someone.
async function notifyDeptAdmins({ departmentId, complaintId, type, title, message }) {
    // Notify platform admins as well as the department team so a complaint is
    // visible in the central admin portal even when no department admin is set up.
    const { rows: recipients } = departmentId == null
        ? await pool.query("SELECT id FROM users WHERE role = 'admin'")
        : await pool.query(
            `SELECT id FROM users
             WHERE role = 'admin' OR (role = 'dept_admin' AND department_id = $1)`,
            [departmentId]
        );
    await Promise.all(recipients.map((recipient) =>
        createNotification({ userId: recipient.id, complaintId, type, title, message })
    ));
}

module.exports = { setIO, createNotification, notifyAdmins, notifyDeptAdmins };
