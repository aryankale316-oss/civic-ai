const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Multer's diskStorage does not create a callback-provided destination folder.
// Ensure it exists before the first image upload, including on a fresh clone.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
        cb(null, uniqueName);
    },
});

function fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES_PER_UPLOAD },
});

module.exports = { upload, UPLOADS_DIR, MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE_BYTES };
