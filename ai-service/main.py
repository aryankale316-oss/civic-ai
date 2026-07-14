import os
from typing import List

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from priority import predict_priority
from moderation import moderate_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
RESOLUTION_MODEL_PATH = os.path.join(BASE_DIR, "resolution_model.joblib")

app = FastAPI(title="Civic AI Classification Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load(MODEL_PATH)

# Trained on synthetic SLA-derived data (see train_resolution.py) — no real
# historical resolution-time data exists yet in this deployment.
resolution_model = joblib.load(RESOLUTION_MODEL_PATH)

# Loaded once at startup; ~90MB download to the HF cache on first run.
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

sentiment_analyzer = SentimentIntensityAnalyzer()
# Standard VADER thresholds on the compound score.
SENTIMENT_POSITIVE_THRESHOLD = 0.05
SENTIMENT_NEGATIVE_THRESHOLD = -0.05

# Categories map 1:1 onto department names seeded in the backend database.
CATEGORY_TO_DEPARTMENT = {
    "Roads": "Roads",
    "Water Supply": "Water Supply",
    "Electricity": "Electricity",
    "Garbage": "Garbage",
    "Drainage": "Drainage",
    "Health": "Health",
    "Transport": "Transport",
    "Public Safety": "Public Safety",
}


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    category: str
    department: str
    priority: str
    confidence: float


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


class DetectIssuesResponse(BaseModel):
    detections: List[Detection]
    is_placeholder: bool
    model_version: str
    supported_labels: List[str]
    note: str


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


# The categories this endpoint is meant to eventually detect. No model is
# trained yet — see the note below.
SUPPORTED_ISSUE_LABELS = [
    "pothole",
    "garbage",
    "water_leakage",
    "broken_streetlight",
    "illegal_dumping",
    "flooding",
]


@app.get("/health")
def health():
    return {"status": "ok"}


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
    df = pd.DataFrame([{"category": req.category, "priority": req.priority}])
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


@app.post("/detect-issues", response_model=DetectIssuesResponse)
async def detect_issues(image: UploadFile = File(...)):
    # Placeholder: no object-detection model (YOLOv8/OpenCV) is trained or
    # deployed yet — recognizing potholes/garbage/leaks/etc. needs a labeled
    # image dataset this project doesn't have. This endpoint is fully wired
    # (upload -> here -> stored on the complaint image -> shown in the UI) so
    # a real trained model can be dropped in later without touching the
    # backend or frontend contract.
    await image.read()  # drain the upload so the connection closes cleanly
    return DetectIssuesResponse(
        detections=[],
        is_placeholder=True,
        model_version="none",
        supported_labels=SUPPORTED_ISSUE_LABELS,
        note="Image analysis is not yet configured — no trained detection model is deployed.",
    )


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    probabilities = model.predict_proba([req.text])[0]
    classes = model.classes_
    best_index = probabilities.argmax()
    category = classes[best_index]
    confidence = float(probabilities[best_index])

    department = CATEGORY_TO_DEPARTMENT.get(category, category)
    priority = predict_priority(req.text, category)

    return ClassifyResponse(
        category=category,
        department=department,
        priority=priority,
        confidence=round(confidence, 4),
    )
