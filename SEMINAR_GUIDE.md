# Civic AI - Project Seminar Guide

## 1. Project Overview

**Civic AI** is an AI-assisted civic grievance management platform. It connects citizens, municipal administrators, department administrators, and field officers through one complaint lifecycle.

A citizen can submit a civic issue using text, voice, photographs, and a map location. The system then classifies the issue, routes it to a department, estimates its priority and resolution time, checks for duplicates and suspicious content, and notifies the responsible staff. Administrators can assign officers, update status, inspect hotspot maps, study analytics, download reports, and review AI-assisted insights. Citizens can follow progress and rate the final resolution.

### Core problem

Traditional grievance systems often suffer from:

- Incorrect department selection by citizens
- Slow manual triage
- Duplicate complaints for the same incident
- Limited visibility into issue hotspots
- Weak communication between citizens and authorities
- Poor use of historical and operational data

### Proposed solution

Civic AI automates the first level of triage while keeping humans responsible for operational decisions. AI proposes categories, priorities, and signals; administrators verify, reassign, and resolve complaints.

## 2. Main Objectives

1. Make complaint submission simple and accessible.
2. Automatically classify and route complaints.
3. Highlight urgent, suspicious, or repeated complaints.
4. Give citizens transparent status tracking.
5. Give administrators operational dashboards, maps, and reports.
6. Preserve human oversight for important decisions.
7. Clearly disclose which features are trained models, pretrained models, statistical methods, or heuristics.

## 3. System Architecture

The project uses a three-service architecture.

```text
Citizen/Admin Browser
        |
        | HTTP + Socket.IO
        v
React Frontend (Vite) - Port 5173
        |
        | REST API + JWT
        v
Node.js/Express Backend - Port 5000
        |                         |
        | SQL                     | HTTP
        v                         v
PostgreSQL Database        Python FastAPI AI Service - Port 8000
                                  |
                                  |-- scikit-learn models
                                  |-- Sentence Transformers
                                  |-- VADER sentiment
                                  |-- DBSCAN clustering
                                  |-- YOLOv8n + OpenCV
                                  |-- Rule-based heuristics
```

### Why three services?

- The **frontend** owns the user experience.
- The **backend** owns authentication, authorization, business rules, database operations, reports, notifications, and orchestration.
- The **AI service** isolates Python machine-learning dependencies and exposes model capabilities through clear HTTP endpoints.

This separation allows each service to be developed, tested, scaled, or replaced independently.

## 4. Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | Component-based user interface |
| Vite 8 | Development server and production bundling |
| React Router 7 | Client-side routes and protected pages |
| Tailwind CSS 4 | Responsive design system and styling |
| Axios | REST API communication |
| Socket.IO Client | Real-time notifications |
| React Leaflet + Leaflet | Interactive maps and location markers |
| leaflet.heat | Complaint density heatmaps |
| Recharts | Analytics and insight charts |
| Framer Motion | Controlled page/component transitions |
| React Markdown | Formatted chatbot responses and links |
| Oxlint | Frontend static analysis |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express 4 | REST API and middleware |
| PostgreSQL | Relational data storage |
| `pg` | PostgreSQL connection pooling and queries |
| JWT / `jsonwebtoken` | Stateless authentication and role claims |
| bcryptjs | Password hashing and verification |
| Socket.IO | Real-time authenticated notifications |
| Multer | Secure multipart image uploads |
| Axios | Calls from backend to AI service and Nominatim |
| ExcelJS | Excel report generation |
| PDFKit | PDF report generation |
| dotenv | Local environment configuration |
| Nodemon | Development auto-restart |

### AI Service

| Technology | Purpose |
|---|---|
| Python 3.12 | AI service runtime |
| FastAPI | Typed HTTP endpoints |
| Uvicorn | ASGI server |
| Pydantic | Request/response validation |
| scikit-learn | Classification, regression, and clustering |
| Pandas / NumPy | Data processing and numerical operations |
| Joblib | Model persistence |
| Sentence Transformers | Semantic text embeddings |
| VADER Sentiment | Rule/lexicon-based sentiment scoring |
| Ultralytics YOLOv8n | Pretrained general object detection |
| OpenCV Headless | Image decoding and civic-issue heuristics |

