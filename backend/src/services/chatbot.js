const pool = require('../config/db');

// Rule-based only — no LLM. Matches the existing AI service's classification
// categories 1:1 so descriptions stay accurate as departments are seeded.
const DEPARTMENT_DESCRIPTIONS = {
    'Roads': 'Potholes, road damage, broken footpaths, damaged dividers.',
    'Water Supply': 'No water, low pressure, contaminated water, pipe leaks.',
    'Electricity': 'Power outages, sparking or exposed wires, damaged poles.',
    'Garbage': 'Overflowing bins, missed pickup, illegal dumping.',
    'Drainage': 'Blocked drains, sewage overflow, flooding.',
    'Health': 'Public health hazards, disease risk, sanitation issues.',
    'Transport': 'Public transport issues, bus stops, traffic signals.',
    'Public Safety': 'Unsafe structures, hazards, general safety concerns.',
};

const FAQS = [
    {
        keywords: ['submit', 'file', 'report', 'new complaint', 'raise a complaint', 'lodge'],
        answer:
            'To submit a complaint:\n' +
            '1. Go to **New Complaint**\n' +
            '2. Add a clear title and description (or use the 🎤 mic button to speak it)\n' +
            '3. Optionally attach photos and pin the location on the map\n' +
            '4. Submit — category, department, and priority are classified automatically\n\n' +
            '[Submit a complaint now](/complaints/new)',
    },
    {
        keywords: ['priority', 'urgent', 'how is priority', 'severity'],
        answer:
            'Priority (**Low**, **Medium**, **High**, **Critical**) is set automatically from your description — ' +
            'certain keywords (like "fire", "gas leak", "no water") and the complaint category push it higher. ' +
            'Critical and High priority complaints are flagged for faster attention.',
    },
    {
        keywords: ['how long', 'resolution time', 'when will it be fixed', 'eta', 'estimate'],
        answer:
            'Every complaint gets an **estimated resolution time** based on its category and priority, shown on the complaint detail page. ' +
            "It's an estimate, not a guarantee — actual time depends on the assigned department's workload.",
    },
    {
        keywords: ['duplicate', 'similar complaint', 'already reported'],
        answer:
            "When you submit a complaint, it's automatically checked against existing ones for similar wording. " +
            "If a close match is found you'll see a warning with a link to it before submitting — you can still continue if it's genuinely a new issue.",
    },
    {
        keywords: ['image', 'photo', 'picture', 'upload'],
        answer: 'You can attach up to 5 photos per complaint (drag-and-drop or click to browse) — either when submitting or later from the complaint detail page.',
    },
    {
        keywords: ['location', 'map', 'pin', 'address', 'gps'],
        answer:
            'On the New Complaint page, click the map to drop a pin at the exact spot, or use "Use my location". ' +
            "The address fills in automatically but you can edit it — it's optional.",
    },
    {
        keywords: ['delete', 'remove my complaint', 'cancel complaint'],
        answer: "There's currently no self-service delete — if you need a complaint removed or corrected, an admin can update its status for you.",
    },
    {
        keywords: ['data', 'privacy', 'safe', 'secure'],
        answer: 'Your account is protected with a hashed password and a signed login token. Complaint data is only visible to you and admin staff.',
    },
];

function lowerIncludesAny(text, keywords) {
    return keywords.some((kw) => text.includes(kw));
}

