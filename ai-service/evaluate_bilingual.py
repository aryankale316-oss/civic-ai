"""Evaluate department classification separately for English and Hindi CSV rows.

Expected columns: complaint_text, department_label, language. Run against a
human-reviewed held-out test split, not training examples. This reports model
performance; it does not claim that generated or synthetic data is real-world
evidence.
"""

import argparse
import os

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report

from translation import prepare_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")


def evaluate(path: str) -> None:
    data = pd.read_csv(path)
    required = {"complaint_text", "department_label", "language"}
    missing = required - set(data.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")
    data = data.dropna(subset=["complaint_text", "department_label", "language"])

    model = joblib.load(MODEL_PATH)
    for language in ("en", "hi"):
        rows = data[data["language"].astype(str).str.lower().isin(
            {language, "english" if language == "en" else "hindi"}
        )]
        if rows.empty:
            print(f"\n{language}: no test rows; skipped")
            continue

        analysis_texts = []
        for text in rows["complaint_text"].astype(str):
            prepared = prepare_text(text)
            if language == "hi" and not prepared["translation_used"]:
                raise RuntimeError("Hindi translation failed; refusing to report a misleading Hindi score")
            analysis_texts.append(prepared["analysis_text"])

        expected = rows["department_label"].astype(str).tolist()
        predicted = model.predict(analysis_texts)
        print(f"\n{language}: {len(rows)} held-out rows")
        print(f"Accuracy: {accuracy_score(expected, predicted):.4f}")
        print(classification_report(expected, predicted, zero_division=0))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", help="Reviewed held-out bilingual test CSV")
    args = parser.parse_args()
    evaluate(args.csv_path)
