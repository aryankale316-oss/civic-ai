# Civic Complaints Dataset: Pre-Training Audit Report

## 1. Overview & File Metadata
- **Original Source File:** `C:\Users\rushi\civic-ai\civic_complaints_en_hi_encoding_fixed.csv`
- **Original File Size:** 2,301,170 bytes
- **Encoding Detected:** UTF-8 with Byte Order Mark (`utf-8-sig`)
- **Delimiter:** Standard comma (`,`)
- **Cleaned File Produced:** `C:\Users\rushi\civic-ai\text_classification\civic_complaints_cleaned.csv`
- **Cleaned File Row Count:** 6,000 rows (100% of original retained)
- **Rows Removed or Dropped:** 0 rows removed; 0 rows corrected.

---

## 2. Core Column Mapping & Data Types
The dataset columns were inspected and confirmed:

| Column Name | Role in Task | Completeness | Data Type | Notes |
|---|---|---|---|---|
| `record_id` | Identifier | 100% (6,000 / 6,000) | String | Synthetic unique ID (e.g., `PT-bus_`, `SYN-`) |
| `complaint_text` | **Primary Feature (Input Text)** | 100% (6,000 / 6,000) | String (Unicode) | Complaint text in English or Hindi |
| `department_label` | **Target Category (Label)** | 100% (6,000 / 6,000) | Categorical | Exactly 6 municipal departments |
| `language` | Language Stratifier | 100% (6,000 / 6,000) | Categorical | `en` (English) or `hi` (Hindi) |
| `script` | Script metadata | 100% (6,000 / 6,000) | Categorical | `Latin` (for English), `Devanagari` (for Hindi) |
| `issue_label` | Fine-grained category | 100% (6,000 / 6,000) | Categorical | Detailed issue tag (e.g., `transformer_issue`, `pothole`) |
| `source_type` | Data Provenance | 100% (6,000 / 6,000) | Categorical | 100% `synthetic` |
| `source_reference` | Attribution link | 0% (empty / NaN) | NaN | Not used |
| `pair_group_id` | Translation Pair Link | 2.5% (150 rows) | String / NaN | 75 bilingual paired items |
| `split_group` | **Leakage Prevention Group** | 100% (6,000 / 6,000) | String (692 groups) | Grouping for paraphrases & templates |
| `split` | Assigned Split | 100% (6,000 / 6,000) | Categorical | `train`, `validation`, `test` |
| `review_status` | Human Curation Status | 100% (6,000 / 6,000) | Categorical | 100% `unreviewed` |
| `reviewer_language_check`| Curation Check | 100% (6,000 / 6,000) | Boolean | `FALSE` |

---

## 3. Class & Language Balance
The dataset is balanced:
- **Total Departments:** Exactly 6 classes, with exactly 1,000 complaints each:
  1. `Electricity and Streetlights`: 1,000 rows
  2. `Public Transport`: 1,000 rows
  3. `Roads and Footpaths`: 1,000 rows
  4. `Sewerage and Drainage`: 1,000 rows
  5. `Solid Waste and Garbage`: 1,000 rows
  6. `Water Supply`: 1,000 rows
- **Language Balance:** Exactly 3,000 English rows (50.0%) and 3,000 Hindi rows (50.0%).
- **Department x Language:** Exactly 500 English and 500 Hindi complaints in every department.

```
Department x Language Breakdown:
language                       en   hi
department_label                      
Electricity and Streetlights  500  500
Public Transport              500  500
Roads and Footpaths           500  500
Sewerage and Drainage         500  500
Solid Waste and Garbage       500  500
Water Supply                  500  500
```

---

## 4. Text Quality & Unicode Hindi Script Integrity
1. **Unicode Devanagari Integrity:**
   - 313,715 Devanagari Unicode characters out of 314,181 non-punctuation characters in Hindi rows (99.85%).
   - Zero replacement characters (`\ufffd`), zero mojibake corruption.
   - Text is genuine, readable Hindi in Devanagari script.
   - Verified sample Devanagari text from row 1:
     *Text:* "बस निर्धारित बस स्टॉप पर नहीं रुकी।"
     *Unicode code points:* U+092C (ब), U+0938 (स), U+0020 ( ), U+0928 (न), U+093F (ि), U+0930 (र), U+094D (्), U+0927 (ध)
2. **Text Length & Completeness:**
   - Minimum character length: 18 characters
   - Maximum character length: 250 characters
   - Median character length: 144 characters (Median word count: 28 words)
   - Zero empty, whitespace-only, or abnormally short texts.
3. **Duplicate & Leakage Checks:**
   - Exact duplicate texts: **0**
   - Normalized (lowercased + stripped) duplicate texts: **0**
   - Texts with conflicting department labels: **0**
   - Leaking `split_group` across splits: **0** (All 692 groups are strictly confined to one split).
   - Leaking `pair_group_id` across splits: **0**

---

## 5. Pre-Existing Split Verification
The pre-existing split in the file strictly respects `split_group` boundaries:
- **Train:** 4,201 rows (70.02%)
- **Validation:** 885 rows (14.75%)
- **Test:** 914 rows (15.23%)

```
Department Distribution across Splits:
split                         test  train  validation
department_label                                     
Electricity and Streetlights   136    737         127
Public Transport               146    699         155
Roads and Footpaths            115    685         200
Sewerage and Drainage          175    679         146
Solid Waste and Garbage        172    694         134
Water Supply                   170    707         123

Language Distribution across Splits:
language      en    hi
split                 
test         416   498
train       2180  2021
validation   404   481
```

---

## 6. Audit Verdict & Limitations
**Verdict: Technically suitable for model training and benchmark evaluation.**

> [!WARNING]
> **Synthetic & Unreviewed Dataset Limitation:**
> - All 6,000 rows have `source_type: synthetic` and `review_status: unreviewed`.
> - This dataset was **not** produced by or collected from real citizens.
> - High classification performance on this dataset demonstrates that the model successfully learns the vocabulary patterns and templates of this synthetic dataset.
> - It **does NOT establish real-world accuracy** on actual citizen complaints, which often contain typos, regional dialects, colloquial slang, transliterated Hinglish, and voice-to-text transcription artifacts.
