const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const pool = require('../config/db');
const { requireAuth, requireRole, requireAnyRole } = require('../middleware/auth');
const { upload, UPLOADS_DIR } = require('../middleware/upload');
const { createNotification, notifyAdmins, notifyDeptAdmins } = require('../services/notifications');

const router = express.Router();

const DUPLICATE_SIMILARITY_THRESHOLD = 0.82;
const MAX_DUPLICATE_MATCHES = 5;
const HI_STATUS_LABELS = {
    submitted: 'प्राप्त',
    in_progress: 'कार्य प्रगति पर',
    resolved: 'समाधान हुआ',
    rejected: 'अस्वीकृत',
};

async function fetchEmbedding(text) {
    const { data } = await axios.post(`${process.env.AI_SERVICE_URL}/embed`, { text }, { timeout: 10000 });
    return data.embedding;
}

async function prepareAnalysisText(text) {
    const { data } = await axios.post(
        `${process.env.AI_SERVICE_URL}/prepare-text`,
        { text },
        { timeout: 180000 }
    );
    return data;
}

async function analyzeImage(filePath) {
    const form = new FormData();
    form.append('image', fsSync.createReadStream(filePath));
    const { data } = await axios.post(`${process.env.AI_SERVICE_URL}/detect-issues`, form, {
        headers: form.getHeaders(),
        timeout: 15000,
    });
    return data;
}

async function moderateText(text) {
    const { data } = await axios.post(`${process.env.AI_SERVICE_URL}/moderate`, { text }, { timeout: 10000 });
    return data;
}

async function detectFakeText(text) {
    const { data } = await axios.post(`${process.env.AI_SERVICE_URL}/detect-fake`, { text }, { timeout: 10000 });
    return data;
}

// Moderation flags are for admin review only — never shown to the citizen
// who submitted the complaint (avoids tipping off spammers and stigmatizing
// false positives).
const MODERATION_FIELDS = [
    'is_profane', 'spam_score', 'spam_signals', 'is_repeated_submission', 'repeated_of_complaint_id',
    'fake_score', 'fake_signals', 'is_likely_fake',
];

const FAKE_SCORE_THRESHOLD = 0.5;

// Combines the AI service's text-gibberish heuristic with signals the
// backend already computes independently (spam score, near-duplicate and
// repeated-submission detection via embeddings) into one composite score.
function computeFakeScore({ gibberishResult, spamScore, isRepeatedSubmission, duplicateCount }) {
    // Give strong gibberish signals enough weight to cross the review
    // threshold on their own; this remains a staff-review flag, not a rejection.
    let score = gibberishResult.gibberish_score * 0.8;
    const signals = [...gibberishResult.gibberish_signals];

    if (spamScore != null && spamScore >= 0.5) {
        score += 0.2;
        signals.push('flagged as likely spam');
    }
    if (isRepeatedSubmission) {
        score += 0.3;
        signals.push('near-identical to the same user\'s recent submission');
    }
    if (duplicateCount > 0) {
        score += 0.3;
        signals.push(`near-duplicate of ${duplicateCount} existing complaint(s)`);
    }

    score = Math.min(score, 1);
    return { score: Math.round(score * 100) / 100, signals, isLikelyFake: score >= FAKE_SCORE_THRESHOLD };
}

function isStaff(role) {
    return role === 'admin' || role === 'dept_admin';
}

function stripModerationFields(complaint, viewerRole) {
    if (!complaint || isStaff(viewerRole)) return complaint;
    for (const field of MODERATION_FIELDS) {
        delete complaint[field];
    }
    return complaint;
}

// Embeddings are pre-normalized (unit length) by the AI service, so cosine
// similarity reduces to a plain dot product.
function cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}

async function findSimilarComplaints(embedding, excludeComplaintId) {
    const { rows } = await pool.query(
        `SELECT ce.complaint_id, ce.embedding, c.title, c.status
         FROM complaint_embeddings ce
         JOIN complaints c ON c.id = ce.complaint_id
         WHERE ce.complaint_id != $1`,
        [excludeComplaintId || 0]
    );

    return rows
        .map((row) => ({
            id: row.complaint_id,
            title: row.title,
            status: row.status,
            similarity: cosineSimilarity(embedding, row.embedding),
        }))
        .filter((match) => match.similarity >= DUPLICATE_SIMILARITY_THRESHOLD)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MAX_DUPLICATE_MATCHES);
}

