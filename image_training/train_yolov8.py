"""Civic AI YOLOv8 Training Script.

Trains YOLOv8 detection model on Civic AI Dataset (5 departments)
using verified CUDA GPU settings, workers=0, cache=False, and early stopping.
"""
import argparse
import os
from datetime import datetime
from pathlib import Path


def train_civic_detector(
    data_yaml: str = r"D:\Civic-ai-Dataset\data.yaml",
    model_weights: str = r"C:\Users\rushi\civic-ai\ai-service\yolov8n.pt",
    output_root: str = r"D:\Civic-ai-Dataset\training_runs",
    epochs: int = 100,
    patience: int = 20,
    batch_size: int = 4,
    imgsz: int = 640,
    device: int = 0,
    run_name: str | None = None,
    resume: bool = False,
    resume_path: str | None = None,
):
    import torch
    from ultralytics import YOLO

    print("=" * 60)
    print("Civic AI YOLOv8 Training Initialization")
    print("=" * 60)
    print(f"PyTorch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if not torch.cuda.is_available():
        raise RuntimeError("CRITICAL ERROR: CUDA is not available in PyTorch. Refusing to train on CPU.")
    
    gpu_name = torch.cuda.get_device_name(device)
    print(f"Selected Device: cuda:{device} ({gpu_name})")
    
    # Verify data yaml exists
    data_path = Path(data_yaml)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset YAML not found at: {data_yaml}")

    # Set working directory to dataset root so relative path 'path: .' in data.yaml resolves properly
    dataset_dir = data_path.parent
    os.chdir(str(dataset_dir))
    print(f"Active Working Directory: {os.getcwd()}")

    # Determine unique run name
    if not run_name:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_name = f"yolov8n_run_{timestamp}"
    
    print(f"Project Output Directory: {output_root}")
    print(f"Run Name: {run_name}")
    print(f"Epochs: {epochs} (Patience: {patience})")
    print(f"Batch Size: {batch_size} | Image Size: {imgsz}")
    print("Workers: 0 | Cache: False")
    print("=" * 60)

    if resume:
        if not resume_path:
            raise ValueError("Resume requested but no resume_path specified.")
        print(f"Resuming training from checkpoint: {resume_path}")
        model = YOLO(resume_path)
        model.train(resume=True)
    else:
        print(f"Loading initial model weights: {model_weights}")
        model = YOLO(model_weights)
        
        # Batch size fallback loop in case of CUDA OOM
        current_batch = batch_size
        while current_batch >= 1:
            try:
                print(f"\nAttempting training with batch_size={current_batch}...")
                model.train(
                    data="data.yaml",
                    epochs=epochs,
                    patience=patience,
                    batch=current_batch,
                    imgsz=imgsz,
                    workers=0,
                    cache=False,
                    device=device,
                    project=str(output_root),
                    name=run_name,
                    exist_ok=False,
                    verbose=True,
                )
                break
            except RuntimeError as e:
                if "out of memory" in str(e).lower() or "cuda oom" in str(e).lower():
                    print(f"WARNING: CUDA Out Of Memory at batch={current_batch}!")
                    torch.cuda.empty_cache()
                    current_batch //= 2
                    if current_batch < 1:
                        raise RuntimeError("CUDA OOM even at batch=1. Cannot proceed on current GPU.")
                    print(f"Retrying with batch={current_batch}...")
                else:
                    raise

    print("\nTraining completed successfully!")
    save_dir = getattr(model.trainer, "save_dir", Path(output_root) / run_name)
    best_pt = Path(save_dir) / "weights" / "best.pt"
    last_pt = Path(save_dir) / "weights" / "last.pt"
    print(f"Best weights: {best_pt} (Exists: {best_pt.exists()})")
    print(f"Last weights: {last_pt} (Exists: {last_pt.exists()})")
    return save_dir

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Civic AI YOLOv8 model")
    parser.add_argument("--data", default=r"D:\Civic-ai-Dataset\data.yaml", help="Path to data.yaml")
    parser.add_argument("--model", default=r"C:\Users\rushi\civic-ai\ai-service\yolov8n.pt", help="Initial weights")
    parser.add_argument("--output", default=r"D:\Civic-ai-Dataset\training_runs", help="Output directory")
    parser.add_argument("--epochs", type=int, default=100, help="Max epochs")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience")
    parser.add_argument("--batch", type=int, default=4, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=int, default=0, help="GPU device ID")
    parser.add_argument("--name", default=None, help="Run name")
    parser.add_argument("--resume", action="store_true", help="Resume training")
    parser.add_argument("--resume-path", default=None, help="Path to last.pt to resume")

    args = parser.parse_args()
    train_civic_detector(
        data_yaml=args.data,
        model_weights=args.model,
        output_root=args.output,
        epochs=args.epochs,
        patience=args.patience,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        run_name=args.name,
        resume=args.resume,
        resume_path=args.resume_path,
    )