### Design and development tools

- Visual Studio Code
- Git and GitHub
- PostgreSQL/pgAdmin
- Google Stitch for UI design references
- PowerShell/terminal for service management and testing
- Browser DevTools for responsive testing

## 5. User Roles and Access Control

### Citizen

- Register and log in
- Submit complaints
- Use speech input
- Add location and photos
- See possible duplicates before submission
- View only their complaints
- Track complaint status and assigned officer
- View AI analysis and estimates
- Upload/delete permitted complaint images
- Submit feedback after resolution
- Receive notifications
- Use the help chatbot

### Platform Admin

- View complaints across all departments
- Search and filter the complaint queue
- Reassign departments
- Assign/unassign officers
- Update complaint status
- See moderation/fake/repeated flags
- Manage officers
- View analytics, hotspots, and AI insights
- Download CSV, Excel, and PDF reports
- Receive platform notifications

### Department Admin

- View only complaints routed to their department
- Access officers from their department for assignment
- Manage permitted complaint operations
- Does not receive platform-wide analytics, reports, hotspots, or officer-management navigation

### Security implementation

- Passwords are hashed using bcrypt.
- Successful login returns a signed JWT valid for seven days.
- The frontend sends `Authorization: Bearer <token>` through an Axios interceptor.
- Express middleware verifies the JWT.
- `requireRole` and `requireAnyRole` enforce route-level authorization.
- Socket.IO connections also verify the JWT before joining private user/admin rooms.

## 6. Implemented Features and How They Work

### 6.1 Authentication and registration

Citizen registration stores a bcrypt password hash. Login compares the submitted password with the hash and issues a JWT containing user ID, role, and department scope where applicable.

Frontend routes are protected using role-aware route components. The backend independently enforces permissions, so hiding a frontend link is not treated as security.

### 6.2 Complaint submission

The citizen provides:

- Title
- Detailed description
- Optional spoken transcript
- Address/location text
- Optional latitude and longitude
- Up to five optional photographs

The frontend first requests a duplicate check. If similar complaints are found, it displays their IDs, titles, similarity scores, and statuses. The citizen may inspect them or explicitly submit anyway.

After submission, the backend calls several AI endpoints in parallel, stores the resulting fields, generates an embedding, performs duplicate/repeated-submission analysis, and sends department/admin notifications.

### 6.3 Voice complaint input

The browser Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`) converts speech to text. The transcript is appended to the description field.

This feature depends on browser support, usually Chrome or Edge. Audio is not stored by this application.

### 6.4 Category classification and department routing

**Type:** Trained supervised machine-learning model

Training pipeline:

```text
Complaint text
  -> TF-IDF vectorizer using unigrams and bigrams
  -> Logistic Regression classifier
  -> Category probabilities
