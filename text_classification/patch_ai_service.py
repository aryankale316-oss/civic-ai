import os

target_path = r"c:\Users\rushi\civic-ai\ai-service\main.py"
with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Model loading paths
old_model_block = """BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")"""

new_model_block = """BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
CIVIC_TEXT_CLASSIFIER_PATH = os.getenv(
    "CIVIC_TEXT_CLASSIFIER_PATH",
    os.path.join(PROJECT_ROOT, "text_classification", "civic_text_classifier.joblib"),
)
CIVIC_TEXT_CLASSES_PATH = os.getenv(
    "CIVIC_TEXT_CLASSES_PATH",
    os.path.join(PROJECT_ROOT, "text_classification", "class_labels.json"),
)"""

assert old_model_block in content, "old_model_block not found"
content = content.replace(old_model_block, new_model_block, 1)

# 2. Add bilingual model loader after app creation
old_app_block = """app = FastAPI(title="Civic AI Classification Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load(MODEL_PATH)"""

new_app_block = """app = FastAPI(title="Civic AI Classification Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the newly trained bilingual text classifier if present (project-relative path)
bilingual_text_model = None
bilingual_model_version = None

if os.path.exists(CIVIC_TEXT_CLASSIFIER_PATH):
    try:
        bilingual_text_model = joblib.load(CIVIC_TEXT_CLASSIFIER_PATH)
        bilingual_model_version = "civic-linear-svc-bilingual-v1"
        print(f"[AI Service] Loaded bilingual text classifier from {CIVIC_TEXT_CLASSIFIER_PATH}")
    except Exception as exc:
        print(f"[AI Service] WARNING: Could not load bilingual text classifier from {CIVIC_TEXT_CLASSIFIER_PATH}: {exc}. Using legacy model.")
        bilingual_text_model = None
else:
    print(f"[AI Service] Bilingual classifier not found at {CIVIC_TEXT_CLASSIFIER_PATH}. Using legacy model.")

model = joblib.load(MODEL_PATH)"""

assert old_app_block in content, "old_app_block not found"
content = content.replace(old_app_block, new_app_block, 1)

# 3. ClassifyResponse model
old_response = """class ClassifyResponse(BaseModel):
    category: str
    department: str
    priority: str
    confidence: float"""

new_response = """class ClassifyResponse(BaseModel):
    category: str
    department: str
    priority: str
    confidence: float | None = None
    is_suggestion: bool = True
    model_version: str = "civic-linear-svc-bilingual-v1"
    top_margin_score: float | None = None
    margin_difference: float | None = None
    scores_note: str | None = None"""

assert old_response in content, "old_response not found"
content = content.replace(old_response, new_response, 1)

# 4. classify endpoint
old_classify = """@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    probabilities = model.predict_proba([req.text])[0]
    classes = model.classes_
    # Filter legacy model outputs so retired departments can never be returned.
    eligible = [(CATEGORY_ALIASES[name], float(prob)) for name, prob in zip(classes, probabilities) if name in CATEGORY_ALIASES]
    if not eligible:
        raise HTTPException(status_code=503, detail="Classifier has no configured department classes; retrain the model.")
    category, confidence = max(eligible, key=lambda item: item[1])

    department = CATEGORY_TO_DEPARTMENT.get(category, category)
    priority = predict_priority(req.text, category)

    return ClassifyResponse(
        category=category,
        department=department,
        priority=priority,
        confidence=round(confidence, 4),
    )"""

new_classify = """@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    text = (req.text or "").strip()
    if not text:
        # Safe fallback for empty or whitespace-only text (Requirement 5)
        default_cat = "Roads and Footpaths"
        return ClassifyResponse(
            category=default_cat,
            department=CATEGORY_TO_DEPARTMENT.get(default_cat, default_cat),
            priority="Medium",
            confidence=None,
            is_suggestion=True,
            model_version="fallback-empty-text",
            top_margin_score=None,
            margin_difference=None,
            scores_note="Empty or whitespace-only text provided; default fallback returned.",
        )

    # Use bilingual text classifier if loaded
    if bilingual_text_model is not None:
        try:
            margins = bilingual_text_model.decision_function([text])[0]
            classes = list(bilingual_text_model.classes_)
            ranked_indices = np.argsort(margins)[::-1]
            top_idx = ranked_indices[0]
            second_idx = ranked_indices[1] if len(ranked_indices) > 1 else None

            raw_cat = classes[top_idx]
            category = CATEGORY_ALIASES.get(raw_cat, raw_cat)
            department = CATEGORY_TO_DEPARTMENT.get(category, category)
            priority = predict_priority(text, category)

            top_margin = float(margins[top_idx])
            margin_diff = (
                float(margins[top_idx] - margins[second_idx])
                if second_idx is not None
                else None
            )

            return ClassifyResponse(
                category=category,
                department=department,
                priority=priority,
                confidence=None,  # LinearSVC output is uncalibrated margin distance, not a probability
                is_suggestion=True,
                model_version=bilingual_model_version or "civic-linear-svc-bilingual-v1",
                top_margin_score=round(top_margin, 4),
                margin_difference=round(margin_diff, 4) if margin_diff is not None else None,
                scores_note="Raw uncalibrated decision margin distances from separating hyperplanes — not probabilities. AI department suggestion for human review.",
            )
        except Exception as e:
            print(f"[AI Service] WARNING: Bilingual text classifier prediction error: {e}. Falling back to legacy model.")

    # Legacy model fallback
    try:
        probabilities = model.predict_proba([text])[0]
        classes = model.classes_
        eligible = [(CATEGORY_ALIASES[name], float(prob)) for name, prob in zip(classes, probabilities) if name in CATEGORY_ALIASES]
        if eligible:
            category, confidence = max(eligible, key=lambda item: item[1])
            department = CATEGORY_TO_DEPARTMENT.get(category, category)
            priority = predict_priority(text, category)
            return ClassifyResponse(
                category=category,
                department=department,
                priority=priority,
                confidence=round(confidence, 4),
                is_suggestion=True,
                model_version="legacy-logistic-regression",
                top_margin_score=None,
                margin_difference=None,
                scores_note="Legacy model fallback with probability estimate.",
            )
    except Exception as e:
        print(f"[AI Service] ERROR: Legacy classifier also failed: {e}. Falling back to default.")

    default_cat = "Roads and Footpaths"
    return ClassifyResponse(
        category=default_cat,
        department=CATEGORY_TO_DEPARTMENT.get(default_cat, default_cat),
        priority="Medium",
        confidence=None,
        is_suggestion=True,
        model_version="fallback-default",
        top_margin_score=None,
        margin_difference=None,
        scores_note="Classifier unavailable; safe fallback returned.",
    )"""

assert old_classify in content, "old_classify not found"
content = content.replace(old_classify, new_classify, 1)

with open(target_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(content)

print("ai-service/main.py successfully patched!")