// Tighter than DUPLICATE_SIMILARITY_THRESHOLD and scoped to the same user —
// this is about one person resubmitting the same complaint repeatedly, not
// two different citizens reporting the same pothole (that's Phase 4).
const REPEATED_SUBMISSION_SIMILARITY_THRESHOLD = 0.9;

async function findRepeatedSubmission(embedding, userId, excludeComplaintId) {
    const { rows } = await pool.query(
        `SELECT ce.complaint_id, ce.embedding
         FROM complaint_embeddings ce
         JOIN complaints c ON c.id = ce.complaint_id
         WHERE c.user_id = $1 AND ce.complaint_id != $2 AND c.created_at >= now() - interval '24 hours'`,
        [userId, excludeComplaintId]
    );
    const match = rows.find((row) => cosineSimilarity(embedding, row.embedding) >= REPEATED_SUBMISSION_SIMILARITY_THRESHOLD);
    return match ? match.complaint_id : null;
}

const IMAGE_COLUMNS = `id, complaint_id, file_path, original_name, mime_type, size_bytes,
    detected_objects, analysis_is_placeholder, analysis_note, analyzed_at, created_at`;

const COMPLAINT_SELECT = `
    SELECT c.id, c.title, c.description, c.location_text, c.latitude, c.longitude, c.ai_category,
           c.ai_priority, c.ai_confidence, c.sentiment, c.sentiment_score,
           c.source_language, c.ai_translation_used, c.ai_translation_note,
           c.estimated_resolution_hours, c.estimated_resolution_label, c.status, c.created_at, c.updated_at, c.resolved_at,
           c.user_id, u.name AS citizen_name, d.id AS department_id, d.name AS department_name,
           c.assigned_officer_id, o.name AS assigned_officer_name,
           f.rating AS feedback_rating, f.review AS feedback_review, f.created_at AS feedback_created_at,
           c.is_profane, c.spam_score, c.spam_signals, c.is_repeated_submission, c.repeated_of_complaint_id,
           c.fake_score, c.fake_signals, c.is_likely_fake
    FROM complaints c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN officers o ON o.id = c.assigned_officer_id
    LEFT JOIN feedback f ON f.complaint_id = c.id
`;

