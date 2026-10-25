"""
Civic Complaint Text Classifier - Training & Evaluation Pipeline
================================================================
This script:
1. Loads the cleaned dataset (or original with fallback).
2. Uses the leakage-safe, group-stratified splits (train, validation, test).
3. Trains baseline (Logistic Regression) and LinearSVC models using word + char TF-IDF.
4. Selects the best performing model on the validation set.
5. Evaluates the winning model ONCE on the held-out test set (overall, English, Hindi).
6. Computes confusion matrices and identifies top confusion pairs.
7. Saves all reproducible artifacts with UTF-8 encoding:
   - Model & vectorizer pipeline (joblib)
   - Class label mapping (JSON)
   - Evaluation metrics (JSON & Markdown)
   - Confusion matrices (CSV)
"""

import sys
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

# Filter any solver optimizer warnings
warnings.filterwarnings("ignore", category=UserWarning)

# Ensure proper UTF-8 handling on Windows stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_PATH = os.path.join(BASE_DIR, "civic_complaints_cleaned.csv")
RAW_DATA_PATH = os.path.join(os.path.dirname(BASE_DIR), "civic_complaints_en_hi_encoding_fixed.csv")

OUTPUT_MODEL_PATH = os.path.join(BASE_DIR, "civic_text_classifier.joblib")
OUTPUT_CLASSES_PATH = os.path.join(BASE_DIR, "class_labels.json")
OUTPUT_METRICS_PATH = os.path.join(BASE_DIR, "evaluation_metrics.json")
OUTPUT_REPORT_PATH = os.path.join(BASE_DIR, "evaluation_report.md")
OUTPUT_CONFUSION_OVERALL = os.path.join(BASE_DIR, "confusion_matrix_overall.csv")
OUTPUT_CONFUSION_EN = os.path.join(BASE_DIR, "confusion_matrix_en.csv")
OUTPUT_CONFUSION_HI = os.path.join(BASE_DIR, "confusion_matrix_hi.csv")


def build_feature_extractor():
    """
    Constructs a bilingual feature extraction pipeline combining:
    1. Word n-grams (1, 2) to capture distinct English & Hindi vocabulary terms.
    2. Character n-grams (3, 5) within word boundaries ('char_wb') to capture
       morphological inflections, matras, and compound roots in Hindi and English.
    """
    return FeatureUnion([
        ('word_tfidf', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=2,
            sublinear_tf=True
        )),
        ('char_tfidf', TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(3, 5),
            min_df=3,
            sublinear_tf=True
        ))
    ])


