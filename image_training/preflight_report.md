# Civic AI YOLOv8 Image Training Preflight Report

**Audit Date**: October 23, 2026  
**Audited By**: Antigravity Assistant  
**Project Path**: `C:\Users\rushi\civic-ai`  
**Dataset Path**: `D:\Civic-ai-Dataset`  
**Dataset Config**: `D:\Civic-ai-Dataset\data.yaml`  
**Status**: **PREFLIGHT COMPLETE — ACTION REQUIRED BEFORE TRAINING**

---

## 1. Executive Readiness Summary

| Component | Status | Finding / Action Required |
| :--- | :---: | :--- |
| **Hardware & GPU** | **READY** | 12th Gen Intel i5-12450H (12 threads), 8 GB RAM, NVIDIA GeForce GTX 1650 (4 GB VRAM), 102.9 GB free on D: |
| **Python / PyTorch Environment** | **BLOCKER** | Virtualenv `ai-service\.venv` has **CPU-only PyTorch** (`2.13.0+cpu`). CUDA is unavailable (`torch.cuda.is_available() == False`). Must install CUDA PyTorch build before training tomorrow. |
| **Dataset Config (`data.yaml`)** | **ATTENTION** | `path: .` in `data.yaml` evaluates relative to CWD; fails if launched outside `D:\Civic-ai-Dataset`. Must set absolute path `path: D:/Civic-ai-Dataset` or run with working directory `D:\Civic-ai-Dataset`. |
| **Pretrained Weights** | **READY** | `yolov8n.pt` (6.55 MB) exists at `C:\Users\rushi\civic-ai\ai-service\yolov8n.pt` and is recognized by Ultralytics as a detection model. |
| **Image & Label Integrity** | **READY** | 5,751 images, 39,093 box annotations. Zero out-of-bounds, zero invalid classes, zero non-numeric or malformed rows. |
| **Orphan Labels** | **INFO** | Exactly 4 orphan labels in `train/labels/` (safely ignored by YOLO). |
| **Class Balance** | **LIMITATION** | Severe class imbalance: Class 4 (*Electricity and Streetlights*) has only 45 train, 10 val, 10 test images (65 total). |
| **Exact Hash Duplicates** | **INFO** | 189 duplicate hash groups (180 intra-split, 9 cross-split; 8 identical labels, 1 conflicting label group). |

---

## 2. Hardware and System Resources

- **CPU**: 12th Gen Intel(R) Core(TM) i5-12450H
  - Physical Cores: 8
  - Logical Processors: 12
- **System Memory (RAM)**: 8,048,784 KB (~7.68 GiB / 8.00 GB)
- **Disk Drives**:
  - `C:` (Windows): 230.97 GB total | **45.46 GB free** (48,813,101,056 bytes)
  - `D:` (New Volume): 244.14 GB total | **102.92 GB free** (110,507,864,064 bytes)
- **GPU (NVIDIA-SMI)**:
  - GPU: **NVIDIA GeForce GTX 1650** (WDDM Driver-Model)
  - Dedicated VRAM: **4096 MiB (4.0 GB)**
  - Driver Version: **581.83**
  - Driver CUDA Support: Up to CUDA 13.0
  - Current GPU Temp: 46°C | Idle Power: 14W / 50W

---

## 3. Python Environment & Library Audit

Environment inspected: `C:\Users\rushi\civic-ai\ai-service\.venv`

| Attribute | Inspected Value | Expected / Required | Status |
| :--- | :--- | :--- | :---: |
| **Python Version** | 3.12.10 (AMD64) | 3.10 – 3.12 | PASS |
| **PyTorch Version** | `2.13.0+cpu` | PyTorch with CUDA (e.g. `cu121`/`cu124`) | **FAIL** |
| **PyTorch CUDA Enabled** | `torch.cuda.is_available() == False` | `True` | **FAIL** |
| **CUDA Version in Torch** | `None` | 12.1 / 12.4 | **FAIL** |
| **Ultralytics Version** | `8.4.101` | $\ge$ 8.0.0 | PASS |
| **Pretrained Model** | `C:\Users\rushi\civic-ai\ai-service\yolov8n.pt` (6,549,796 bytes) | YOLOv8 Detection Model | PASS |

---

## 4. Dataset Configuration (`data.yaml`)

- **File Location**: `D:\Civic-ai-Dataset\data.yaml`
- **Class Mapping**: Exactly 5 classes matching project specifications (Public Transport excluded):
  - `0`: "Roads and Footpaths"
  - `1`: "Solid Waste and Garbage"
  - `2`: "Water Supply"
  - `3`: "Sewerage and Drainage"
  - `4`: "Electricity and Streetlights"
