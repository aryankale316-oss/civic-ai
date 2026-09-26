"""Train and evaluate a labelled custom civic YOLO detector.

Expected labels are pothole, garbage, and waterlogging. The trained weights
are saved where main.py automatically loads them after an AI-service restart.
"""
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
DATASET_YAML = BASE_DIR / "data" / "civic-images" / "data.yaml"
OUTPUT_DIR = BASE_DIR / "models"

if not DATASET_YAML.exists():
    raise SystemExit(f"Dataset file not found: {DATASET_YAML}. Read data/civic-images/README.md first.")

model = YOLO("yolo11n.pt")
model.train(data=str(DATASET_YAML), epochs=80, imgsz=640, project=str(OUTPUT_DIR), name="civic_detector", exist_ok=True)
metrics = model.val(data=str(DATASET_YAML), project=str(OUTPUT_DIR), name="civic_detector_eval", exist_ok=True)
print("Custom civic detector trained.")
print(f"Precision: {metrics.box.mp:.3f}; Recall: {metrics.box.mr:.3f}; mAP50: {metrics.box.map50:.3f}; mAP50-95: {metrics.box.map:.3f}")