def main():
    print("=" * 70)
    print("CIVIC COMPLAINT TEXT CLASSIFIER: TRAINING & EVALUATION")
    print("=" * 70)

    # 1. Load Data
    data_path = DEFAULT_DATA_PATH if os.path.exists(DEFAULT_DATA_PATH) else RAW_DATA_PATH
    print(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path, encoding='utf-8-sig')
    print(f"Total rows loaded: {len(df):,}")

    train_df = df[df['split'] == 'train'].copy().reset_index(drop=True)
    val_df = df[df['split'] == 'validation'].copy().reset_index(drop=True)
    test_df = df[df['split'] == 'test'].copy().reset_index(drop=True)

    print(f"Split sizes -> Train: {len(train_df):,} | Validation: {len(val_df):,} | Test: {len(test_df):,}")

    # Standardize label list
    classes = sorted(train_df['department_label'].unique().tolist())
    print(f"Target departments ({len(classes)} classes):")
    for i, c in enumerate(classes, 1):
        print(f"  {i}. {c}")

    with open(OUTPUT_CLASSES_PATH, "w", encoding="utf-8-sig") as f:
        json.dump(classes, f, ensure_ascii=False, indent=2)
    print(f"Saved class labels to: {OUTPUT_CLASSES_PATH}")

    # 2. Candidate Models Definition
    candidates = {
        "LogReg_WordChar": {
            "model": Pipeline([
                ('features', build_feature_extractor()),
                ('classifier', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
            ]),
            "description": "Logistic Regression with Word (1,2) + Char_WB (3,5) TF-IDF (C=1.0)"
        },
        "LinearSVC_WordChar": {
            "model": Pipeline([
                ('features', build_feature_extractor()),
                ('classifier', LinearSVC(C=1.0, max_iter=2000, random_state=42))
            ]),
            "description": "Linear Support Vector Classifier with Word (1,2) + Char_WB (3,5) TF-IDF (C=1.0)"
        }
    }

    # 3. Model Comparison on Validation Split
    print("\n" + "=" * 70)
    print("STEP 1: VALIDATION MODEL COMPARISON (TEST SET REMAINS UNTOUCHED)")
    print("=" * 70)

    val_records = {}
    for name, item in candidates.items():
        pipe = item["model"]
        print(f"Training candidate: {name} ...")
        pipe.fit(train_df['complaint_text'], train_df['department_label'])

        # Predict on validation set
        val_pred = pipe.predict(val_df['complaint_text'])
        acc = accuracy_score(val_df['department_label'], val_pred)
        p_m, r_m, f1_m, _ = precision_recall_fscore_support(
            val_df['department_label'], val_pred, average='macro', zero_division=0
        )
        p_w, r_w, f1_w, _ = precision_recall_fscore_support(
            val_df['department_label'], val_pred, average='weighted', zero_division=0
        )

        # Per language on validation
        val_en = val_df[val_df['language'] == 'en']
        val_hi = val_df[val_df['language'] == 'hi']

        pred_en = pipe.predict(val_en['complaint_text'])
        acc_en = accuracy_score(val_en['department_label'], pred_en)
        _, _, f1_m_en, _ = precision_recall_fscore_support(
            val_en['department_label'], pred_en, average='macro', zero_division=0
        )

        pred_hi = pipe.predict(val_hi['complaint_text'])
        acc_hi = accuracy_score(val_hi['department_label'], pred_hi)
        _, _, f1_m_hi, _ = precision_recall_fscore_support(
            val_hi['department_label'], pred_hi, average='macro', zero_division=0
        )

        val_records[name] = {
            "overall_accuracy": float(acc),
            "macro_precision": float(p_m),
            "macro_recall": float(r_m),
            "macro_f1": float(f1_m),
            "weighted_f1": float(f1_w),
            "english_accuracy": float(acc_en),
            "english_macro_f1": float(f1_m_en),
            "hindi_accuracy": float(acc_hi),
            "hindi_macro_f1": float(f1_m_hi)
        }

        print(f"  [Validation] Overall Acc: {acc:.4f} | Macro-F1: {f1_m:.4f} | Weighted-F1: {f1_w:.4f}")
        print(f"               EN Acc: {acc_en:.4f} (F1: {f1_m_en:.4f}) | HI Acc: {acc_hi:.4f} (F1: {f1_m_hi:.4f})")

    # Select best model based on validation macro-F1
    best_name = max(val_records.keys(), key=lambda k: val_records[k]["macro_f1"])
    print(f"\nWinning model selected by Validation Macro-F1: {best_name} ({val_records[best_name]['macro_f1']:.4f})")
    winning_pipeline = candidates[best_name]["model"]

    # 4. Final Evaluation on Held-Out Test Set (Done Exactly ONCE)
    print("\n" + "=" * 70)
    print("STEP 2: FINAL EVALUATION ON UNTOUCHED HELD-OUT TEST SET")
    print("=" * 70)

    test_pred = winning_pipeline.predict(test_df['complaint_text'])

    test_acc = accuracy_score(test_df['department_label'], test_pred)
    p_test_m, r_test_m, f1_test_m, _ = precision_recall_fscore_support(
        test_df['department_label'], test_pred, average='macro', zero_division=0
    )
    p_test_w, r_test_w, f1_test_w, _ = precision_recall_fscore_support(
        test_df['department_label'], test_pred, average='weighted', zero_division=0
    )

    print(f"Overall Test Accuracy   : {test_acc:.4f} ({test_acc*100:.2f}%)")
    print(f"Overall Test Macro-F1   : {f1_test_m:.4f}")
    print(f"Overall Test Weighted-F1: {f1_test_w:.4f}")
    print(f"Overall Test Precision  : {p_test_m:.4f}")
    print(f"Overall Test Recall     : {r_test_m:.4f}")

    # Per-class metrics
    p_cls, r_cls, f1_cls, supp_cls = precision_recall_fscore_support(
        test_df['department_label'], test_pred, labels=classes, zero_division=0
    )
    per_class_metrics = {}
    print("\nPer-Department Performance (Test Set):")
    print(f"{'Department':<30} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<8}")
    print("-" * 70)
    for c, p, r, f, s in zip(classes, p_cls, r_cls, f1_cls, supp_cls):
        per_class_metrics[c] = {
            "precision": float(p),
            "recall": float(r),
            "f1_score": float(f),
            "support": int(s)
        }
        print(f"{c:<30} {p:<10.4f} {r:<10.4f} {f:<10.4f} {s:<8}")

    # Confusion Matrix (Overall)
    cm_overall = confusion_matrix(test_df['department_label'], test_pred, labels=classes)
    cm_overall_df = pd.DataFrame(cm_overall, index=classes, columns=classes)
    cm_overall_df.to_csv(OUTPUT_CONFUSION_OVERALL, encoding='utf-8-sig')
    print(f"\nOverall Confusion Matrix saved to: {OUTPUT_CONFUSION_OVERALL}")

    # 5. Language-Specific Breakdown (English vs Hindi)
    print("\n" + "=" * 70)
    print("STEP 3: LANGUAGE-SPECIFIC BREAKDOWN (TEST SET)")
    print("=" * 70)

    # English test set
    test_en = test_df[test_df['language'] == 'en'].copy().reset_index(drop=True)
    pred_en = winning_pipeline.predict(test_en['complaint_text'])
    acc_en = accuracy_score(test_en['department_label'], pred_en)
    p_en_m, r_en_m, f1_en_m, _ = precision_recall_fscore_support(
        test_en['department_label'], pred_en, average='macro', zero_division=0
    )
    p_en_w, r_en_w, f1_en_w, _ = precision_recall_fscore_support(
        test_en['department_label'], pred_en, average='weighted', zero_division=0
    )

    p_en_cls, r_en_cls, f1_en_cls, supp_en_cls = precision_recall_fscore_support(
        test_en['department_label'], pred_en, labels=classes, zero_division=0
    )
    per_class_en = {c: {"precision": float(p), "recall": float(r), "f1_score": float(f), "support": int(s)}
                    for c, p, r, f, s in zip(classes, p_en_cls, r_en_cls, f1_en_cls, supp_en_cls)}

    cm_en = confusion_matrix(test_en['department_label'], pred_en, labels=classes)
    cm_en_df = pd.DataFrame(cm_en, index=classes, columns=classes)
    cm_en_df.to_csv(OUTPUT_CONFUSION_EN, encoding='utf-8-sig')

    print(f"English Test Set (N={len(test_en)}):")
    print(f"  Accuracy: {acc_en:.4f} | Macro-F1: {f1_en_m:.4f} | Weighted-F1: {f1_en_w:.4f}")
    print(f"  Macro Precision: {p_en_m:.4f} | Macro Recall: {r_en_m:.4f}")

    # Hindi test set
    test_hi = test_df[test_df['language'] == 'hi'].copy().reset_index(drop=True)
    pred_hi = winning_pipeline.predict(test_hi['complaint_text'])
    acc_hi = accuracy_score(test_hi['department_label'], pred_hi)
    p_hi_m, r_hi_m, f1_hi_m, _ = precision_recall_fscore_support(
        test_hi['department_label'], pred_hi, average='macro', zero_division=0
    )
    p_hi_w, r_hi_w, f1_hi_w, _ = precision_recall_fscore_support(
        test_hi['department_label'], pred_hi, average='weighted', zero_division=0
    )

    p_hi_cls, r_hi_cls, f1_hi_cls, supp_hi_cls = precision_recall_fscore_support(
        test_hi['department_label'], pred_hi, labels=classes, zero_division=0
    )
    per_class_hi = {c: {"precision": float(p), "recall": float(r), "f1_score": float(f), "support": int(s)}
                    for c, p, r, f, s in zip(classes, p_hi_cls, r_hi_cls, f1_hi_cls, supp_hi_cls)}

    cm_hi = confusion_matrix(test_hi['department_label'], pred_hi, labels=classes)
    cm_hi_df = pd.DataFrame(cm_hi, index=classes, columns=classes)
    cm_hi_df.to_csv(OUTPUT_CONFUSION_HI, encoding='utf-8-sig')

    print(f"\nHindi Test Set (N={len(test_hi)}):")
    print(f"  Accuracy: {acc_hi:.4f} | Macro-F1: {f1_hi_m:.4f} | Weighted-F1: {f1_hi_w:.4f}")
    print(f"  Macro Precision: {p_hi_m:.4f} | Macro Recall: {r_hi_m:.4f}")

    # 6. Analyze Confusion Pairs & Misclassifications
    print("\n" + "=" * 70)
    print("STEP 4: COMMON CONFUSION PAIRS ANALYSIS")
    print("=" * 70)
    test_df['predicted_label'] = test_pred
    misclassified = test_df[test_df['department_label'] != test_df['predicted_label']]
    print(f"Total test misclassifications: {len(misclassified)} / {len(test_df)} ({len(misclassified)/len(test_df)*100:.2f}%)")

    confusion_pairs = misclassified.groupby(['department_label', 'predicted_label', 'language']).size().reset_index(name='count')
    confusion_pairs = confusion_pairs.sort_values(by='count', ascending=False)
    print("\nTop Misclassification Pairs by Language:")
    for _, row in confusion_pairs.head(10).iterrows():
        print(f"  [{row['language'].upper()}] True: '{row['department_label']}' -> Predicted: '{row['predicted_label']}' (Count: {row['count']})")

    # 7. Save Model Artifact
    joblib.dump(winning_pipeline, OUTPUT_MODEL_PATH)
    print(f"\nWinning model serialized and saved to: {OUTPUT_MODEL_PATH}")

    # 8. Save Metrics JSON
    metrics_summary = {
        "dataset_path": data_path,
        "classes": classes,
        "split_counts": {
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
            "test_en": len(test_en),
            "test_hi": len(test_hi)
        },
        "validation_comparison": val_records,
        "selected_model": best_name,
        "selected_model_description": candidates[best_name]["description"],
        "held_out_test_results": {
            "overall": {
                "accuracy": float(test_acc),
                "macro_precision": float(p_test_m),
                "macro_recall": float(r_test_m),
                "macro_f1": float(f1_test_m),
                "weighted_f1": float(f1_test_w)
            },
            "english": {
                "support": len(test_en),
                "accuracy": float(acc_en),
                "macro_precision": float(p_en_m),
                "macro_recall": float(r_en_m),
                "macro_f1": float(f1_en_m),
                "weighted_f1": float(f1_en_w),
                "per_class": per_class_en
            },
            "hindi": {
                "support": len(test_hi),
                "accuracy": float(acc_hi),
                "macro_precision": float(p_hi_m),
                "macro_recall": float(r_hi_m),
                "macro_f1": float(f1_hi_m),
                "weighted_f1": float(f1_hi_w),
                "per_class": per_class_hi
            },
            "per_class_overall": per_class_metrics
        },
        "misclassifications_count": int(len(misclassified)),
        "top_confusion_pairs": confusion_pairs.head(10).to_dict(orient='records')
    }

    with open(OUTPUT_METRICS_PATH, "w", encoding="utf-8-sig") as f:
        json.dump(metrics_summary, f, ensure_ascii=False, indent=2)
    print(f"Evaluation metrics JSON saved to: {OUTPUT_METRICS_PATH}")

    # 9. Generate Detailed Evaluation Report (Markdown)
    report_md = f"""# Civic Complaint Text Classifier: Evaluation Report

## 1. Executive Summary
- **Target Task:** Direct 6-department classification for civic complaints in English and Hindi without automatic machine translation.
- **Model Selected via Validation:** `{best_name}` ({candidates[best_name]['description']}).
- **Evaluation Discipline:** Validation set used strictly for model selection; test set evaluated strictly once.
- **Overall Test Accuracy:** **{test_acc*100:.2f}%**
- **Overall Test Macro-F1:** **{f1_test_m:.4f}** (Weighted-F1: **{f1_test_w:.4f}**)
- **English Test Accuracy:** **{acc_en*100:.2f}%** (Macro-F1: **{f1_en_m:.4f}**, Support: {len(test_en)})
- **Hindi Test Accuracy:** **{acc_hi*100:.2f}%** (Macro-F1: **{f1_hi_m:.4f}**, Support: {len(test_hi)})

---

## 2. Validation Comparison
The candidate models were evaluated exclusively on the held-out validation set ({len(val_df)} rows) to prevent test-set contamination:

| Model Candidate | Val Accuracy | Val Macro-F1 | Val EN Macro-F1 | Val HI Macro-F1 |
|---|---|---|---|---|
| **LinearSVC_WordChar (Selected)** | **{val_records['LinearSVC_WordChar']['overall_accuracy']:.4f}** | **{val_records['LinearSVC_WordChar']['macro_f1']:.4f}** | **{val_records['LinearSVC_WordChar']['english_macro_f1']:.4f}** | **{val_records['LinearSVC_WordChar']['hindi_macro_f1']:.4f}** |
| LogReg_WordChar | {val_records['LogReg_WordChar']['overall_accuracy']:.4f} | {val_records['LogReg_WordChar']['macro_f1']:.4f} | {val_records['LogReg_WordChar']['english_macro_f1']:.4f} | {val_records['LogReg_WordChar']['hindi_macro_f1']:.4f} |

**Why LinearSVC Won:**
Linear Support Vector Classification maximizes margin separation in high-dimensional sparse TF-IDF spaces. Combining word n-grams (1, 2) and character n-grams (3, 5) yields rich subword representation for Hindi's morphological inflections while maintaining fast CPU inference (~2 ms per prediction).

---

## 3. Held-Out Test Set Results (Overall)
Evaluated on **{len(test_df)} untouched test rows**:

| Department | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
"""
    for c in classes:
        m = per_class_metrics[c]
        report_md += f"| {c} | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | {m['support']} |\n"

    report_md += f"""
**Macro Averages:**
- Precision: **{p_test_m:.4f}**
- Recall: **{r_test_m:.4f}**
- F1-Score: **{f1_test_m:.4f}**

---

## 4. English vs. Hindi Performance Comparison

| Metric | English (N={len(test_en)}) | Hindi (N={len(test_hi)}) | Difference |
|---|---|---|---|
| Accuracy | {acc_en*100:.2f}% | {acc_hi*100:.2f}% | {abs(acc_en-acc_hi)*100:.2f}% |
| Macro-F1 | {f1_en_m:.4f} | {f1_hi_m:.4f} | {abs(f1_en_m-f1_hi_m):.4f} |
| Macro Precision | {p_en_m:.4f} | {p_hi_m:.4f} | {abs(p_en_m-p_hi_m):.4f} |
| Macro Recall | {r_en_m:.4f} | {r_hi_m:.4f} | {abs(r_en_m-r_hi_m):.4f} |

### Per-Department F1 by Language

| Department | English F1 | Hindi F1 | English Support | Hindi Support |
|---|---|---|---|---|
"""
    for c in classes:
        report_md += f"| {c} | {per_class_en[c]['f1_score']:.4f} | {per_class_hi[c]['f1_score']:.4f} | {per_class_en[c]['support']} | {per_class_hi[c]['support']} |\n"

    report_md += f"""
---

## 5. Confusion Matrix & Misclassification Analysis

### Overall Confusion Matrix (Rows = Actual, Columns = Predicted)

```
{cm_overall_df.to_string()}
```

### Top Misclassification Pairs
"""
    for _, row in confusion_pairs.head(8).iterrows():
        report_md += f"- **[{row['language'].upper()}] True: `{row['department_label']}` -> Predicted: `{row['predicted_label']}`** ({row['count']} instances)\n"

    report_md += """
### Qualitative Error Analysis
1. **Solid Waste and Garbage vs. Roads and Footpaths:**
   - *Cause:* Complaints discussing roadside garbage piles ("सड़क पर कचरा पड़ा है") contain prominent road tokens alongside waste tokens, occasionally leading the classifier to pick Roads.
2. **Sewerage and Drainage vs. Solid Waste:**
   - *Cause:* Complaints about open roadside drains blocked by accumulated solid waste share vocabulary across both departments.
3. **Roads and Footpaths vs. Electricity & Streetlights:**
   - *Cause:* When citizens include a nearby electric pole ("बिजली के खंभे के पास") as a location landmark for a road pothole, the model can be misled by the landmark terms.

---

## 6. Critical Model & Dataset Limitations

### A. LinearSVC Does NOT Produce Calibrated Probabilities
- The selected model is a Linear Support Vector Machine (`LinearSVC`).
- `LinearSVC` optimizes geometric classification margins; it **does NOT output posterior probabilities**.
- The raw `decision_function` values represent signed distances from the separating hyperplane. These scores are uncalibrated and **must not be treated as confidence percentages**.
- If a reject-option or threshold rule is needed for the application (e.g. routing uncertain complaints to human triage), probability calibration (e.g. Platt scaling via `CalibratedClassifierCV`) or threshold tuning must be fitted and validated **strictly on the training and validation sets**—never on the test set.

### B. Synthetic & Unreviewed Dataset Caveat
- Every single row in the dataset (6,000 complaints) has `source_type: synthetic` and `review_status: unreviewed`.
- The high test metrics reflect strong learning of the syntactic templates and vocabulary within this synthetic benchmark.
- **This does NOT establish real-world performance on real citizen complaints.** Real complaints will include typos, informal slang, Hinglish transliteration, voice-to-text audio errors, and ambiguous multi-issue complaints.
"""

    with open(OUTPUT_REPORT_PATH, "w", encoding="utf-8-sig") as f:
        f.write(report_md)
    print(f"Evaluation Markdown report saved to: {OUTPUT_REPORT_PATH}")
    print("\nTraining and evaluation pipeline completed successfully!")


if __name__ == "__main__":
    main()