```

The model is trained from `ai-service/data/seed_complaints.csv` and persisted as `model.joblib`.

Supported categories:

- Roads
- Water Supply
- Electricity
- Garbage
- Drainage
- Health
- Transport
- Public Safety

The highest-probability category becomes the suggested category. Its probability is shown as model confidence. Categories map one-to-one to seeded department names. Admins can manually reassign the department, preserving human oversight.

### 6.5 Priority detection

**Type:** Transparent rule-based system

Critical keywords include fire, live/exposed wire, collapse, flooding, gas leak, accident, explosion, and electrocution-related language.

High-priority keywords include sparking, no water, contamination, outbreaks, unsafe buildings, danger, overflowing, blockage, and burst pipes.

If no urgent keyword matches, a category-specific default is used. Priorities are Low, Medium, High, and Critical.

### 6.6 Sentiment analysis

**Type:** Lexicon/rule-based NLP using VADER

VADER calculates a compound score from `-1` to `+1`.

- Score >= `0.05`: Positive
- Score <= `-0.05`: Negative
- Otherwise: Neutral

Sentiment helps administrators identify distressed or strongly dissatisfied citizens. It is not used as proof that a complaint is true or urgent.

### 6.7 Semantic duplicate detection

**Type:** Pretrained sentence-embedding model + cosine similarity

The application uses `all-MiniLM-L6-v2` from Sentence Transformers to generate a normalized 384-dimensional vector from the title and description.

Embeddings are stored as PostgreSQL `DOUBLE PRECISION[]`, so pgvector is not required.

Because vectors are normalized, cosine similarity is computed as a dot product. Existing complaints above the configured similarity threshold are returned as possible duplicates.

Repeated-submission detection uses a stricter threshold, the same citizen, and a 24-hour time window.

### 6.8 Spam, profanity, and fake-complaint signals

These checks are visible only to staff.

**Profanity:** Matches a deliberately short generic word list. It is not a hate-speech classifier.

**Spam:** Scores signals such as:

- Extremely short content
- Excessive capital letters
- Repeated characters
- URLs
- Excessive symbols
- Promotional phrases
- Repetitive wording

**Fake likelihood:** This does not claim to determine truth. There is no labeled fake/genuine dataset. It combines:

- Gibberish/no-vowel/consonant-cluster heuristics
- Spam score
- Same-user repeated submission
- Semantic duplicate matches

The result is an admin review signal, not an automatic rejection.

### 6.9 Location selection and reverse geocoding

Citizens can click an interactive Leaflet map or use browser geolocation. Latitude and longitude are stored with the complaint.

The backend proxies reverse-geocoding requests to OpenStreetMap Nominatim with a required User-Agent. This avoids direct browser cross-origin dependency and centralizes timeout/error handling.

### 6.10 Hotspot detection

**Type:** Unsupervised machine learning using DBSCAN

Only complaints with coordinates are included. Coordinates are converted to radians and clustered with DBSCAN using the haversine distance metric.

Current defaults:

- Radius: 0.5 km
- Minimum nearby reports: 3

The response separates clusters from isolated/noise reports. The admin UI displays:

- Leaflet base map
- Heatmap layer
- Cluster circle markers
- Isolated reports
- Complaint links inside map popups

### 6.11 Image upload and analysis

The frontend and backend both enforce:

- JPEG, PNG, WEBP, or GIF
- Maximum 5 MB per image
- Maximum five images per upload

Multer stores files using timestamp + UUID filenames. Files are served through the backend `/uploads` path.

Image analysis combines two approaches:

1. **YOLOv8n pretrained on COCO:** Detects general objects such as people, vehicles, and common objects. It is not trained specifically for potholes or civic damage.
2. **OpenCV heuristics:** Produces rough candidates for potholes, garbage, and water logging using darkness, contour, edge, texture, saturation, and coverage rules.

The UI labels the source and confidence and warns that OpenCV candidates are hints, not verified findings.

### 6.12 Resolution-time estimation

**Type:** Random Forest regression trained on synthetic SLA-derived data

Inputs:

- Category
- Priority

The training script generates synthetic examples from priority SLA baselines and category multipliers, one-hot encodes categorical inputs, and trains a 200-tree Random Forest with maximum depth 6.

The estimate is converted to a human-readable label such as hours, days, or weeks.

Important disclosure: the current model is not trained on real deployment resolution history. Once enough genuine resolved complaints exist, the same model contract can be retrained using real durations.

### 6.13 Officer management and assignment

Admins can create, edit, activate/deactivate, and delete officers. Complaints can be assigned or unassigned from the queue.

The database stores both:

- Current officer on the complaint for efficient queries
- Append-only assignment history for traceability

Officer performance is a transparent ratio: resolved complaints divided by total ever assigned. It remains unavailable rather than fabricated until an officer has assignments.

### 6.14 Complaint status and citizen feedback

Statuses:

- Submitted
- In Progress
- Resolved
- Rejected

When a complaint becomes resolved, `resolved_at` is stored for real resolution-time analytics. If moved away from resolved, that timestamp is cleared.

After resolution, the complaint owner can submit one rating from 1 to 5 and an optional review.

### 6.15 Real-time notifications

Notifications are stored in PostgreSQL and delivered through authenticated Socket.IO rooms.

Each connected user joins `user:<id>`. Platform admins also join an admin room. Department notifications are routed to department-admin accounts; unclassified complaints fall back to platform admins.

The frontend supports:

- Unread count
- Notification dropdown
- Mark one as read
- Mark all as read
- Complaint navigation
- Live arrival without page refresh

### 6.16 Chat assistant

**Type:** Rule-based assistant, not an LLM

The chatbot detects intents from keywords and regular expressions. It can:

- Track a complaint by ID
- List recent citizen complaints
- Explain department responsibilities
- Explain submission, priority, duplicates, photos, location, security, and estimates
- Give admin help

It performs permission-aware database lookups and stores message/reply/intent history in `chatbot_logs`.

### 6.17 Analytics dashboard

Analytics are computed from live PostgreSQL data, not hardcoded UI values.

Implemented metrics include:

- Monthly complaint volume
- Department distribution
- Priority and status distribution
- Total, pending, and resolved counts
- Resolution rate
- Real average resolution hours
- Top categories and locations
- Active officer workload
- Citizen satisfaction
- Department ratings

Recharts renders the visualizations.

### 6.18 AI insights and recommendations

The insights service calculates:

- Average model confidence and confidence by category
- Common complaint keywords
- Monthly sentiment trends
- Department pending workload
- Month-over-month complaint growth
- Unassigned complaint count
- Moderation summary
- Operational recommendations

The monthly forecast is ordinary least-squares linear trend extrapolation, not a validated forecasting model. Recommendations are transparent conditional rules based on growth, backlog, confidence, sentiment change, and unassigned volume.

### 6.19 Reports

Platform admins can download four report families:

- Complaints
- Departments
- Monthly activity
- Analytics summary

Available formats:

- CSV through a structured serializer
- Excel using ExcelJS
- PDF using PDFKit

Reports use current database data and proper download content types.

## 7. Database Design

Main tables:

| Table | Responsibility |
|---|---|
| `users` | Citizens, platform admins, and department admins |
| `departments` | Eight civic departments |
| `complaints` | Core grievance, AI fields, workflow status, location, assignment, moderation |
| `complaint_images` | Uploaded files and image-analysis results |
| `complaint_embeddings` | 384-dimensional semantic vectors |
| `officers` | Field officer directory and status |
| `officer_assignments` | Assignment history |
| `notifications` | Persistent user notifications and read status |
| `chatbot_logs` | Chat messages, replies, and detected intent |
| `feedback` | One post-resolution citizen rating per complaint |

The schema uses foreign keys, check constraints, unique constraints, cascading image/notification cleanup, and `ON DELETE SET NULL` for officer removal so deleting an officer never deletes complaints.

## 8. Frontend Routes

### Public

- `/` - Landing page
- `/about` - Transparent AI capability explanation
- `/login` - Citizen login
- `/register` - Citizen registration
- `/admin/login` - Staff login

### Citizen/protected

- `/dashboard` - Citizen complaint dashboard
- `/complaints/new` - Complaint intake form
- `/complaints/:id` - Complaint details, map, images, analysis, and feedback

### Platform admin/protected

- `/admin/dashboard` - Ticket queue and inline operations
- `/admin/hotspots` - Heatmap and DBSCAN clusters
- `/admin/analytics` - Operational analytics
- `/admin/officers` - Officer management
- `/admin/reports` - Report downloads
- `/admin/insights` - AI and operational insights

## 9. User Interface and Design System

The frontend was redesigned using Google Stitch references and `DESIGN.md` while preserving the existing application logic.

Design principles:

- Modern governance and calm efficiency
- Civic teal primary color
- Inter typography
- Neutral high-contrast surfaces
- Semantic amber/red/teal states
- Restrained 6-8 px radii
- Borders and tonal layers instead of heavy shadows
- Responsive admin sidebar and mobile drawer
- Compact, scan-friendly operational tables
- Accessible labels, loading states, empty states, and errors
- Light and dark themes

Shared UI includes semantic badges, KPI cards, data tables, charts, notifications, chatbot, image dropzone, maps, skeletons, toasts, and responsive navigation.

## 10. End-to-End Complaint Flow

```text
1. Citizen registers/logs in.
2. Citizen enters title and description or uses voice input.
3. Citizen optionally pins a location and uploads photos.
4. Frontend requests semantic duplicate check.
5. Citizen confirms submission.
6. Backend verifies JWT and validates data.
7. Backend calls AI endpoints in parallel:
   - classification
   - sentiment
   - moderation
   - fake/gibberish signal
