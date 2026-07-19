# Civic AI — Vertical Slice

Citizen submits a complaint → AI classifies it (category/department/priority) → admin reviews and updates status. Three services, run separately.

## Services

| Service | Path | Port | Stack |
|---|---|---|---|
| Backend API | `backend/` | 5000 | Node/Express + PostgreSQL + JWT |
| AI service | `ai-service/` | 8000 | Python/FastAPI + scikit-learn |
| Frontend | `frontend/` | 5173 | React + Vite + Tailwind |

## First-time setup

PostgreSQL 18 must be running locally (Windows service `postgresql-x64-18`, trust auth on 127.0.0.1, database `civic_ai`).

```bash
# Backend
cd backend
npm install
npm run db:migrate   # creates tables (safe to re-run)
npm run db:seed      # seeds departments + admin user (safe to re-run)

# AI service
cd ai-service
python -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python train.py   # trains model.joblib

# Frontend
cd frontend
npm install
```

## Running

Open three terminals:

```bash
cd backend && npm run dev        # http://localhost:5000
cd ai-service && venv\Scripts\python -m uvicorn main:app --port 8000
cd frontend && npm run dev       # http://localhost:5173
```

## Logins

- Citizen: register at `/register`
- Admin: `admin@civicai.gov` / `Admin@12345` at `/admin/login` (from `backend/.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD`)

## Notes

- `backend/.env` and `frontend/.env` are gitignored — don't commit real secrets if this becomes a shared repo.
- AI classification currently covers 8 categories (Roads, Water Supply, Electricity, Garbage, Drainage, Health, Transport, Public Safety) trained on `ai-service/data/seed_complaints.csv`. Retrain with `python train.py` after editing that file.
- Photo analysis uses a pretrained YOLOv8n (COCO) model plus OpenCV heuristics for pothole/garbage/water-logging candidates — see `/about` in the app for an honest per-feature breakdown of what's a trained model vs. a heuristic. `yolov8n.pt` auto-downloads to `ai-service/` on first run (needs internet once).
- Fake-complaint detection is a composite heuristic (text-gibberish check + spam score + duplicate/repeated-submission signals), not a trained classifier — there's no labeled fake/genuine dataset to train on yet.
