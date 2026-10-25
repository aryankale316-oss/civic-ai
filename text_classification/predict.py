"""
Civic Complaint Text Classifier - Inference & Demonstration Script
==================================================================
Tests single or batch complaint texts in English or Hindi using the trained
LinearSVC model.

Important Note on Model Decision Scores:
----------------------------------------
The model is a Linear Support Vector Classifier (LinearSVC). LinearSVC computes
signed geometric distances from the separating hyperplanes (margin scores).
It does NOT output calibrated probabilities. Raw decision margin scores should
NOT be treated as percentage probabilities or confidence scores.

Usage:
    # 1. Run the built-in bilingual test suite (avoids any terminal encoding issues)
    python predict.py --demo

    # 2. Test a complaint passed as command-line argument
    python predict.py "The street light is not working on 5th avenue"
    python predict.py "सड़क पर गहरा गड्ढा है जिससे दुर्घटना हो सकती है"

    # 3. Test a complaint from a UTF-8 text file (recommended for non-UTF8 terminals)
    python predict.py --file complaint.txt

    # 4. Interactive mode
    python predict.py --interactive
"""

import sys
import os
import json
import argparse
import joblib
import numpy as np

# Reconfigure stdout and stdin for UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "civic_text_classifier.joblib")
CLASSES_PATH = os.path.join(BASE_DIR, "class_labels.json")


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at: {MODEL_PATH}. Run train_and_evaluate.py first."
        )
    model = joblib.load(MODEL_PATH)
    with open(CLASSES_PATH, "r", encoding="utf-8-sig") as f:
        classes = json.load(f)
    return model, classes


def predict_text(text: str):
    model, classes = load_model()
    text = text.strip()
    if not text:
        return "Empty text", []

    predicted_dept = model.predict([text])[0]

    # Decision function gives raw signed distance from hyperplane for each class
    margin_scores = []
    if hasattr(model, "decision_function"):
        raw_scores = model.decision_function([text])[0]
        # Sort classes by distance from hyperplane
        ranked_indices = np.argsort(raw_scores)[::-1]
        for idx in ranked_indices:
            margin_scores.append((classes[idx], float(raw_scores[idx])))

    return predicted_dept, margin_scores


def print_prediction(text: str, predicted_dept: str, margin_scores: list):
    print("\n" + "=" * 65)
    print("CIVIC COMPLAINT CLASSIFIER (LinearSVC)")
    print("=" * 65)
    print(f"Input Complaint: {text}")
    print(f"Predicted Department: {predicted_dept}")
    if margin_scores:
        top_class, top_score = margin_scores[0]
        second_class, second_score = margin_scores[1] if len(margin_scores) > 1 else ("", 0.0)
        margin_gap = top_score - second_score
        print(f"Top Margin Score    : {top_score:+.3f} (raw decision distance)")
        print(f"Runner-up           : {second_class} ({second_score:+.3f})")
        print(f"Margin Separation   : {margin_gap:.3f}")
        print("Note: Scores are uncalibrated geometric margins, not probabilities.")
    print("=" * 65)


def run_demo():
    print("\n" + "=" * 70)
    print("CIVIC COMPLAINT CLASSIFIER: BILINGUAL TEST SUITE")
    print("=" * 70)
    samples = [
        ("en", "Roads and Footpaths", "A huge pothole on MG Road is causing severe traffic jams and bike accidents."),
        ("hi", "Roads and Footpaths", "सड़क पर गहरा गड्ढा है जिससे दुर्घटना हो सकती है और पैदल चलना मुश्किल है।"),
        ("en", "Solid Waste and Garbage", "Garbage collection bins in our sector have been overflowing for a week."),
        ("hi", "Solid Waste and Garbage", "हमारे मोहल्ले में कचरा गाड़ी तीन दिनों से नहीं आई है और सड़क पर गंदगी फैली है।"),
        ("en", "Public Transport", "The morning bus on route 45 was cancelled without any prior notification."),
        ("hi", "Public Transport", "बस स्टॉप पर बस नहीं रुकी और कंडक्टर ने बुजुर्ग यात्री को नहीं चढ़ाया।"),
        ("en", "Electricity and Streetlights", "Street light pole near the colony park is broken and sparking."),
        ("hi", "Electricity and Streetlights", "गली की स्ट्रीट लाइट पिछले एक हफ्ते से बंद पड़ी है, रात में अंधेरा रहता है।"),
        ("en", "Water Supply", "Drinking water supplied to our apartments is brownish and smells foul."),
        ("hi", "Water Supply", "सुबह के समय पानी का दबाव बहुत कम है और पीने का पानी नहीं मिल रहा।"),
        ("en", "Sewerage and Drainage", "The underground sewer line is overflowing and dirty water has entered the alley."),
        ("hi", "Sewerage and Drainage", "बरसात का गंदा पानी नाली जाम होने के कारण सड़क और घरों के सामने भर गया है।")
    ]

    for lang, expected_dept, text in samples:
        dept, margins = predict_text(text)
        top_score = margins[0][1] if margins else 0.0
        match_symbol = "✓" if dept == expected_dept else "✗"
        print(f"[{lang.upper()}] Expected : {expected_dept}")
        print(f"     Actual   : {dept} [{match_symbol}] (Margin: {top_score:+.3f})")
        print(f"     Text     : {text}\n")


def main():
    parser = argparse.ArgumentParser(description="Classify civic complaints in English or Hindi.")
    parser.add_argument("text", nargs="*", help="Complaint text to classify")
    parser.add_argument("--demo", action="store_true", help="Run bilingual demonstration test suite")
    parser.add_argument("--file", type=str, help="Path to a UTF-8 text file containing the complaint")
    parser.add_argument("--interactive", action="store_true", help="Interactive terminal prompt")

    args = parser.parse_args()

    if args.demo:
        run_demo()
        return

    if args.file:
        if not os.path.exists(args.file):
            print(f"Error: File not found: {args.file}")
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8-sig") as f:
            text = f.read().strip()
        dept, margins = predict_text(text)
        print_prediction(text, dept, margins)
        return

    if args.interactive:
        print("\nEntering interactive mode. Type 'exit' or 'quit' to stop.")
        while True:
            try:
                line = input("\nEnter complaint text: ").strip()
                if line.lower() in ("exit", "quit"):
                    break
                if not line:
                    continue
                dept, margins = predict_text(line)
                print_prediction(line, dept, margins)
            except (EOFError, KeyboardInterrupt):
                break
        return

    if args.text:
        text = " ".join(args.text)
        dept, margins = predict_text(text)
        print_prediction(text, dept, margins)
    else:
        # Default behavior if no args given: run demo
        run_demo()


if __name__ == "__main__":
    main()
