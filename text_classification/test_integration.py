import sys
import os
import json
import urllib.request
import urllib.error
import subprocess

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
AI_SERVICE_DIR = os.path.join(PROJECT_ROOT, "ai-service")
AI_VENV_PYTHON = os.path.join(AI_SERVICE_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(AI_VENV_PYTHON):
    AI_VENV_PYTHON = os.path.join(AI_SERVICE_DIR, ".venv", "bin", "python")

SERVER_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")


def check_live_server() -> bool:
    try:
        req = urllib.request.Request(f"{SERVER_URL}/health", headers={"User-Agent": "TestClient"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


class TestResponse:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


class HttpTestClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def get(self, path: str):
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url, headers={"User-Agent": "TestClient"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return TestResponse(resp.status, resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            return TestResponse(err.code, err.read().decode("utf-8"))

    def post(self, path: str, json: dict = None):
        url = f"{self.base_url}{path}"
        data = json.dumps(json or {}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "TestClient"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return TestResponse(resp.status, resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            return TestResponse(err.code, err.read().decode("utf-8"))


# Initialize client: use live server, in-process TestClient, or re-dispatch to ai-service venv
if check_live_server():
    print(f"[Test] Using live AI Service running at {SERVER_URL}")
    client = HttpTestClient(SERVER_URL)
else:
    import importlib.util
    import importlib

    can_import_ai_service = (
        importlib.util.find_spec("cv2") is not None
        and importlib.util.find_spec("fastapi") is not None
    )

    if not can_import_ai_service:
        if os.path.exists(AI_VENV_PYTHON) and os.path.abspath(sys.executable) != os.path.abspath(AI_VENV_PYTHON):
            print(f"[Test] Re-dispatching to AI service virtual environment: {AI_VENV_PYTHON}")
            res = subprocess.run([AI_VENV_PYTHON, __file__] + sys.argv[1:])
            sys.exit(res.returncode)
        else:
            print("[Test] ERROR: Missing AI dependencies (e.g. cv2) and ai-service/.venv was not found.")
            print("[Test] Please start the AI service (e.g. uvicorn main:app) or run using ai-service/.venv")
            sys.exit(1)

    if AI_SERVICE_DIR not in sys.path:
        sys.path.insert(0, AI_SERVICE_DIR)

    main_module = importlib.import_module("main")
    app_instance = getattr(main_module, "app")
    testclient_cls = getattr(importlib.import_module("fastapi.testclient"), "TestClient")

    client = testclient_cls(app_instance)

print("--- 1. Testing /health endpoint ---")
health_resp = client.get("/health")
assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
health_data = health_resp.json()
print("Health status:", json.dumps(health_data, indent=2))
assert health_data["status"] == "ok"
assert health_data["active_text_classifier"] == "civic-linear-svc-bilingual-v1"
assert health_data["bilingual_classifier_loaded"] is True

print("\n--- 2. Testing /classify endpoint on English and Hindi ---")

samples = [
    ("English pothole", "Massive pothole on Main Street causing traffic jams and damage to cars.", "Roads and Footpaths"),
    ("Hindi pothole", "सड़क पर गहरा गड्ढा है, वाहन चालकों को भारी परेशानी हो रही है।", "Roads and Footpaths"),
    ("English garbage", "Huge garbage heap overflowing near the market with stray dogs.", "Solid Waste and Garbage"),
    ("Hindi garbage", "बाजार के पास भारी कचरा पड़ा हुआ है और बहुत बदबू आ रही है।", "Solid Waste and Garbage"),
    ("English water leak", "Continuous water pipe leakage flooding the street for two days.", "Water Supply"),
    ("Hindi sewage", "सीवर का गंदा पानी ओवरफ्लो होकर सड़क पर बह रहा है।", "Sewerage and Drainage"),
    ("English streetlights", "Street lights are not working and the entire lane is completely dark at night.", "Electricity and Streetlights"),
    ("Hindi bus service", "बस स्टॉप पर बसें समय पर नहीं आ रही हैं और बहुत भीड़ रहती है।", "Public Transport"),
]

for name, text, expected_dept in samples:
    response = client.post("/classify", json={"text": text})
    assert response.status_code == 200, f"Failed for {name}: {response.text}"
    data = response.json()
    print(f"\n[Sample: {name}]")
    print(f"  Input: {text}")
    print(f"  Department: {data['department']}")
    print(f"  Category: {data['category']}")
    print(f"  Is Suggestion: {data['is_suggestion']}")
    print(f"  Confidence: {data['confidence']}")
    print(f"  Top Margin Score: {data['top_margin_score']}")
    print(f"  Margin Difference: {data['margin_difference']}")
    print(f"  Model Version: {data['model_version']}")
    print(f"  Scores Note: {data['scores_note']}")

    assert data["is_suggestion"] is True
    assert data["department"] == expected_dept, f"Expected {expected_dept}, got {data['department']}"
    assert data["model_version"] == "civic-linear-svc-bilingual-v1"
    assert data["confidence"] is None  # LinearSVC margins must NOT be labeled as confidence
    assert data["top_margin_score"] is not None
    assert data["margin_difference"] is not None
    assert "uncalibrated" in data["scores_note"].lower()

print("\n--- 3. Verifying empty and whitespace-only text handling ---")
for empty_input in ["", "   ", "\n\t"]:
    empty_resp = client.post("/classify", json={"text": empty_input})
    assert empty_resp.status_code == 200
    empty_data = empty_resp.json()
    assert empty_data["department"] is None, f"Expected None department for empty text, got {empty_data['department']}"
    assert empty_data["category"] is None, f"Expected None category for empty text, got {empty_data['category']}"
    assert empty_data["confidence"] is None
    assert empty_data["top_margin_score"] is None
    assert empty_data["is_suggestion"] is False
    assert empty_data["model_version"] == "fallback-empty-text"

print("Empty text response:")
print(json.dumps(empty_data, indent=2))

print("\n>>> ALL TEST SCENARIOS PASSED WITH FULL COMPLIANCE! <<<")
