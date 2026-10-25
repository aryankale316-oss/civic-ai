# Civic AI YOLOv8 Image Training & Evaluation

This directory contains standalone, production-ready scripts for training and evaluating the Civic AI YOLOv8 object detection model across the 5 municipal department classes.

## Class Definition
- **0: Roads and Footpaths**
- **1: Solid Waste and Garbage**
- **2: Water Supply**
- **3: Sewerage and Drainage**
- **4: Electricity and Streetlights**

*(Note: Public Transport is text-only and handled by the bilingual text classification model; it is not included in the vision model).*

---

## Directory Structure
- `train_yolov8.py`: Script to train or resume YOLOv8 models with automatic CUDA validation, early stopping, and OOM fallback.
- `evaluate_yolov8.py`: Script to evaluate `best.pt` on the test split and export per-class metrics.
- `preflight_report.md`: Preflight hardware, dataset, and environment verification audit report.

---

## Running Training
To train using the dedicated `.venv-train` environment on CUDA:
```powershell
& "C:\Users\rushi\civic-ai\.venv-train\Scripts\python.exe" C:\Users\rushi\civic-ai\image_training\train_yolov8.py --epochs 100 --batch 4 --patience 20
```

## Resuming an Interrupted Run
If training is interrupted, resume cleanly using the checkpoint without losing progress:
```powershell
& "C:\Users\rushi\civic-ai\.venv-train\Scripts\python.exe" C:\Users\rushi\civic-ai\image_training\train_yolov8.py --resume --resume-path "D:\Civic-ai-Dataset\training_runs\<run_name>\weights\last.pt"
```

## Running Evaluation
To evaluate a trained checkpoint on the held-out test split:
```powershell
& "C:\Users\rushi\civic-ai\.venv-train\Scripts\python.exe" C:\Users\rushi\civic-ai\image_training\evaluate_yolov8.py --weights "D:\Civic-ai-Dataset\training_runs\<run_name>\weights\best.pt" --split test --save-json "D:\Civic-ai-Dataset\training_runs\<run_name>\test_metrics.json"
```
