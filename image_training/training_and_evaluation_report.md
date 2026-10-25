# Civic AI YOLOv8 Image Model Training & Evaluation Report

**Date of Execution**: October 24, 2026  
**Executed By**: Antigravity Autonomous Agent (via `/goal` directive)  
**Project**: Civic AI Municipal Complaint System  
**Dataset**: `D:\Civic-ai-Dataset`  
**Model Architecture**: Ultralytics YOLOv8 Nano Detection (`yolov8n.pt`)  
**Status**: **COMPLETED & FULLY EVALUATED**

---

## 1. Executive Summary

| Phase | Status | Details |
| :--- | :---: | :--- |
| **System & GPU Verification** | **PASS** | NVIDIA GeForce GTX 1650 (4 GB VRAM), 12th Gen Intel i5-12450H, 102+ GB free disk space on D:. |
| **Environment Isolation** | **PASS** | Dedicated `.venv-train` created at `C:\Users\rushi\civic-ai\.venv-train`. Application `.venv` remained untouched. |
| **CUDA Verification** | **PASS** | Official PyTorch 2.6.0 with CUDA 12.4 (`torch-2.6.0+cu124`) verified. Tensor allocated on GPU. |
| **Dataset Duplicate Quarantine** | **PASS** | Manifest backed up; 10 cross-split duplicates safely moved to timestamped quarantine folder under D:. **Zero leakage remains.** |
| **1-Epoch Smoke Test** | **PASS** | Duration: 269.96s (4.50 min). Verified all 5 classes loaded, checkpoints generated, zero label errors. |
| **Full Training Run** | **PASS** | 84 completed epochs on CUDA (`device=0`). Early stopping triggered smoothly. Final model weights saved. |
| **Test Set Evaluation** | **PASS** | Evaluated `best.pt` on 580 held-out test images (3,828 annotations). Overall mAP@50: **20.74%**, mAP@50-95: **8.98%**. |

---

## 2. Hardware and Environment Specifications

### Computer Hardware
- **Processor**: 12th Gen Intel(R) Core(TM) i5-12450H (8 physical cores, 12 logical processors)
- **RAM**: 8.0 GB Physical Memory (~7.68 GiB visible)
- **Disk Storage**:
  - `C:` (System): 44.96 GB free of 230.97 GB
  - `D:` (Dataset & Training Storage): **102.92 GB free** of 244.14 GB
- **GPU (`nvidia-smi`)**:
  - **Model**: NVIDIA GeForce GTX 1650
  - **VRAM**: 4096 MiB (4 GB)
  - **Driver Version**: 581.83 (CUDA driver capability 13.0)

### Training Python Environment
- **Path**: `C:\Users\rushi\civic-ai\.venv-train` (Dedicated; `ai-service\.venv` was left completely untouched)
- **Python Version**: 3.12.10 (AMD64)
- **Packages Installed**:
  - `torch==2.6.0+cu124` (Installed via official index: `https://download.pytorch.org/whl/cu124`)
  - `torchvision==0.21.0+cu124`
  - `ultralytics==8.4.185`
  - `faster-coco-eval==1.8.0`

---

## 3. Dataset Audit & Cross-Split Duplicate Quarantine

### Pre-Training Integrity Checks
- All label files across `train`, `val`, and `test` were validated:
  - 100% of rows contain exactly 5 finite numeric values.
  - 100% of class IDs are strictly within $[0, 4]$.
  - Coordinates normalized in $[0, 1]$; positive width and height.
  - Zero out-of-bounds or malformed entries.
  - 4 orphan labels in `train/labels/` safely bypassed by YOLO (no corresponding images exist).

### Duplicate Leakage Quarantine
Prior audit identified 9 cross-split duplicate image groups. Before training:
1. **Manifest Backup**: Backed up `merge_manifest.csv` to:  
   `D:\Civic-ai-Dataset\manifest_backups\merge_manifest_backup_20261024_102341.csv`
2. **Move Log**: Recorded all move actions to:  
   `D:\Civic-ai-Dataset\duplicate_quarantine_moves_20261024_102341.csv`
