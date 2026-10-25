# Civic Complaint Bilingual Text Classifier (English & Hindi)

Welcome! This directory contains a self-contained, reproducible machine learning pipeline designed to classify civic complaints into one of six municipal departments in both **English** and **Hindi**, without relying on external translation APIs.

---

## 1. What This Model Does
When a complaint is received in English or Hindi, the classifier predicts which municipal department should handle it:
1. **Roads and Footpaths** (पोटहोल्स, टूटी सड़कें, फुटपाथ)
2. **Solid Waste and Garbage** (कचरा, कूड़ेदान, सफाई)
3. **Water Supply** (पानी की किल्लत, गंदा पानी, कम दबाव)
4. **Sewerage and Drainage** (बंद नालियां, सीवर ओवरफ्लो)
5. **Electricity and Streetlights** (स्ट्रीट लाइट, बिजली कटौती, ट्रांसफॉर्मर)
6. **Public Transport** (बस रूट, देरी, रद्दीकरण)

---

## 2. Prerequisites & Environment Setup

### Prerequisites
- Windows 10/11
- Python 3.10, 3.11, or 3.12 installed.

### Setting Up the Environment
You can either use the existing virtual environment already set up in `ai-service\.venv`, or create a fresh one.

#### Option A: Using Existing Project Virtual Environment (Recommended)
Open PowerShell:
```powershell
# Activate the existing virtual environment
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\Activate.ps1"
```

#### Option B: Creating a Fresh Virtual Environment
```powershell
cd C:\Users\rushi\civic-ai\text_classification
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 3. How to Run Training & Evaluation

All commands can be run directly from PowerShell:

### Step 1: Pre-Training Dataset Audit & Cleaning
```powershell
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\clean_dataset.py"
```
*What this does:*
- Inspects the original file `C:\Users\rushi\civic-ai\civic_complaints_en_hi_encoding_fixed.csv` without modifying or deleting it.
- Verifies Unicode Devanagari encoding integrity.
- Confirms zero corruptions, missing labels, or duplicate leaks.
- Generates `civic_complaints_cleaned.csv` and `dataset_audit_report.md`.

### Step 2: Model Training, Validation Selection & Test Evaluation
```powershell
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\train_and_evaluate.py"
```
*What this does:*
- Trains a baseline **Logistic Regression** and **Linear Support Vector Classifier (LinearSVC)** using a bilingual feature pipeline combining word n-grams `(1, 2)` and character n-grams `(3, 5)`.
- Compares models strictly on the **Validation Set** (`885` rows).
- Automatically selects the winning model (`LinearSVC_WordChar`).
- Evaluates the winning model **strictly once** on the untouched **Held-Out Test Set** (`914` rows).
- Saves all metrics, confusion matrices, and the serialized model artifact (`civic_text_classifier.joblib`).

---

## 4. How to Test Predictions

### Recommended Method: Built-in Bilingual Test Suite
To avoid Windows terminal encoding quirks with Devanagari characters, run the built-in test suite:
```powershell
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\predict.py" --demo
```
This tests 12 representative complaints across all 6 departments (6 in English and 6 in Hindi) with verified Devanagari text.

### Testing Custom Complaints

#### Method 1: Using a UTF-8 Text File (Most Reliable on Windows)
If your terminal does not display Hindi text properly, save your complaint into a UTF-8 text file (e.g. `complaint.txt`) and run:
```powershell
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\predict.py" --file "complaint.txt"
```

#### Method 2: Command Line Argument
First set your PowerShell console to UTF-8:
```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```
Then pass your complaint text:
```powershell
# English Example
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\predict.py" "A huge pothole on Station Road is causing bike accidents"

