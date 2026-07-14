"""
Trains the resolution-time regression model.

There's no real historical resolution-time data yet (this deployment has no
resolved complaints with meaningful submitted->resolved durations), so this
bootstraps the model on synthetic data derived from typical civic-ops SLA
targets per priority, adjusted by a rough per-category multiplier. It's a
genuine trained sklearn regressor, not a hardcoded lookup — but its accuracy
is only as good as these seed assumptions.

Once real complaints have been resolved in production, replace
`generate_synthetic_data()` with a query pulling
(category, priority, EXTRACT(EPOCH FROM resolved_at - created_at)/3600)
from the complaints table, and re-run this script. Nothing else needs to
change — same model path, same feature columns, same /predict-resolution
contract.
"""
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "resolution_model.joblib")

CATEGORIES = [
    "Roads", "Water Supply", "Electricity", "Garbage",
    "Drainage", "Health", "Transport", "Public Safety",
]
PRIORITIES = ["Critical", "High", "Medium", "Low"]

# Typical time-to-resolution SLA target, in hours, by priority.
BASELINE_HOURS_BY_PRIORITY = {
    "Critical": 24,
    "High": 72,
    "Medium": 168,
    "Low": 336,
}

# Rough multiplier capturing that some issue types take structurally longer
# (road/drainage repair crews) or shorter (garbage pickup, safety response).
CATEGORY_MULTIPLIER = {
    "Roads": 1.3,
    "Water Supply": 1.0,
    "Electricity": 0.8,
    "Garbage": 0.4,
    "Drainage": 1.1,
    "Health": 0.9,
    "Transport": 1.0,
    "Public Safety": 0.6,
}

SAMPLES_PER_COMBINATION = 200
MIN_HOURS = 1
MAX_HOURS = 24 * 60  # 60 days


def generate_synthetic_data(rng):
    rows = []
    for category in CATEGORIES:
        for priority in PRIORITIES:
            mean_hours = BASELINE_HOURS_BY_PRIORITY[priority] * CATEGORY_MULTIPLIER[category]
            noise = rng.lognormal(mean=0, sigma=0.3, size=SAMPLES_PER_COMBINATION)
            hours = np.clip(mean_hours * noise, MIN_HOURS, MAX_HOURS)
            for h in hours:
                rows.append({"category": category, "priority": priority, "hours": h})
    return pd.DataFrame(rows)


def train():
    rng = np.random.default_rng(42)
    df = generate_synthetic_data(rng)

    pipeline = Pipeline([
        ("encode", ColumnTransformer([
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["category", "priority"]),
        ])),
        ("regressor", RandomForestRegressor(n_estimators=200, max_depth=6, random_state=42)),
    ])
    pipeline.fit(df[["category", "priority"]], df["hours"])

    joblib.dump(pipeline, MODEL_PATH)
    print(f"Trained on {len(df)} synthetic examples across {len(CATEGORIES)} categories x {len(PRIORITIES)} priorities.")
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