router.post('/', requireAuth, async (req, res) => {
    const { title, description, location_text, latitude, longitude } = req.body;
    if (!title || !description) {
        return res.status(400).json({ error: 'title and description are required' });
    }

    const lat = latitude != null && latitude !== '' ? Number(latitude) : null;
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null;
    if ((lat != null && !Number.isFinite(lat)) || (lng != null && !Number.isFinite(lng))) {
        return res.status(400).json({ error: 'latitude and longitude must be numbers' });
    }

    const combinedText = `${title}. ${description}`;
    let textPreparation;
    try {
        textPreparation = await prepareAnalysisText(combinedText);
    } catch (err) {
        console.error('Language preparation failed; submitting with original text:', err.message);
        textPreparation = {
            source_language: /[\u0900-\u097f]/u.test(combinedText) ? 'hi' : 'en',
            analysis_text: combinedText,
            translation_used: false,
            translation_note: 'Text preparation service unavailable; Hindi analysis may be unreliable.',
        };
    }
    const analysisText = textPreparation.analysis_text || combinedText;

    const [aiResult, sentimentResult, moderationResult, fakeResult] = await Promise.all([
        axios
            .post(`${process.env.AI_SERVICE_URL}/classify`, { text: analysisText })
            .then((r) => r.data)
            .catch((err) => {
                console.error('AI classification call failed, falling back to defaults:', err.message);
                return { category: null, department: null, priority: 'Medium', confidence: 0 };
            }),
        textPreparation.source_language === 'hi'
            ? Promise.resolve({ sentiment: null, score: null })
            : axios
            .post(`${process.env.AI_SERVICE_URL}/sentiment`, { text: analysisText })
            .then((r) => r.data)
            .catch((err) => {
                console.error('Sentiment analysis call failed:', err.message);
                return { sentiment: null, score: null };
            }),
        (textPreparation.source_language === 'hi'
            ? Promise.resolve({ is_profane: false, spam_score: null, spam_signals: [] })
            : moderateText(analysisText)).catch((err) => {
            console.error('Moderation check failed:', err.message);
            return { is_profane: false, spam_score: null, spam_signals: [] };
        }),
        (textPreparation.source_language === 'hi'
            ? Promise.resolve({ gibberish_score: 0, gibberish_signals: [] })
            : detectFakeText(analysisText)).catch((err) => {
            console.error('Fake-complaint check failed:', err.message);
            return { gibberish_score: 0, gibberish_signals: [] };
        }),
    ]);

    const initialFake = computeFakeScore({
        gibberishResult: fakeResult,
        spamScore: moderationResult.spam_score,
        isRepeatedSubmission: false,
        duplicateCount: 0,
    });

    const [deptRow, resolutionResult] = await Promise.all([
        aiResult.department && textPreparation.source_language !== 'hi'
            ? pool.query('SELECT id FROM departments WHERE name = $1', [aiResult.department])
            : Promise.resolve({ rows: [] }),
        textPreparation.source_language === 'hi'
            ? Promise.resolve({ estimated_hours: null, estimated_label: null })
            : axios
            .post(`${process.env.AI_SERVICE_URL}/predict-resolution`, {
                category: aiResult.category,
                priority: aiResult.priority,
            })
            .then((r) => r.data)
            .catch((err) => {
                console.error('Resolution estimate call failed:', err.message);
                return { estimated_hours: null, estimated_label: null };
            }),
    ]);
    const departmentId = deptRow.rows[0]?.id ?? null;

    const insertResult = await pool.query(
        `INSERT INTO complaints
            (user_id, title, description, location_text, latitude, longitude, ai_category, department_id, ai_priority, ai_confidence, sentiment, sentiment_score, source_language, ai_translation_used, ai_translation_note, estimated_resolution_hours, estimated_resolution_label, is_profane, spam_score, spam_signals, fake_score, fake_signals, is_likely_fake)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         RETURNING id, status, created_at`,
        [
            req.user.id,
            title,
            description,
            location_text || null,
            lat,
            lng,
            aiResult.category,
            departmentId,
            aiResult.priority,
            textPreparation.source_language === 'hi' ? null : aiResult.confidence,
            sentimentResult.sentiment,
            sentimentResult.score,
            textPreparation.source_language || 'en',
            Boolean(textPreparation.translation_used),
            textPreparation.translation_note || null,
            resolutionResult.estimated_hours,
            resolutionResult.estimated_label,
            moderationResult.is_profane,
            moderationResult.spam_score,
            moderationResult.spam_signals,
            initialFake.score,
            initialFake.signals,
            initialFake.isLikelyFake,
        ]
    );

    const complaintId = insertResult.rows[0].id;

    try {
        const embedding = await fetchEmbedding(analysisText);
        await pool.query(
            'INSERT INTO complaint_embeddings (complaint_id, embedding) VALUES ($1, $2)',
            [complaintId, embedding]
        );

        const [repeatedOfId, duplicateMatches] = await Promise.all([
            findRepeatedSubmission(embedding, req.user.id, complaintId),
            findSimilarComplaints(embedding, complaintId),
        ]);

        const finalFake = computeFakeScore({
            gibberishResult: fakeResult,
            spamScore: moderationResult.spam_score,
            isRepeatedSubmission: !!repeatedOfId,
            duplicateCount: duplicateMatches.length,
        });

        await pool.query(
            `UPDATE complaints
             SET is_repeated_submission = $1, repeated_of_complaint_id = $2,
                 fake_score = $3, fake_signals = $4, is_likely_fake = $5
             WHERE id = $6`,
            [!!repeatedOfId, repeatedOfId, finalFake.score, finalFake.signals, finalFake.isLikelyFake, complaintId]
        );
    } catch (err) {
        console.error('Embedding generation failed, duplicate detection will skip this complaint:', err.message);
    }

    let complaint = {
        id: complaintId,
        title,
        description,
        location_text: location_text || null,
        status: insertResult.rows[0].status,
        created_at: insertResult.rows[0].created_at,
    };
    try {
        const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [complaintId]);
        if (rows[0]) complaint = stripModerationFields(rows[0], req.user.role);
    } catch (err) {
        // The complaint is already committed. A failure to load the expanded
        // response must not make the citizen think the submission failed.
        console.error('Complaint saved but response details could not be loaded:', err);
    }

    try {
        await createNotification({
            userId: req.user.id,
            complaintId,
            type: 'complaint_submitted',
            title: textPreparation.source_language === 'hi' ? 'शिकायत दर्ज की गई' : 'Complaint submitted',
            message: textPreparation.source_language === 'hi'
                ? `आपकी शिकायत "${title}" सफलतापूर्वक दर्ज की गई। संदर्भ: CIV-${String(complaintId).padStart(5, '0')}.`
                : `Your complaint "${title}" was submitted successfully. Reference: CIV-${String(complaintId).padStart(5, '0')}.`,
        });
    } catch (err) {
        console.error('Citizen submission notification failed:', err.message);
    }

    try {
        await notifyDeptAdmins({
            departmentId,
            complaintId,
            type: 'new_complaint',
            title: 'New complaint received',
            message: textPreparation.source_language === 'hi'
                ? `Hindi complaint received; AI category/priority are experimental and require staff review before department routing: ${title}`
                : `${title} — ${aiResult.category || 'Uncategorized'} (${aiResult.priority} priority, routed by AI at ${Math.round((aiResult.confidence || 0) * 100)}% confidence)`,
        });
    } catch (err) {
        console.error('Department admin notification failed:', err.message);
    }

    res.status(201).json(complaint);
});

