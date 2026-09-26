# Custom civic image-recognition dataset

Add labelled images before training. Use the standard YOLO folder layout:

```
images/train/    labels/train/
images/val/      labels/val/
images/test/     labels/test/     # optional
```

Each image needs a matching `.txt` label. Each row is:

```
class_id center_x center_y width height
```

Coordinates are normalized from 0 to 1. Class IDs are `0=pothole`,
`1=garbage`, and `2=waterlogging`.

After adding representative images, train and evaluate the model:

```powershell
cd ai-service
venv\Scripts\python train_civic_detector.py
```

It writes `models/civic_detector/weights/best.pt` and prints precision,
recall, mAP50, and mAP50-95. Restart the AI service after training; its
`/detect-issues` endpoint will then automatically use the custom model.

Do not claim the detector is accurate until it has been trained and evaluated
with a representative labelled test dataset.
