import os
from typing import List

import cv2
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from ultralytics import YOLO
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from priority import predict_priority
from moderation import moderate_text
from fake_detection import check_gibberish
from image_detection import detect_civic_issues
from translation import prepare_text, translate_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
CIVIC_TEXT_CLASSIFIER_PATH = os.getenv(
    "CIVIC_TEXT_CLASSIFIER_PATH",
    os.path.join(PROJECT_ROOT, "text_classification", "civic_text_classifier.joblib"),
)
CIVIC_TEXT_CLASSES_PATH = os.getenv(
    "CIVIC_TEXT_CLASSES_PATH",
    os.path.join(PROJECT_ROOT, "text_classification", "class_labels.json"),
)
RESOLUTION_MODEL_PATH = os.path.join(BASE_DIR, "resolution_model.joblib")
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")
CUSTOM_CIVIC_MODEL_PATH = os.getenv(
    "CIVIC_DETECTOR_MODEL_PATH",
    os.path.join(BASE_DIR, "models", "civic_detector", "weights", "best.pt"),
)

app = FastAPI(title="Civic AI Classification Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the bilingual text classifier if present (supports text_classification/ and ai-service/ locations)
candidate_classifier_paths = [
    os.getenv("CIVIC_TEXT_CLASSIFIER_PATH"),
    os.path.join(PROJECT_ROOT, "text_classification", "civic_text_classifier.joblib"),
    os.path.join(BASE_DIR, "civic_text_classifier.joblib"),
]

bilingual_text_model = None
bilingual_model_version = None
loaded_classifier_path = None

for path in candidate_classifier_paths:
    if path and os.path.exists(path):
        try:
            bilingual_text_model = joblib.load(path)
            bilingual_model_version = "civic-linear-svc-bilingual-v1"
            loaded_classifier_path = os.path.abspath(path)
            print(f"[AI Service] Loaded bilingual text classifier from {loaded_classifier_path} (active: {bilingual_model_version})")
            break
        except Exception as exc:
            print(f"[AI Service] WARNING: Could not load classifier from {path}: {exc}")

if bilingual_text_model is None:
    print(
        f"[AI Service] Bilingual classifier artifact not found in candidates: {candidate_classifier_paths}. "
        "Active text classifier is legacy model (legacy-logistic-regression). "
        "To generate the bilingual model, run: python text_classification/train_and_evaluate.py"
    )

model = joblib.load(MODEL_PATH)

# Trained on synthetic SLA-derived data (see train_resolution.py) — no real
# historical resolution-time data exists yet in this deployment.
resolution_model = joblib.load(RESOLUTION_MODEL_PATH)

# Loaded once at startup; ~90MB download to the HF cache on first run.
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Pretrained on COCO (80 general object classes) — auto-downloads to
# YOLO_MODEL_PATH on first run. Not fine-tuned on civic imagery, so it can
# recognize things like "car" or "person" in a photo but has no concept of
# "pothole" or "garbage pile"; those come from the OpenCV heuristics below.
yolo_model = YOLO(YOLO_MODEL_PATH)
YOLO_CONFIDENCE_THRESHOLD = 0.35
custom_civic_model = YOLO(CUSTOM_CIVIC_MODEL_PATH) if os.path.exists(CUSTOM_CIVIC_MODEL_PATH) else None

sentiment_analyzer = SentimentIntensityAnalyzer()
# Standard VADER thresholds on the compound score.
SENTIMENT_POSITIVE_THRESHOLD = 0.05
SENTIMENT_NEGATIVE_THRESHOLD = -0.05

# Categories map 1:1 onto department names seeded in the backend database.
CATEGORY_ALIASES = {
    "Roads": "Roads and Footpaths",
    "Garbage": "Solid Waste and Garbage",
    "Drainage": "Sewerage and Drainage",
    "Electricity": "Electricity and Streetlights",
    "Transport": "Public Transport",
    "Roads and Footpaths": "Roads and Footpaths",
    "Solid Waste and Garbage": "Solid Waste and Garbage",
    "Water Supply": "Water Supply",
    "Sewerage and Drainage": "Sewerage and Drainage",
    "Electricity and Streetlights": "Electricity and Streetlights",
    "Public Transport": "Public Transport",
}
CATEGORY_TO_DEPARTMENT = {name: name for name in set(CATEGORY_ALIASES.values())}
RESOLUTION_LEGACY_CATEGORIES = {
    "Roads and Footpaths": "Roads",
    "Solid Waste and Garbage": "Garbage",
    "Sewerage and Drainage": "Drainage",
    "Electricity and Streetlights": "Electricity",
    "Public Transport": "Transport",
}


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    category: str | None = None
    department: str | None = None
    priority: str = "Medium"
    confidence: float | None = None
    is_suggestion: bool = True
    model_version: str = "civic-linear-svc-bilingual-v1"
    top_margin_score: float | None = None
    margin_difference: float | None = None
    scores_note: str | None = None


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    sentiment: str
    score: float


class ResolutionRequest(BaseModel):
    category: str
    priority: str


class ResolutionResponse(BaseModel):
    estimated_hours: float
    estimated_label: str
    is_estimate: bool
    note: str


class GeoPoint(BaseModel):
    id: int
    lat: float
    lng: float


class ClusterRequest(BaseModel):
    points: List[GeoPoint]
    eps_km: float = 0.5
    min_samples: int = 3


class Cluster(BaseModel):
    cluster_id: int
    center_lat: float
    center_lng: float
    point_ids: List[int]
    count: int


class ClusterResponse(BaseModel):
    clusters: List[Cluster]
    noise_ids: List[int]


class ModerateRequest(BaseModel):
    text: str


class ModerateResponse(BaseModel):
    is_profane: bool
    profanity_matches: List[str]
    spam_score: float
    spam_signals: List[str]
    is_likely_spam: bool


class Detection(BaseModel):
    label: str
    confidence: float
    bbox: List[float]  # [x_min, y_min, width, height], normalized 0-1 relative to image size
    source: str  # "yolov8n-coco" (general object) or "opencv-heuristic" (civic-issue candidate)


class DetectIssuesResponse(BaseModel):
    detections: List[Detection]
    is_placeholder: bool
    model_version: str
    supported_labels: List[str]
    note: str
    cross_check: dict | None = None


class FakeCheckRequest(BaseModel):
    text: str


class FakeCheckResponse(BaseModel):
    gibberish_score: float
    gibberish_signals: List[str]


class PrepareTextRequest(BaseModel):
    text: str


class PrepareTextResponse(BaseModel):
    source_language: str
    analysis_text: str
    translation_used: bool
    translation_model: str | None
    translation_note: str
    translation_available: bool


class TranslateTextRequest(BaseModel):
    text: str
    source_language: str
    target_language: str


class TranslateTextResponse(BaseModel):
    translated_text: str
    model: str


def humanize_hours(hours: float) -> str:
    if hours < 1:
        return "less than an hour"
    if hours < 24:
        n = round(hours)
        return f"{n} hour{'s' if n != 1 else ''}"
    if hours < 24 * 14:
        n = round(hours / 24)
        return f"{n} day{'s' if n != 1 else ''}"
    n = round(hours / (24 * 7))
    return f"{n} week{'s' if n != 1 else ''}"


# civic-issue candidates from the OpenCV heuristics, plus the 80 general COCO
# classes the YOLOv8n model can recognize (car, person, dog, etc.).
HEURISTIC_ISSUE_LABELS = [
    "pothole_candidate",
    "garbage_candidate",
    "water_logging_candidate",
]
SUPPORTED_ISSUE_LABELS = (
    list(custom_civic_model.names.values()) + list(yolo_model.names.values())
    if custom_civic_model else HEURISTIC_ISSUE_LABELS + list(yolo_model.names.values())
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "active_text_classifier": bilingual_model_version if bilingual_text_model is not None else "legacy-logistic-regression",
        "bilingual_classifier_loaded": bilingual_text_model is not None,
        "bilingual_model_path": loaded_classifier_path,
    }


@app.post("/prepare-text", response_model=PrepareTextResponse)
def prepare_complaint_text(req: PrepareTextRequest):
    return PrepareTextResponse(**prepare_text(req.text))


@app.post("/translate-text", response_model=TranslateTextResponse)
def translate_text_endpoint(req: TranslateTextRequest):
    if req.source_language not in {"en", "hi"} or req.target_language not in {"en", "hi"}:
        raise HTTPException(status_code=400, detail="Only English and Hindi translation is supported")
    translated = translate_text(req.text, req.source_language, req.target_language)
    model_name = (
        "Helsinki-NLP/opus-mt-hi-en" if req.source_language == "hi"
        else "Helsinki-NLP/opus-mt-en-hi"
    )
    return TranslateTextResponse(translated_text=translated, model=model_name)


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    vector = embedding_model.encode(req.text, normalize_embeddings=True)
    return EmbedResponse(embedding=vector.tolist())


@app.post("/sentiment", response_model=SentimentResponse)
def sentiment(req: SentimentRequest):
    compound = sentiment_analyzer.polarity_scores(req.text)["compound"]

    if compound >= SENTIMENT_POSITIVE_THRESHOLD:
        label = "Positive"
    elif compound <= SENTIMENT_NEGATIVE_THRESHOLD:
        label = "Negative"
    else:
        label = "Neutral"

    return SentimentResponse(sentiment=label, score=round(compound, 4))


@app.post("/predict-resolution", response_model=ResolutionResponse)
def predict_resolution(req: ResolutionRequest):
    category = req.category
    # Keep the existing trained resolution artifact usable until it is
    # retrained; new artifacts use the canonical labels directly.
    try:
        encoder = resolution_model.named_steps["encode"]
        category_encoder = next(
            transformer for name, transformer, columns in encoder.transformers_
            if name == "cat" and "category" in columns
        )
        known_categories = set(category_encoder.categories_[0].tolist())
        if category not in known_categories:
            category = RESOLUTION_LEGACY_CATEGORIES.get(category, category)
    except (AttributeError, KeyError, StopIteration, IndexError):
        pass
    df = pd.DataFrame([{"category": category, "priority": req.priority}])
    hours = float(resolution_model.predict(df)[0])
    hours = max(hours, 1.0)

    return ResolutionResponse(
        estimated_hours=round(hours, 1),
        estimated_label=humanize_hours(hours),
        is_estimate=True,
        note="Estimate based on typical SLA targets by priority/category — not yet trained on this deployment's real resolution history.",
    )


@app.post("/moderate", response_model=ModerateResponse)
def moderate(req: ModerateRequest):
    return ModerateResponse(**moderate_text(req.text))


EARTH_RADIUS_KM = 6371.0088


@app.post("/cluster-hotspots", response_model=ClusterResponse)
def cluster_hotspots(req: ClusterRequest):
    if len(req.points) == 0:
        return ClusterResponse(clusters=[], noise_ids=[])

    coords_deg = np.array([[p.lat, p.lng] for p in req.points])
    coords_rad = np.radians(coords_deg)
    eps_rad = req.eps_km / EARTH_RADIUS_KM

    labels = DBSCAN(eps=eps_rad, min_samples=req.min_samples, metric="haversine").fit_predict(coords_rad)

    clusters = []
    noise_ids = []
    for label in sorted(set(labels)):
        member_indices = np.where(labels == label)[0]
        if label == -1:
            noise_ids.extend(int(req.points[i].id) for i in member_indices)
            continue
        member_points = coords_deg[member_indices]
        center = member_points.mean(axis=0)
        clusters.append(Cluster(
            cluster_id=int(label),
            center_lat=float(center[0]),
            center_lng=float(center[1]),
            point_ids=[int(req.points[i].id) for i in member_indices],
            count=len(member_indices),
        ))

    return ClusterResponse(clusters=clusters, noise_ids=noise_ids)


def cross_check_image_and_complaint(detections, complaint_text, department):
    """Conservative staff-facing consistency hint; it never validates a report."""
    if not complaint_text:
        return None

    # Only civic issue candidates (custom classes or explicit civic heuristics)
    # are suitable evidence here. Generic COCO objects such as people/cars are
    # intentionally excluded because they do not establish the reported issue.
    issue_to_department = {
        "pothole": "Roads and Footpaths", "pothole_candidate": "Roads and Footpaths",
        "road_damage": "Roads and Footpaths", "crack": "Roads and Footpaths",
        "garbage": "Solid Waste and Garbage", "garbage_candidate": "Solid Waste and Garbage",
        "litter": "Solid Waste and Garbage", "trash": "Solid Waste and Garbage",
        "waterlogging": "Sewerage and Drainage", "water_logging": "Sewerage and Drainage",
        "water_logging_candidate": "Sewerage and Drainage", "flooding": "Sewerage and Drainage",
        "drain": "Sewerage and Drainage", "sewer": "Sewerage and Drainage",
        "leak": "Water Supply", "water_leak": "Water Supply", "water_pipe": "Water Supply",
        "streetlight": "Electricity and Streetlights", "street_light": "Electricity and Streetlights",
        "electric_pole": "Electricity and Streetlights", "traffic_light": "Electricity and Streetlights",
        "bus": "Public Transport", "bus_stop": "Public Transport",
    }
    supported = []
    for detection in detections:
        if detection.confidence < 0.35:
            continue
        label = detection.label.lower().replace(" ", "_").replace("-", "_")
        mapped = issue_to_department.get(label)
        if mapped and (detection.source != "yolov8n-coco" or label in {"traffic_light", "bus"}):
            supported.append({"label": detection.label, "department": mapped, "confidence": detection.confidence})

    text = complaint_text.lower()
    text_hints = {
        "Roads and Footpaths": ["pothole", "road", "footpath", "street"],
        "Solid Waste and Garbage": ["garbage", "trash", "waste", "litter"],
        "Water Supply": ["water supply", "water leak", "pipe leak"],
        "Sewerage and Drainage": ["drain", "sewer", "waterlogging", "flood"],
        "Electricity and Streetlights": ["electricity", "streetlight", "street light", "power"],
        "Public Transport": ["bus", "transport", "bus stop"],
    }
    inferred = [name for name, terms in text_hints.items() if any(term in text for term in terms)]
    text_department = inferred[0] if len(inferred) == 1 else None
    image_departments = sorted({item["department"] for item in supported})
    expected_department = text_department or (department if department in text_hints else None)

    if not supported:
        status = "insufficient_evidence"
        summary = "No reliable civic-issue image candidate was detected; compare the photo and report manually."
    elif expected_department and expected_department in image_departments:
        status = "consistent"
        summary = "A civic-issue image candidate is broadly consistent with the complaint category. Staff should verify the photo."
    elif expected_department and image_departments:
        status = "possible_mismatch"
        summary = "Detected civic-issue candidate(s) may not match the complaint category. This is only a review prompt; verify manually."
    else:
        status = "insufficient_evidence"
        summary = "Image candidates were found, but the complaint category could not be compared confidently. Review manually."

    return {
        "status": status,
        "summary": summary,
        "complaint_department": expected_department,
        "image_candidates": supported,
        "method": "candidate-label and complaint-category comparison; not proof of authenticity",
    }


@app.post("/detect-issues", response_model=DetectIssuesResponse)
async def detect_issues(
    image: UploadFile = File(...),
    complaint_text: str = Form(""),
    department: str = Form(""),
):
    raw = await image.read()
    npbuf = np.frombuffer(raw, np.uint8)
    img_bgr = cv2.imdecode(npbuf, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return DetectIssuesResponse(
            detections=[],
            is_placeholder=False,
            model_version="yolov8n-coco + opencv-heuristics-v1",
            supported_labels=SUPPORTED_ISSUE_LABELS,
            note="Could not decode this file as an image — no analysis was run.",
            cross_check=cross_check_image_and_complaint([], complaint_text, department),
        )

    h, w = img_bgr.shape[:2]
    detections = []

    if custom_civic_model is not None:
        custom_results = custom_civic_model.predict(img_bgr, verbose=False, conf=YOLO_CONFIDENCE_THRESHOLD)[0]
        for box in custom_results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append(Detection(
                label=custom_civic_model.names[int(box.cls[0])],
                confidence=round(float(box.conf[0]), 2),
                bbox=[x1 / w, y1 / h, (x2 - x1) / w, (y2 - y1) / h],
                source="civic-yolo-finetuned",
            ))

    results = yolo_model.predict(img_bgr, verbose=False, conf=YOLO_CONFIDENCE_THRESHOLD)[0]
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append(Detection(
            label=yolo_model.names[int(box.cls[0])],
            confidence=round(float(box.conf[0]), 2),
            bbox=[x1 / w, y1 / h, (x2 - x1) / w, (y2 - y1) / h],
            source="yolov8n-coco",
        ))

    if custom_civic_model is None:
        detections.extend(Detection(**d) for d in detect_civic_issues(img_bgr))

    if custom_civic_model is not None:
        return DetectIssuesResponse(
            detections=detections,
            is_placeholder=False,
            model_version="civic-yolo-finetuned",
            supported_labels=SUPPORTED_ISSUE_LABELS,
            note="Civic issue classes use the locally trained civic YOLO model. Review every detection before action; model output is not a verified finding.",
            cross_check=cross_check_image_and_complaint(detections, complaint_text, department),
        )

    return DetectIssuesResponse(
        detections=detections,
        is_placeholder=False,
        model_version="civic-yolo-finetuned" if custom_civic_model else "yolov8n-coco + opencv-heuristics-v1",
        supported_labels=SUPPORTED_ISSUE_LABELS,
        note=(
            "General objects (person, car, etc.) are detected with a pretrained YOLOv8n "
            "(COCO) model. Pothole/garbage/water-logging candidates come from lightweight "
            "OpenCV heuristics, not a model trained on civic imagery — treat those as rough "
            "hints, not verified findings."
        ),
        cross_check=cross_check_image_and_complaint(detections, complaint_text, department),
    )


@app.post("/detect-fake", response_model=FakeCheckResponse)
def detect_fake(req: FakeCheckRequest):
    score, signals = check_gibberish(req.text)
    return FakeCheckResponse(gibberish_score=score, gibberish_signals=signals)


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    text = (req.text or "").strip()
    if not text:
        # Safe fallback for empty or whitespace-only text: do not fabricate department suggestion
        return ClassifyResponse(
            category=None,
            department=None,
            priority="Medium",
            confidence=None,
            is_suggestion=False,
            model_version="fallback-empty-text",
            top_margin_score=None,
            margin_difference=None,
            scores_note="Empty or whitespace-only text provided; no department suggested.",
        )

    # 1. Use bilingual text classifier if loaded
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

            print(f"[AI Service] Classified via {bilingual_model_version}: category='{category}', top_margin={top_margin:.3f}")
            return ClassifyResponse(
                category=category,
                department=department,
                priority=priority,
                confidence=None,  # LinearSVC output is uncalibrated margin distance, not a probability
                is_suggestion=True,
                model_version=bilingual_model_version or "civic-linear-svc-bilingual-v1",
                top_margin_score=round(top_margin, 4),
                margin_difference=round(margin_diff, 4) if margin_diff is not None else None,
                scores_note="Raw uncalibrated decision margin distances from separating hyperplanes — not probabilities. AI department suggestion for staff review.",
            )
        except Exception as e:
            print(f"[AI Service] WARNING: Bilingual text classifier prediction error: {e}. Falling back to legacy model.")

    # 2. Legacy model fallback
    try:
        probabilities = model.predict_proba([text])[0]
        classes = model.classes_
        eligible = [(CATEGORY_ALIASES[name], float(prob)) for name, prob in zip(classes, probabilities) if name in CATEGORY_ALIASES]
        if eligible:
            category, confidence = max(eligible, key=lambda item: item[1])
            department = CATEGORY_TO_DEPARTMENT.get(category, category)
            priority = predict_priority(text, category)
            print(f"[AI Service] Classified via legacy-logistic-regression: category='{category}', confidence={confidence:.3f}")
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
        print(f"[AI Service] ERROR: Legacy classifier also failed: {e}. Falling back to unassigned.")

    # 3. Safe unassigned fallback: do not fabricate department suggestion
    print("[AI Service] Classifier unavailable; returning unassigned fallback.")
    return ClassifyResponse(
        category=None,
        department=None,
        priority="Medium",
        confidence=None,
        is_suggestion=False,
        model_version="fallback-unavailable",
        top_margin_score=None,
        margin_difference=None,
        scores_note="Classifier unavailable; complaint left unassigned for manual staff routing.",
    )
