-- Civic AI grievance platform: vertical-slice schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Widen the role constraint to add 'dept_admin' (department-scoped admin
-- accounts, routed to automatically by the classifier at submission time —
-- see backend/src/routes/complaints.js). Postgres has no ADD CONSTRAINT IF
-- NOT EXISTS, so drop-then-add is the idempotent way to keep this in sync
-- on databases that already have the old two-role constraint.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('citizen', 'admin', 'dept_admin'));

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Only set for role = 'dept_admin'; identifies which department's
-- complaints this account is scoped to. Added here (after `departments`
-- exists) since it's an FK reference.
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ai_category TEXT,
    department_id INTEGER REFERENCES departments(id),
    ai_priority TEXT CHECK (ai_priority IN ('Low', 'Medium', 'High', 'Critical')),
    ai_confidence REAL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint_images (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columns added after the initial release: CREATE TABLE IF NOT EXISTS above
-- is a no-op on a database that already has the `complaints` table, so these
-- keep existing deployments in sync when migrate.js is re-run.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative'));
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sentiment_score REAL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS source_language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_translation_used BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_translation_note TEXT;

-- Sentence embedding (all-MiniLM-L6-v2, 384 dims, pre-normalized) for each
-- complaint's title+description, used for duplicate detection via cosine
-- similarity. Plain float array — no pgvector extension required.
CREATE TABLE IF NOT EXISTS complaint_embeddings (
    complaint_id INTEGER PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE,
    embedding DOUBLE PRECISION[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Image object-detection results (potholes, garbage, leaks, etc). Populated
-- by the AI service's /detect-issues endpoint, currently a wired placeholder
-- (see ai-service/main.py) until a trained YOLOv8/OpenCV model exists.
ALTER TABLE complaint_images ADD COLUMN IF NOT EXISTS detected_objects JSONB;
ALTER TABLE complaint_images ADD COLUMN IF NOT EXISTS analysis_is_placeholder BOOLEAN;
ALTER TABLE complaint_images ADD COLUMN IF NOT EXISTS analysis_note TEXT;
ALTER TABLE complaint_images ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- Resolution-time estimate (see ai-service/train_resolution.py — trained on
-- synthetic SLA-derived data until real historical resolution times exist).
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS estimated_resolution_hours REAL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS estimated_resolution_label TEXT;

-- Set when status transitions to 'resolved' (and cleared if it moves away
-- again), used for real average-resolution-time analytics.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS officers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    department_id INTEGER REFERENCES departments(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only assignment history; complaints.assigned_officer_id (below)
-- always reflects the current assignment for fast joins/filtering.
CREATE TABLE IF NOT EXISTS officer_assignments (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    officer_id INTEGER NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ON DELETE SET NULL (not CASCADE) — removing an officer must never delete
-- the complaints that were assigned to them.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_officer_id INTEGER REFERENCES officers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Rule-based chatbot (no LLM — see backend/src/services/chatbot.js).
CREATE TABLE IF NOT EXISTS chatbot_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    intent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user ON chatbot_logs(user_id, created_at ASC);

-- One rating per complaint, left by its owner after resolution.
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moderation flags — heuristic-based (see ai-service/main.py /moderate),
-- never shown to the submitting citizen, admin-only.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_profane BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS spam_score REAL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS spam_signals TEXT[];
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_repeated_submission BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS repeated_of_complaint_id INTEGER REFERENCES complaints(id);

-- Fake-complaint composite score — combines the AI service's text-gibberish
-- heuristic (see ai-service/fake_detection.py) with the existing spam score
-- and duplicate/repeated-submission signals above (see
-- backend/src/routes/complaints.js). Admin-only, same as the moderation
-- flags — never shown to the submitting citizen.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS fake_score REAL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS fake_signals TEXT[];
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_likely_fake BOOLEAN NOT NULL DEFAULT false;