router.post('/check-duplicates', requireAuth, async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        return res.status(400).json({ error: 'title and description are required' });
    }

    try {
        const textPreparation = await prepareAnalysisText(`${title}. ${description}`);
        const embedding = await fetchEmbedding(textPreparation.analysis_text || `${title}. ${description}`);
        const matches = await findSimilarComplaints(embedding, null);
        res.json({ possible_duplicates: matches });
    } catch (err) {
        console.error('Duplicate check failed:', err.message);
        res.json({ possible_duplicates: [] });
    }
});

// Registered before GET /:id so the literal path wins — otherwise Express
// would treat "hotspots" as an :id value.
router.get('/hotspots', requireAuth, requireRole('admin'), async (req, res) => {
    const { rows: geotagged } = await pool.query(
        `SELECT c.id, c.title, c.ai_category, c.ai_priority, c.status, c.latitude, c.longitude
         FROM complaints c
         WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL`
    );

    if (geotagged.length === 0) {
        return res.json({ clusters: [], noise: [] });
    }

    const byId = new Map(geotagged.map((c) => [c.id, c]));

    try {
        const { data } = await axios.post(
            `${process.env.AI_SERVICE_URL}/cluster-hotspots`,
            { points: geotagged.map((c) => ({ id: c.id, lat: c.latitude, lng: c.longitude })) },
            { timeout: 10000 }
        );

        const clusters = data.clusters.map((cluster) => ({
            cluster_id: cluster.cluster_id,
            center_lat: cluster.center_lat,
            center_lng: cluster.center_lng,
            count: cluster.count,
            complaints: cluster.point_ids.map((id) => byId.get(id)).filter(Boolean),
        }));
        const noise = data.noise_ids.map((id) => byId.get(id)).filter(Boolean);

        res.json({ clusters, noise });
    } catch (err) {
        console.error('Hotspot clustering failed:', err.message);
        res.status(502).json({ error: 'Hotspot clustering is temporarily unavailable' });
    }
});