8. Backend maps category to a department.
9. Backend requests a resolution estimate.
10. Complaint is stored in PostgreSQL.
11. Embedding is generated and stored.
12. Duplicate and repeated-submission checks update staff-only flags.
13. Photos are stored and analyzed by YOLO/OpenCV.
14. Responsible admins receive persistent + real-time notifications.
15. Admin verifies routing, assigns an officer, and updates status.
16. Citizen receives progress notifications.
17. On resolution, real duration is recorded.
18. Citizen submits feedback.
19. Analytics, insights, workload, and reports reflect the new data.
```

## 11. Reliability and Graceful Degradation

The backend catches individual AI-call failures during complaint submission. If the AI service is unavailable, the complaint can still be stored with fallback/null AI values instead of losing the citizen's report.

This supports availability, but the AI service must be running for classification, sentiment, duplicates, moderation, fake signals, estimates, hotspots, and image analysis.

Health endpoints:

- Backend: `http://localhost:5000/health`
- AI service: `http://localhost:8000/health`

## 12. Current Limitations

1. Classification training data is seeded/synthetic and limited in scale.
2. Classification confidence is not the same as verified accuracy because submitted complaints do not have ground-truth labels.
3. Resolution prediction uses synthetic SLA-derived training data.
4. YOLOv8n is pretrained on general COCO objects, not civic damage.
5. Pothole, garbage, and water-logging image candidates are OpenCV heuristics.
6. Fake detection identifies suspicious text patterns, not factual truth.
7. Sentiment is VADER-based and may be less accurate for multilingual or code-mixed Indian text.
8. Voice input depends on browser support.
9. Reverse geocoding and map tiles require internet access.
10. Hotspots require at least three nearby geotagged complaints.
11. The chatbot is rule-based and supports defined intents, not open-ended reasoning.
12. The project currently runs as local development services; production deployment hardening is future work.

