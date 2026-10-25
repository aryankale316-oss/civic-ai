"""Civic AI YOLOv8 Evaluation Script.

Evaluates a trained YOLOv8 model on the test split and reports
overall and per-class metrics (Precision, Recall, mAP50, mAP50-95),
confusion matrix, and sample counts.
"""
import argparse
import json
import os
from pathlib import Path


def evaluate_model(
    weights_path: str,
    data_yaml: str = r"D:\Civic-ai-Dataset\data.yaml",
    split: str = "test",
    imgsz: int = 640,
    batch: int = 2,
    device: int = 0,
    save_json: str | None = None,
):
    import torch
    from ultralytics import YOLO

    weights_file = Path(weights_path)
    if not weights_file.exists():
        raise FileNotFoundError(f"Model weights not found at: {weights_path}")

    data_file = Path(data_yaml)
    if not data_file.exists():
        raise FileNotFoundError(f"Dataset YAML not found at: {data_yaml}")

    # Set working directory to dataset root so relative path 'path: .' in data.yaml resolves properly
    dataset_dir = data_file.parent
    os.chdir(str(dataset_dir))

    print("=" * 60)
    print(f"Civic AI YOLOv8 Evaluation on '{split}' Split")
    print("=" * 60)
    print(f"Weights: {weights_path}")
    print(f"Device: cuda:{device} ({torch.cuda.get_device_name(device)})")
    print(f"Batch: {batch} | Imgsz: {imgsz}")
    print("=" * 60)

    model = YOLO(str(weights_file))
    metrics = model.val(
        data="data.yaml",
        split=split,
        imgsz=imgsz,
        batch=batch,
        workers=0,
        device=device,
        save_json=True,
        verbose=True,
    )

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS SUMMARY")
    print("=" * 60)
    print(f"Overall Mean Precision (mp)    : {metrics.box.mp:.4f}")
    print(f"Overall Mean Recall (mr)       : {metrics.box.mr:.4f}")
    print(f"Overall mAP@50 (map50)         : {metrics.box.map50:.4f}")
    print(f"Overall mAP@50-95 (map50-95)   : {metrics.box.map:.4f}")
    print("-" * 60)

    class_names = metrics.names
    per_class_results = {}
    print(f"{'Class ID':<10} {'Class Name':<30} {'Precision':<12} {'Recall':<12} {'mAP50':<12} {'mAP50-95':<12}")
    print("-" * 90)

    # metrics.box.p, metrics.box.r, metrics.box.ap50, metrics.box.ap are arrays per class
    for i, c_name in class_names.items():
        p_val = float(metrics.box.p[i]) if i < len(metrics.box.p) else 0.0
        r_val = float(metrics.box.r[i]) if i < len(metrics.box.r) else 0.0
        ap50_val = float(metrics.box.ap50[i]) if i < len(metrics.box.ap50) else 0.0
        ap_val = float(metrics.box.ap[i]) if i < len(metrics.box.ap) else 0.0

        per_class_results[str(i)] = {
            "name": c_name,
            "precision": round(p_val, 4),
            "recall": round(r_val, 4),
            "map50": round(ap50_val, 4),
            "map50_95": round(ap_val, 4),
        }
        print(f"{i:<10} {c_name:<30} {p_val:<12.4f} {r_val:<12.4f} {ap50_val:<12.4f} {ap_val:<12.4f}")

    summary_data = {
        "weights": str(weights_path),
        "split": split,
        "overall": {
            "precision": round(float(metrics.box.mp), 4),
            "recall": round(float(metrics.box.mr), 4),
            "map50": round(float(metrics.box.map50), 4),
            "map50_95": round(float(metrics.box.map), 4),
        },
        "per_class": per_class_results,
    }

    if save_json:
        out_p = Path(save_json)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2)
        print(f"\nSaved evaluation summary JSON to: {out_p}")

    return summary_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Civic AI YOLOv8 model")
    parser.add_argument("--weights", required=True, help="Path to weights file (best.pt)")
    parser.add_argument("--data", default=r"D:\Civic-ai-Dataset\data.yaml", help="Path to data.yaml")
    parser.add_argument("--split", default="test", help="Split to evaluate on (test, val)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=2, help="Batch size")
    parser.add_argument("--device", type=int, default=0, help="GPU device ID")
    parser.add_argument("--save-json", default=None, help="Path to output summary json")

    args = parser.parse_args()
    evaluate_model(
        weights_path=args.weights,
        data_yaml=args.data,
        split=args.split,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        save_json=args.save_json,
    )