router.get('/', requireAuth, async (req, res) => {
    if (req.user.role === 'admin') {
        const { rows } = await pool.query(`${COMPLAINT_SELECT} ORDER BY c.created_at DESC`);
        return res.json(rows);
    }
    if (req.user.role === 'dept_admin') {
        const { rows } = await pool.query(
            `${COMPLAINT_SELECT} WHERE c.department_id = $1 ORDER BY c.created_at DESC`,
            [req.user.department_id]
        );
        return res.json(rows);
    }
    const { rows } = await pool.query(
        `${COMPLAINT_SELECT} WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
        [req.user.id]
    );
    res.json(rows.map((row) => stripModerationFields(row, req.user.role)));
});

router.get('/:id', requireAuth, async (req, res) => {
    const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [req.params.id]);
    const complaint = rows[0];
    if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
    }
    const isOwnDeptComplaint = req.user.role === 'dept_admin' && complaint.department_id === req.user.department_id;
    if (req.user.role !== 'admin' && !isOwnDeptComplaint && complaint.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows: images } = await pool.query(
        `SELECT ${IMAGE_COLUMNS} FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at ASC`,
        [complaint.id]
    );
    complaint.images = images;

    res.json(stripModerationFields(complaint, req.user.role));
});

async function loadComplaintForOwner(req, res) {
    const { rows } = await pool.query('SELECT id, user_id FROM complaints WHERE id = $1', [req.params.id]);
    const complaint = rows[0];
    if (!complaint) {
        res.status(404).json({ error: 'Complaint not found' });
        return null;
    }
    if (req.user.role !== 'admin' && complaint.user_id !== req.user.id) {
        res.status(403).json({ error: 'Forbidden' });
        return null;
    }
    return complaint;
}

router.post('/:id/images', requireAuth, upload.array('images', 5), async (req, res) => {
    const complaint = await loadComplaintForOwner(req, res);
    if (!complaint) {
        // Clean up any files multer already wrote to disk before the ownership check failed.
        await Promise.all((req.files || []).map((f) => fs.unlink(f.path).catch(() => {})));
        return;
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
    }

    const inserted = [];
    for (const file of req.files) {
        const { rows } = await pool.query(
            `INSERT INTO complaint_images (complaint_id, file_path, original_name, mime_type, size_bytes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING ${IMAGE_COLUMNS}`,
            [complaint.id, `/uploads/${file.filename}`, file.originalname, file.mimetype, file.size]
        );
        let imageRow = rows[0];

        try {
            const analysis = await analyzeImage(path.join(UPLOADS_DIR, file.filename));
            const { rows: updatedRows } = await pool.query(
                `UPDATE complaint_images
                 SET detected_objects = $1, analysis_is_placeholder = $2, analysis_note = $3, analyzed_at = now()
                 WHERE id = $4
                 RETURNING ${IMAGE_COLUMNS}`,
                [JSON.stringify(analysis.detections), analysis.is_placeholder, analysis.note, imageRow.id]
            );
            imageRow = updatedRows[0];
        } catch (err) {
            console.error('Image analysis failed:', err.message);
        }

        inserted.push(imageRow);
    }

    res.status(201).json(inserted);
});

router.delete('/:id/images/:imageId', requireAuth, async (req, res) => {
    const complaint = await loadComplaintForOwner(req, res);
    if (!complaint) return;

    const { rows } = await pool.query(
        'DELETE FROM complaint_images WHERE id = $1 AND complaint_id = $2 RETURNING file_path',
        [req.params.imageId, complaint.id]
    );
    const deleted = rows[0];
    if (!deleted) {
        return res.status(404).json({ error: 'Image not found' });
    }

    const filename = path.basename(deleted.file_path);
    await fs.unlink(path.join(UPLOADS_DIR, filename)).catch(() => {});

    res.status(204).send();
});

const VALID_STATUSES = ['submitted', 'in_progress', 'resolved', 'rejected'];

// Dept admins may only touch complaints already routed to their own
// department; the platform admin can touch anything. Returns the complaint's
// current department_id/user_id for the caller to act on, or null after
// writing an error response.
async function loadComplaintForStaffAccess(req, res) {
    const { rows } = await pool.query('SELECT id, user_id, department_id FROM complaints WHERE id = $1', [
        req.params.id,
    ]);
    const complaint = rows[0];
    if (!complaint) {
        res.status(404).json({ error: 'Complaint not found' });
        return null;
    }
    if (req.user.role === 'dept_admin' && complaint.department_id !== req.user.department_id) {
        res.status(403).json({ error: 'This complaint is not in your department' });
        return null;
    }
    return complaint;
}

router.patch('/:id/status', requireAuth, requireAnyRole(['admin', 'dept_admin']), async (req, res) => {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const target = await loadComplaintForStaffAccess(req, res);
    if (!target) return;

    const result = await pool.query(
        `UPDATE complaints
         SET status = $1, updated_at = now(), resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE NULL END
         WHERE id = $2
         RETURNING id`,
        [status, req.params.id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
    }

    const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [req.params.id]);
    const complaint = rows[0];

    try {
        await createNotification({
            userId: complaint.user_id,
            complaintId: complaint.id,
            type: 'status_changed',
            title: complaint.source_language === 'hi' ? 'शिकायत की स्थिति अपडेट हुई' : 'Complaint status updated',
            message: complaint.source_language === 'hi'
                ? `आपकी शिकायत "${complaint.title}" की स्थिति अब ${HI_STATUS_LABELS[status] || status} है।`
                : `Your complaint "${complaint.title}" is now ${status.replace('_', ' ')}`,
        });
    } catch (err) {
        console.error('Citizen notification failed:', err.message);
    }

    res.json(complaint);
});

router.patch('/:id/assign', requireAuth, requireAnyRole(['admin', 'dept_admin']), async (req, res) => {
    const { officer_id } = req.body;

    const target = await loadComplaintForStaffAccess(req, res);
    if (!target) return;

    if (officer_id != null) {
        const officerRow = await pool.query('SELECT id FROM officers WHERE id = $1', [officer_id]);
        if (officerRow.rows.length === 0) {
            return res.status(400).json({ error: 'Officer not found' });
        }
    }

    const result = await pool.query(
        'UPDATE complaints SET assigned_officer_id = $1, updated_at = now() WHERE id = $2 RETURNING id',
        [officer_id || null, req.params.id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
    }

    if (officer_id != null) {
        await pool.query(
            'INSERT INTO officer_assignments (complaint_id, officer_id, assigned_by) VALUES ($1, $2, $3)',
            [req.params.id, officer_id, req.user.id]
        );
    }

    const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [req.params.id]);
    const complaint = rows[0];

    if (officer_id != null) {
        try {
            await createNotification({
                userId: complaint.user_id,
                complaintId: complaint.id,
                type: 'officer_assigned',
                title: complaint.source_language === 'hi' ? 'अधिकारी नियुक्त किया गया' : 'Officer assigned',
                message: complaint.source_language === 'hi'
                    ? `${complaint.assigned_officer_name} को आपकी शिकायत "${complaint.title}" के लिए नियुक्त किया गया है।`
                    : `${complaint.assigned_officer_name} has been assigned to your complaint "${complaint.title}"`,
            });
        } catch (err) {
            console.error('Citizen notification failed:', err.message);
        }
    }

    res.json(complaint);
});

// Manual override for when the AI classifier routes a complaint to the
// wrong department. Either the platform admin or the dept_admin who
// currently "owns" the complaint can trigger it; the newly-targeted
// department's admin(s) get notified same as an AI-routed complaint would.
router.patch('/:id/reassign-department', requireAuth, requireAnyRole(['admin', 'dept_admin']), async (req, res) => {
    const { department_id } = req.body;
    if (!department_id) {
        return res.status(400).json({ error: 'department_id is required' });
    }

    const target = await loadComplaintForStaffAccess(req, res);
    if (!target) return;

    const deptRow = await pool.query('SELECT id FROM departments WHERE id = $1', [department_id]);
    if (deptRow.rows.length === 0) {
        return res.status(400).json({ error: 'Department not found' });
    }

    const result = await pool.query(
        'UPDATE complaints SET department_id = $1, updated_at = now() WHERE id = $2 RETURNING id',
        [department_id, req.params.id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
    }

    const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [req.params.id]);
    const complaint = rows[0];

    try {
        await notifyDeptAdmins({
            departmentId: department_id,
            complaintId: complaint.id,
            type: 'new_complaint',
            title: 'Complaint reassigned to your department',
            message: `"${complaint.title}" was reassigned to ${complaint.department_name} by ${req.user.role === 'admin' ? 'the platform admin' : 'another department'}`,
        });
    } catch (err) {
        console.error('Department admin notification failed:', err.message);
    }

    res.json(complaint);
});

router.post('/:id/feedback', requireAuth, async (req, res) => {
    const { rating, review } = req.body;
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const { rows: complaintRows } = await pool.query('SELECT id, user_id, status FROM complaints WHERE id = $1', [
        req.params.id,
    ]);
    const complaint = complaintRows[0];
    if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
    }
    if (complaint.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (complaint.status !== 'resolved') {
        return res.status(400).json({ error: 'Feedback can only be left once a complaint is resolved' });
    }

    const existing = await pool.query('SELECT id FROM feedback WHERE complaint_id = $1', [req.params.id]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Feedback has already been submitted for this complaint' });
    }

    await pool.query('INSERT INTO feedback (complaint_id, user_id, rating, review) VALUES ($1, $2, $3, $4)', [
        req.params.id,
        req.user.id,
        ratingNum,
        review || null,
    ]);

    const { rows } = await pool.query(`${COMPLAINT_SELECT} WHERE c.id = $1`, [req.params.id]);
    res.status(201).json(stripModerationFields(rows[0], req.user.role));
});

module.exports = router;
