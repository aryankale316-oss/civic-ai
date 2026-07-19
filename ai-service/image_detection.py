"""
Classical OpenCV heuristics for civic-issue image categories that a
pretrained COCO object-detection model has no concept of (potholes, garbage
piles, water-logging). There is no labeled dataset for these in this
deployment, so these are hand-tuned heuristics on color/edge/texture
statistics, not learned models — treat their output as rough hints, not
verified findings. Real training data would let these be replaced with a
proper fine-tuned detector without touching the /detect-issues contract.
"""
import cv2
import numpy as np

MAX_CANDIDATES_PER_HEURISTIC = 5


def detect_potholes(img_bgr):
    """Dark, irregular blobs in the lower portion of the frame (assumed road)."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(blurred, 50, 150), np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = h * w
    overall_mean = float(gray.mean())
    candidates = []

    for c in contours:
        area = cv2.contourArea(c)
        if area < image_area * 0.01 or area > image_area * 0.35:
            continue
        x, y, cw, ch = cv2.boundingRect(c)
        if y < h * 0.3:  # only consider the lower ~70% of the frame
            continue
        aspect = cw / ch if ch else 0
        if aspect < 0.4 or aspect > 2.5:
            continue

        roi_mean = float(gray[y:y + ch, x:x + cw].mean())
        if roi_mean >= overall_mean * 0.75:
            continue  # not darker than the surrounding scene

        confidence = round(min(0.3 + (overall_mean - roi_mean) / 255, 0.6), 2)
        candidates.append({
            "label": "pothole_candidate",
            "confidence": confidence,
            "bbox": [x / w, y / h, cw / w, ch / h],
            "source": "opencv-heuristic",
        })

    candidates.sort(key=lambda d: -d["confidence"])
    return candidates[:MAX_CANDIDATES_PER_HEURISTIC]


def detect_water_logging(img_bgr):
    """Large, low-saturation grey/blue-ish regions — standing water or flooding."""
    h, w = img_bgr.shape[:2]
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([80, 10, 60]), np.array([140, 90, 220]))
    coverage = float(mask.sum()) / 255 / (h * w)

    if coverage <= 0.15:
        return []

    ys, xs = np.where(mask > 0)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    confidence = round(min(0.3 + coverage, 0.75), 2)
    return [{
        "label": "water_logging_candidate",
        "confidence": confidence,
        "bbox": [x0 / w, y0 / h, (x1 - x0) / w, (y1 - y0) / h],
        "source": "opencv-heuristic",
    }]


def detect_garbage(img_bgr):
    """Small patches with unusually high edge/texture variance versus the rest of the scene."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)

    block = 32
    if h < block or w < block:
        return []

    patches = []
    for y in range(0, h - block, block):
        for x in range(0, w - block, block):
            patch_var = laplacian[y:y + block, x:x + block].var()
            patches.append((patch_var, x, y))

    if not patches:
        return []

    mean_var = float(np.mean([p[0] for p in patches]))
    patches.sort(key=lambda p: -p[0])
    top_var, x, y = patches[0]

    if mean_var <= 0 or top_var <= mean_var * 4 or top_var <= 800:
        return []

    confidence = round(min(0.3 + top_var / 5000, 0.6), 2)
    return [{
        "label": "garbage_candidate",
        "confidence": confidence,
        "bbox": [x / w, y / h, block / w, block / h],
        "source": "opencv-heuristic",
    }]


def detect_civic_issues(img_bgr):
    return detect_potholes(img_bgr) + detect_water_logging(img_bgr) + detect_garbage(img_bgr)