## 13. Future Scope

- Collect verified labels and retrain classification using real municipal complaints.
- Fine-tune a civic-specific YOLO model for potholes, garbage, leaks, and broken infrastructure.
- Train resolution prediction from real resolved complaint history.
- Add multilingual NLP for Marathi, Hindi, and code-mixed text.
- Use PostgreSQL pgvector or a vector database at larger scale.
- Add proper model evaluation dashboards: precision, recall, F1, confusion matrix, and drift.
- Add SLA breach alerts and escalation workflows.
- Add ward/zone boundaries and geofenced department routing.
- Add offline/PWA support for citizens and field officers.
- Add audit logs for every administrative action.
- Add email/SMS/push notification channels.
- Deploy with Docker, reverse proxy, managed PostgreSQL, secrets management, monitoring, and backups.
- Add accessibility and end-to-end automated test suites.

## 14. How to Run the Project

Open three terminals.

### AI service

```powershell
cd C:\Users\rushi\civic-ai\ai-service
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

### Backend

```powershell
cd C:\Users\rushi\civic-ai\backend
npm run dev
```

### Frontend

```powershell
cd C:\Users\rushi\civic-ai\frontend
npm run dev
```

Open `http://localhost:5173`.

## 15. Recommended Seminar Demonstration

### Before the seminar

1. Start PostgreSQL.
2. Start the AI service and confirm `/health`.
3. Start the backend and confirm `/health`.
4. Start the frontend.
5. Keep one citizen account and one admin account ready.
6. Prepare three geotagged complaints close together for the hotspot demo.
7. Keep one resolved complaint ready for feedback/analytics.