- **Path Resolution Note**:
  `path: .` in `data.yaml` relies on the process current working directory. Running from `C:\Users\rushi\civic-ai` triggers:
  `Dataset images not found, missing path 'C:\Users\rushi\civic-ai\val\images'`.
  Changing `path: .` to `path: D:/Civic-ai-Dataset` or executing training with working directory set to `D:\Civic-ai-Dataset` resolves this.

---

## 5. Dataset Split & Annotation Statistics

### Image and Label Counts
- **Train Split**:
  - Images: **4,169**
  - Labels: **4,173** (includes 4 orphan labels)
  - Unmatched images: **0**
- **Validation Split**:
  - Images: **998**
  - Labels: **998**
  - Unmatched images: **0**
- **Test Split**:
  - Images: **584**
  - Labels: **584**
  - Unmatched images: **0**
- **Total Dataset Images**: **5,751**
- **Total Validated Annotations**: **39,093 boxes**

### Orphan Labels in `train/labels/` (4 files)
1. `India_003083_jpg.rf.46c4668e4409108fe5d079fcba981339.txt`
2. `India_003177_jpg.rf.ad314b3d647a7683c1ff2aa4efd73013.txt`
3. `India_006160_jpg.rf.5c1f8e5edc0f5c5ce818a27b3a10afb2 - Copy.txt`
4. `India_006269_jpg.rf.57e37a29d261095e4a89692afce58147 - Copy.txt`
*(YOLO natively ignores orphan label files with no corresponding image).*

### Class Distribution (Boxes / Images)

| Class ID | Class Name | Train (Boxes / Imgs) | Val (Boxes / Imgs) | Test (Boxes / Imgs) | Total Boxes | Total Imgs |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **0** | Roads and Footpaths | 2,800 / 1,296 | 417 / 174 | 364 / 165 | 3,581 | 1,635 |
| **1** | Solid Waste and Garbage | 2,117 / 1,010 | 538 / 290 | 274 / 145 | 2,929 | 1,445 |
| **2** | Water Supply | 785 / 417 | 229 / 124 | 111 / 64 | 1,125 | 605 |
| **3** | Sewerage and Drainage | 22,026 / 1,398 | 6,269 / 400 | 3,066 / 200 | 31,361 | 1,998 |
| **4** | Electricity and Streetlights | **55 / 45** | **19 / 10** | **18 / 10** | **92** | **65** |

---

## 6. Label Syntax & Integrity Validation

Every single nonempty label row across all 5,755 label files was verified:
- **Tokens per row != 5**: 0
- **Non-numeric / NaN / Inf tokens**: 0
- **Invalid class IDs (< 0 or > 4)**: 0
- **Zero or negative width/height**: 0
- **Out of bounds coordinates ($< 0.0$ or $> 1.0$)**: 0
- **Summary**: **100% syntactically valid YOLO bounding boxes.**

---

## 7. SHA-256 Duplicate Image Analysis

Recomputed SHA-256 hashes across all 5,751 images:
- **Unique hashes with multiple instances**: 189
- **Intra-split duplicate groups**: Train: 13 | Val: 94 | Test: 73
- **Cross-split duplicate groups**: **9 groups**
  - **8 groups with IDENTICAL labels**:
    1. Hash `4b3212f6...`: `train:21_jpg...` $\leftrightarrow$ `val:21_jpg...`
    2. Hash `8450e5d6...`: `train:22_jpg...` $\leftrightarrow$ `val:22_jpg...`
    3. Hash `4c82e5e0...`: `train:33_jpg...` $\leftrightarrow$ `test:33_jpg...`
    4. Hash `1111ee6c...`: `train:36_jpg...` $\leftrightarrow$ `val:36_jpg...`
    5. Hash `eb1db474...`: `train:39_jpg...` $\leftrightarrow$ `val:39_jpg...`
    6. Hash `e7268e00...`: `train:4_jpeg_jpg...` $\leftrightarrow$ `test:4_jpeg_jpg...`
    7. Hash `1b1b87bd...`: `train:8_jpg...` $\leftrightarrow$ `test:8_jpg...`
    8. Hash `defac847...`: `val:8_jpg...` $\leftrightarrow$ `test:8_jpg...`
  - **1 group with CONFLICTING labels**:
    - Hash `942775d8...`:
      - Train (`31_jpg.rf.bf004399...`): 2 boxes (Class 2 Water Supply)
      - Val (`31_jpg.rf.562f1a07...`): 4 boxes (Class 2 Water Supply)

---

## 8. Intended Output Folder

- **Path**: `D:\Civic-ai-Dataset\training_runs`
- **Drive**: `D:`
- **Free Space Available**: **102.92 GB** (sufficient for checkpoints and metrics).
- **Status**: Not created tonight (per preflight instructions).