# Hindi Example
& "C:\Users\rushi\civic-ai\ai-service\.venv\Scripts\python.exe" "C:\Users\rushi\civic-ai\text_classification\predict.py" "हमारे मोहल्ले में कचरा गाड़ी तीन दिनों से नहीं आई है और सड़क पर गंदगी फैली है।"
```

---

## 5. Directory Structure & Output Files

All generated files are saved neatly inside `C:\Users\rushi\civic-ai\text_classification\`:

```
text_classification/
├── README.md                      <- This documentation guide (UTF-8 BOM)
├── requirements.txt               <- Minimal python dependencies
├── clean_dataset.py               <- Audit and cleaning script
├── dataset_audit_report.md        <- Comprehensive dataset inspection report
├── civic_complaints_cleaned.csv   <- Cleaned dataset copy (original untouched)
├── compare_models.py              <- Validation experimentation script
├── train_and_evaluate.py          <- Full reproducible training & evaluation pipeline
├── predict.py                     <- Standalone prediction & CLI demo script
├── civic_text_classifier.joblib   <- Serialized trained winning LinearSVC model pipeline
├── class_labels.json              <- JSON list of all 6 department labels
├── evaluation_metrics.json        <- Machine-readable test metrics (overall & by language)
├── evaluation_report.md           <- In-depth evaluation report with error analysis
├── confusion_matrix_overall.csv   <- Overall 6x6 test confusion matrix
├── confusion_matrix_en.csv        <- English-only test confusion matrix
└── confusion_matrix_hi.csv        <- Hindi-only test confusion matrix
```

---

## 6. How to Read the Results

### Key Terms Explained for Beginners
- **Accuracy (95.95% overall):** The percentage of complaints classified correctly out of all test complaints.
- **Precision (95.65%):** Out of all complaints our model flagged as e.g. "Water Supply", how many were actually about water supply? (High precision means few false alarms).
- **Recall (96.08%):** Out of all actual "Water Supply" complaints, how many did the model find? (High recall means few missed complaints).
- **Macro-F1 (0.9581):** The harmonic mean of precision and recall calculated for each department separately and then averaged. Unlike plain accuracy, Macro-F1 guarantees that no department is penalized for class imbalance.

### Language-Specific Highlights
- **English Test Set (416 rows):**
  - **Accuracy:** `98.32%`
  - **Macro-F1:** `0.9826`
- **Hindi Test Set (498 rows):**
  - **Accuracy:** `93.98%`
  - **Macro-F1:** `0.9360`

---

## 7. Model Characteristics & Confidence Guidance

### LinearSVC Margin Scores vs. Probabilities
- The selected model is a **Linear Support Vector Machine (LinearSVC)**.
- LinearSVC optimizes the geometric separation between classes. Its `decision_function` returns **signed margin distances** (how far a sample lies from the decision boundary), **not calibrated probabilities**.
- **Important:** Do NOT interpret raw margin scores as percentage probabilities or confidence scores.
- If the application needs a threshold (e.g. routing low-confidence complaints to human triage):
  1. A calibration method (such as Platt scaling via scikit-learn's `CalibratedClassifierCV`) must be fitted.
  2. This calibration and any threshold selection must be performed **strictly on the training and validation sets**, never on the test set.
  3. For now, this is documented as a limitation; no integration or calibration has been added to the application.

---

## 8. Known Limitations & Real-World Applicability

1. **Synthetic Data Warning:**
   All 6,000 complaints in the dataset have `source_type: synthetic` and `review_status: unreviewed`. The sentences are well-formed and grammatically regular. Real citizen complaints will often contain slang, typos, transliterated Hinglish (e.g. *"sadak par gaddha hai"*), and voice transcription errors. High benchmark scores on this synthetic dataset **do not establish real-world performance**.
2. **Landmark Phrase Traps:**
   In several misclassified complaints, citizen landmarks mislead the classifier.
   *Example:* *"सड़क अधूरी छोड़ दी गई है... यह जगह बिजली के खंभे वाले मोड़ पर है।"*
   The complaint is about the **Road**, but the landmark mentions an **electric pole**, causing the model to guess **Electricity and Streetlights**.
3. **Cross-Department Issues:**
   Complaints like *"Garbage thrown into open roadside drains is clogging them and causing overflow on the footpath"* naturally bridge **Solid Waste**, **Drainage**, and **Roads**. In real deployments, returning top-2 candidates for human review is recommended.

---

## 9. Next Steps Before Connecting to the Application

Before connecting this model to `ai-service/main.py`:
1. **Review the evaluation report:** Review [`evaluation_report.md`](evaluation_report.md) and confirm you are satisfied with the model architecture and performance.
2. **Collect Real Citizen Samples:** Test the model with messy, informal complaints and Hinglish text.
3. **Calibrate Probabilities (if thresholding needed):** If the application requires a "confidence score" or human-escalation threshold, calibrate the model using `CalibratedClassifierCV` on training/validation splits.
4. **App Integration Plan:** When authorized, we will update `ai-service` to load `civic_text_classifier.joblib` and route incoming complaints without modifying the image-detection YOLOv8 components.