### Live demo sequence

1. Show the landing page and explain the three-service architecture.
2. Log in as a citizen.
3. Create a complaint using text or voice.
4. Pin the map location and attach an image.
5. Show the duplicate-check step.
6. Submit and open complaint details.
7. Explain category, confidence, priority, sentiment, estimate, and image-source labels.
8. Log in as admin.
9. Show the ticket queue, filters, AI confidence, and staff-only flags.
10. Reassign department, assign an officer, and update status.
11. Show the notification received by the citizen.
12. Show hotspot map and isolated reports.
13. Show analytics and AI insights.
14. Download one PDF or Excel report.
15. Mark a complaint resolved and show citizen feedback.

## 16. Suggested Presentation Structure

1. Title and team members
2. Problem statement
3. Proposed solution
4. User roles
5. System architecture
6. Technology stack
7. End-to-end complaint workflow
8. AI/ML features
9. Database design
10. Citizen UI demonstration
11. Admin UI demonstration
12. Analytics, hotspots, reports, and notifications
13. Security and access control
14. Honest limitations
15. Future scope
16. Conclusion

## 17. Common Viva Questions and Answers

### Why use Logistic Regression instead of a deep model for classification?

The current labeled dataset is small. TF-IDF with Logistic Regression is fast, interpretable, produces probabilities, and is a strong baseline for short text classification. A larger transformer would be harder to justify without enough labeled data.

### Is model confidence the same as accuracy?

No. Confidence is the model's probability for one prediction. Accuracy requires verified ground-truth labels across a test set. The UI and insights explicitly avoid calling average confidence verified accuracy.

### Why use DBSCAN for hotspots?

DBSCAN finds spatial clusters without requiring the number of clusters in advance and naturally labels isolated reports as noise. That matches civic complaints better than k-means.

### Why use Sentence Transformers for duplicates?

Keyword matching misses paraphrases. Sentence embeddings represent semantic meaning, so differently worded complaints about the same issue can still have high cosine similarity.

### Why not use pgvector?

The current data volume is small, so normalized vectors in PostgreSQL arrays and application-level dot products are sufficient and keep setup simple. pgvector is a future scaling improvement.

### Is the chatbot powered by ChatGPT or another LLM?

No. It is intentionally rule-based. It detects supported intents and performs permission-aware database lookups. This makes behavior predictable and inexpensive.

### Can the system really detect fake complaints?

It cannot prove truthfulness. It provides a review score from gibberish, spam, duplicate, and repeated-submission signals. A human administrator decides what action to take.

### Is image analysis trained for potholes?

Not yet. YOLOv8n recognizes general COCO objects. Pothole, garbage, and water-logging outputs currently come from OpenCV heuristics and are clearly labeled as candidates.

### How does the system remain available when AI is down?

Individual AI calls have fallbacks. The backend can still store a citizen complaint with default/null AI fields, preventing loss of an important report. AI-dependent features resume when the AI service is restarted.

### How is role-based access enforced?

Both frontend route guards and backend JWT middleware are used. The backend is authoritative and checks roles on every protected endpoint.

### How are real-time notifications secured?

Socket.IO verifies the JWT during connection. Each user joins a private room based on their verified user ID; notification events are emitted to that room.

### What makes the project different from a normal CRUD complaint portal?

It combines semantic duplicate detection, automatic routing, priority and sentiment signals, spatial clustering, image analysis, estimates, moderation, real-time notifications, analytics, reports, and role-scoped operations in one complete workflow.

## 18. Conclusion

Civic AI demonstrates an end-to-end, human-supervised grievance platform rather than an isolated ML notebook. Its main strength is integration: citizen input, machine-assisted triage, secure workflows, administrative action, real-time communication, geographic intelligence, analytics, and feedback all use one coherent data lifecycle.

The project also follows responsible presentation practices. It distinguishes trained models from pretrained models and heuristics, avoids treating confidence as accuracy, and keeps humans responsible for routing corrections, moderation decisions, officer assignment, and final resolution.