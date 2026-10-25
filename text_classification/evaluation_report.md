# Civic Complaint Text Classifier: Evaluation Report

## 1. Executive Summary
- **Target Task:** Direct 6-department classification for civic complaints in English and Hindi without automatic machine translation.
- **Model Selected via Validation:** `LinearSVC_WordChar` (Linear Support Vector Classifier with Word (1,2) + Char_WB (3,5) TF-IDF (C=1.0)).
- **Evaluation Discipline:** Validation set used strictly for model selection; test set evaluated strictly once.
- **Overall Test Accuracy:** **95.95%**
- **Overall Test Macro-F1:** **0.9581** (Weighted-F1: **0.9594**)
- **English Test Accuracy:** **98.32%** (Macro-F1: **0.9826**, Support: 416)
- **Hindi Test Accuracy:** **93.98%** (Macro-F1: **0.9360**, Support: 498)

---

## 2. Validation Comparison
The candidate models were evaluated exclusively on the held-out validation set (885 rows) to prevent test-set contamination:

| Model Candidate | Val Accuracy | Val Macro-F1 | Val EN Macro-F1 | Val HI Macro-F1 |
|---|---|---|---|---|
| **LinearSVC_WordChar (Selected)** | **0.9672** | **0.9668** | **0.9597** | **0.9730** |
| LogReg_WordChar | 0.9503 | 0.9500 | 0.9418 | 0.9566 |

**Why LinearSVC Won:**
Linear Support Vector Classification maximizes margin separation in high-dimensional sparse TF-IDF spaces. Combining word n-grams (1, 2) and character n-grams (3, 5) yields rich subword representation for Hindi's morphological inflections while maintaining fast CPU inference (~2 ms per prediction).

---

## 3. Held-Out Test Set Results (Overall)
Evaluated on **914 untouched test rows**:

| Department | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| Electricity and Streetlights | 0.9640 | 0.9853 | 0.9745 | 136 |
| Public Transport | 0.9799 | 1.0000 | 0.9898 | 146 |
| Roads and Footpaths | 0.8790 | 0.9478 | 0.9121 | 115 |
| Sewerage and Drainage | 0.9767 | 0.9600 | 0.9683 | 175 |
| Solid Waste and Garbage | 0.9684 | 0.8895 | 0.9273 | 172 |
| Water Supply | 0.9709 | 0.9824 | 0.9766 | 170 |

**Macro Averages:**
- Precision: **0.9565**
- Recall: **0.9608**
- F1-Score: **0.9581**

---

## 4. English vs. Hindi Performance Comparison

| Metric | English (N=416) | Hindi (N=498) | Difference |
|---|---|---|---|
| Accuracy | 98.32% | 93.98% | 4.34% |
| Macro-F1 | 0.9826 | 0.9360 | 0.0466 |
| Macro Precision | 0.9840 | 0.9322 | 0.0518 |
| Macro Recall | 0.9820 | 0.9419 | 0.0401 |

### Per-Department F1 by Language

| Department | English F1 | Hindi F1 | English Support | Hindi Support |
|---|---|---|---|---|
| Electricity and Streetlights | 0.9836 | 0.9673 | 62 | 74 |
| Public Transport | 0.9787 | 1.0000 | 69 | 77 |
| Roads and Footpaths | 0.9841 | 0.8319 | 62 | 53 |
| Sewerage and Drainage | 1.0000 | 0.9458 | 72 | 103 |
| Solid Waste and Garbage | 0.9606 | 0.9064 | 66 | 106 |
| Water Supply | 0.9884 | 0.9647 | 85 | 85 |

---

## 5. Confusion Matrix & Misclassification Analysis

### Overall Confusion Matrix (Rows = Actual, Columns = Predicted)

```
                              Electricity and Streetlights  Public Transport  Roads and Footpaths  Sewerage and Drainage  Solid Waste and Garbage  Water Supply
Electricity and Streetlights                           134                 0                    0                      0                        0             2
Public Transport                                         0               146                    0                      0                        0             0
Roads and Footpaths                                      4                 0                  109                      1                        0             1
Sewerage and Drainage                                    0                 0                    0                    168                        5             2
Solid Waste and Garbage                                  0                 3                   13                      3                      153             0
Water Supply                                             1                 0                    2                      0                        0           167
```

### Top Misclassification Pairs
- **[HI] True: `Solid Waste and Garbage` -> Predicted: `Roads and Footpaths`** (11 instances)
- **[HI] True: `Sewerage and Drainage` -> Predicted: `Solid Waste and Garbage`** (5 instances)
- **[HI] True: `Roads and Footpaths` -> Predicted: `Electricity and Streetlights`** (4 instances)
- **[HI] True: `Solid Waste and Garbage` -> Predicted: `Sewerage and Drainage`** (3 instances)
- **[EN] True: `Solid Waste and Garbage` -> Predicted: `Public Transport`** (3 instances)
- **[EN] True: `Solid Waste and Garbage` -> Predicted: `Roads and Footpaths`** (2 instances)
- **[EN] True: `Electricity and Streetlights` -> Predicted: `Water Supply`** (2 instances)
- **[HI] True: `Sewerage and Drainage` -> Predicted: `Water Supply`** (2 instances)

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
