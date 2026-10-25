const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER?.trim();
// Google displays App Passwords in groups separated by spaces. Remove those
// display spaces so a pasted App Password is accepted by SMTP authentication.
const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

async function sendEmail({ to, subject, text }) {
    if (!emailUser || !emailPass) {
        console.error('Email sending skipped: EMAIL_USER or EMAIL_PASS is not configured.');
        return false;
    }
    try {
        await transporter.sendMail({
            from: emailUser,
            to,
            subject,
            text,
        });

        console.log(`Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error.message);
        return false;
    }
}

async function verifyEmailTransport() {
    if (!emailUser || !emailPass) {
        return { ok: false, reason: 'EMAIL_USER or EMAIL_PASS is not configured' };
    }
    try {
        await transporter.verify();
        return { ok: true };
    } catch (error) {
        return { ok: false, reason: error.message };
    }
}

module.exports = { sendEmail, verifyEmailTransport };