function findComplaintIdInMessage(message) {
    const match = message.match(/#?(\d{1,6})/);
    return match ? Number(match[1]) : null;
}

async function handleTrackIntent(message, user) {
    const id = findComplaintIdInMessage(message);

    if (id) {
        const { rows } = await pool.query(
            `SELECT c.id, c.title, c.status, c.ai_priority, c.estimated_resolution_label, c.user_id, d.name AS department_name
             FROM complaints c
             LEFT JOIN departments d ON d.id = c.department_id
             WHERE c.id = $1`,
            [id]
        );
        const complaint = rows[0];
        if (!complaint || (user.role !== 'admin' && complaint.user_id !== user.id)) {
            return `I couldn't find a complaint #${id} in your account. Double-check the number, or ask me to list your recent complaints.`;
        }
        return (
            `**Complaint #${complaint.id}: ${complaint.title}**\n` +
            `- Status: **${complaint.status.replace('_', ' ')}**\n` +
            `- Department: ${complaint.department_name || 'Unassigned'}\n` +
            `- Priority: ${complaint.ai_priority || 'Not yet classified'}\n` +
            `- Estimated resolution: ${complaint.estimated_resolution_label || 'Not available'}\n\n` +
            `[View full details](/complaints/${complaint.id})`
        );
    }

    if (user.role === 'admin') {
        return 'Give me a complaint number (e.g. "status of #42") and I\'ll look it up.';
    }

    const { rows } = await pool.query(
        'SELECT id, title, status FROM complaints WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
        [user.id]
    );
    if (rows.length === 0) {
        return "You haven't submitted any complaints yet. [Submit one here](/complaints/new).";
    }
    const list = rows.map((c) => `- #${c.id} ${c.title} — **${c.status.replace('_', ' ')}**`).join('\n');
    return `Here are your recent complaints:\n${list}\n\nAsk me about a specific one, e.g. "status of #${rows[0].id}".`;
}

async function handleDepartmentsIntent() {
    const { rows } = await pool.query('SELECT name FROM departments ORDER BY name');
    if (rows.length === 0) {
        return 'No departments are configured yet.';
    }
    const list = rows
        .map((d) => `- **${d.name}** — ${DEPARTMENT_DESCRIPTIONS[d.name] || 'Handles related civic issues.'}`)
        .join('\n');
    return `Complaints are routed to these departments based on what you describe:\n${list}`;
}

function handleAdminHelpIntent() {
    return (
        'As an admin you can:\n' +
        '- View and filter all complaints on the **Dashboard**, change status, and assign officers\n' +
        '- Manage officers (add/edit/deactivate) on the **Officers** page\n' +
        '- View trends and KPIs on **Analytics**\n' +
        '- See geographic complaint clusters on **Hotspots**\n\n' +
        'Ask me something more specific and I\'ll try to help.'
    );
}

function handleFaqIntent(lowerMessage) {
    let best = null;
    let bestScore = 0;
    for (const faq of FAQS) {
        const score = faq.keywords.filter((kw) => lowerMessage.includes(kw)).length;
        if (score > bestScore) {
            best = faq;
            bestScore = score;
        }
    }
    return bestScore > 0 ? best.answer : null;
}

function fallbackReply(user) {
    const adminLine = user.role === 'admin' ? '\n- Explain admin dashboard features' : '';
    return (
        "I can help with a few things:\n" +
        '- Track a complaint ("status of #42")\n' +
        '- Guide you through submitting a complaint\n' +
        '- Explain what each department handles' +
        adminLine +
        '\n- Answer questions about priority, resolution time, duplicates, photos, and location\n\n' +
        'What would you like to know?'
    );
}

async function generateReply(message, user) {
    const lower = message.toLowerCase().trim();

    if (lowerIncludesAny(lower, ['hi', 'hello', 'hey', 'help']) && lower.length < 20) {
        return { reply: fallbackReply(user), intent: 'greeting' };
    }

    if (lowerIncludesAny(lower, ['track', 'status', 'where is my', 'my complaint', 'progress']) || /#\d{1,6}/.test(lower)) {
        return { reply: await handleTrackIntent(lower, user), intent: 'track_complaint' };
    }

    if (lowerIncludesAny(lower, ['department', 'departments', 'which department'])) {
        return { reply: await handleDepartmentsIntent(), intent: 'departments' };
    }

    if (user.role === 'admin' && lowerIncludesAny(lower, ['admin', 'dashboard', 'manage officer', 'as an admin'])) {
        return { reply: handleAdminHelpIntent(), intent: 'admin_help' };
    }

    const faqAnswer = handleFaqIntent(lower);
    if (faqAnswer) {
        return { reply: faqAnswer, intent: 'faq' };
    }

    return { reply: fallbackReply(user), intent: 'fallback' };
}

module.exports = { generateReply };