3. **Reversible Quarantine**: 10 duplicate image/label pairs were moved to:  
   `D:\Civic-ai-Dataset\quarantine_20261024_102341\`
   - **Conflicting Group 3** (`31_jpg` with 2 boxes in train vs 4 boxes in val): **Both copies quarantined** to prevent introducing ambiguous ground truth.
   - **Identical Groups 1, 2, 4, 5, 6, 7, 8, 9**: Retained single canonical copy in primary split; moved redundant copies to quarantine.
   - **Zero files were deleted.**
4. **Post-Quarantine Dataset Counts**:
   - **Train**: 4,168 images | 4,172 labels
   - **Validation**: 993 images | 993 labels
   - **Test**: 580 images | 580 labels
   - **Cross-Split Duplicates Remaining**: **0 (Zero Leakage)**

### Class Support & Imbalance Notice

| Class ID | Class Name | Train Instances | Val Instances | Test Instances | Total Bounding Boxes | Total Images |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **0** | Roads and Footpaths | 2,800 | 417 | 364 | 3,581 | 1,635 |
| **1** | Solid Waste and Garbage | 2,117 | 538 | 274 | 2,929 | 1,445 |
| **2** | Water Supply | 783 | 219 | 106 | 1,108 | 595 |
| **3** | Sewerage and Drainage | 22,026 | 6,269 | 3,066 | 31,361 | 1,998 |
| **4** | Electricity and Streetlights | **55** | **19** | **18** | **92** | **65** |

*(Notice: Public Transport is text-only and handled by the bilingual NLP classifier).*

---

## 4. Training Workflow Execution

### Smoke Test (1 Epoch)
- **Model**: `C:\Users\rushi\civic-ai\ai-service\yolov8n.pt`
- **Settings**: `imgsz=640`, `batch=2`, `workers=0`, `cache=False`, `device=0`
- **Output Directory**: `D:\Civic-ai-Dataset\training_runs\smoke_test_20261024_102450\`
- **Duration**: **269.96 seconds (4.50 minutes)**
- **Verification**: All 5 classes recognized, `best.pt` (6.5 MB) and `last.pt` (6.5 MB) successfully created.
- **Duration Estimate for 100 Epochs**: ~7.5 hours rough estimate.

### Full Training Run
- **Output Directory**: `D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\`
- **Parameters**: `epochs=100`, `patience=20`, `imgsz=640`, `workers=0`, `cache=False`, `device=0`
- **Pacing & Resuming**:
  - Started at `batch=4` for epochs 1–13.
  - At epoch 14, host memory was relieved by setting `batch=2` in `args.yaml` and resuming directly from `last.pt`.
  - The checkpoint loaded seamlessly at epoch 14 and continued training without losing prior progress.
- **Early Stopping**: Triggered automatically at **Epoch 84** (after 20 epochs with no validation loss improvement over Epoch 64's peak).
- **Total Training Duration**: ~4.5 hours on the NVIDIA GTX 1650.
- **Final Weights**:
  - `best.pt`: 6,514,787 bytes (Saved at peak validation score)
  - `last.pt`: 6,514,787 bytes (Saved at epoch 84)

---

## 5. Held-Out Test Set Evaluation Results

The final `best.pt` model was evaluated on the **clean, held-out test split (580 images, 3,828 ground-truth annotations)**:

### Overall Test Metrics
- **Mean Precision (mp)**: **31.41%** (`0.3141`)
- **Mean Recall (mr)**: **27.85%** (`0.2785`)
- **mAP@50**: **20.74%** (`0.2074`)
- **mAP@50-95**: **8.98%** (`0.0898`)
- **Inference Speed**: **7.6 ms per image** (over 130 FPS on the GTX 1650!)

### Per-Class Test Breakdown

| Class ID | Department Class | Precision | Recall | mAP@50 | mAP@50-95 | Test Images | Test Boxes |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | Roads and Footpaths | 36.85% | **42.03%** | **33.36%** | **12.42%** | 165 | 364 |
| **1** | Solid Waste and Garbage | 33.62% | **40.88%** | **29.93%** | **17.57%** | 145 | 274 |
| **2** | Water Supply | 21.37% | 27.36% | **13.44%** | 5.79% | 60 | 106 |
| **3** | Sewerage and Drainage | **34.79%** | 23.45% | **21.06%** | 6.56% | 200 | 3,066 |
| **4** | Electricity and Streetlights | 30.42% | 5.56% | **5.91%** | 2.57% | 10 | 18 |

---

## 6. Critical Analysis & Model Limitations

1. **Department-Level Class Semantics**:
   - The model is trained to recognize civic **departments/problem categories**, not fine-grained objects. For example, a pothole, broken sidewalk, or road fissure is labeled *Roads and Footpaths*; a puddle, burst pipe, or tap is labeled *Water Supply*.
2. **Extreme Class Imbalance on Class 4**:
   - Class 4 (*Electricity and Streetlights*) has only 18 test bounding boxes across 10 images (and only 65 images in the entire dataset). While its precision is reasonable (30.4%), its recall is low (5.6%). Metric scores for Class 4 must be considered **preliminary** and interpreted with this severe data scarcity in mind. Additional streetlight and electrical hazard training images should be collected in future dataset iterations.
3. **Dataset Metric vs. Real-World Domain Shift**:
   - A test mAP@50 of 20.74% on complex, unconstrained street scenes with high occlusion is a solid baseline for a nano model (`yolov8n`), but dataset metrics do not guarantee perfect real-world performance under variable lighting, weather, or extreme angles.
4. **Dataset Licenses and Reuse**:
   - Source images originate from various public civic datasets (such as Indian Pothole, Roboflow open datasets). Prior to distributing or publishing the dataset publicly or deploying in commercial services, confirm the individual source attribution licenses (CC-BY, MIT, etc.).

---

## 7. Artifact Paths & Commands

### File Paths
- **Trained Best Weights**: `D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\weights\best.pt`
- **Last Epoch Checkpoint**: `D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\weights\last.pt`
- **Test Metrics JSON**: `D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\test_evaluation_summary.json`
- **Training Plots & Curves**: `D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\results.png`
- **Training Script**: `C:\Users\rushi\civic-ai\image_training\train_yolov8.py`
- **Evaluation Script**: `C:\Users\rushi\civic-ai\image_training\evaluate_yolov8.py`
- **Manifest Backup**: `D:\Civic-ai-Dataset\manifest_backups\merge_manifest_backup_20261024_102341.csv`
- **Quarantine Folder**: `D:\Civic-ai-Dataset\quarantine_20261024_102341\`

### Reproduction Command
To re-evaluate or run inferences using `.venv-train`:
```powershell
& "C:\Users\rushi\civic-ai\.venv-train\Scripts\python.exe" C:\Users\rushi\civic-ai\image_training\evaluate_yolov8.py --weights "D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\weights\best.pt" --data "D:\Civic-ai-Dataset\data.yaml" --split test
```

### Resume Command (If needed on any checkpoint)
```powershell
& "C:\Users\rushi\civic-ai\.venv-train\Scripts\python.exe" -c "import os; from ultralytics import YOLO; os.chdir(r'D:\Civic-ai-Dataset'); model = YOLO(r'D:\Civic-ai-Dataset\training_runs\full_train_20261024_103000\weights\last.pt'); model.train(resume=True)"
```
