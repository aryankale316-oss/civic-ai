"""Move a small number of class-4 examples into val/test without copying data."""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import shutil
from collections import Counter
from pathlib import Path

ROOT = Path(r"D:\Civic-ai-Dataset")
MANIFEST = ROOT / "merge_manifest.csv"
MANIFEST_BACKUP = ROOT / "_merge_manifest_before_electricity_rebalance.csv"
MOVE_LOG = ROOT / "electricity_split_moves.csv"
TARGET_PER_SPLIT = 10


def image_for_label(split: str, label: Path) -> Path | None:
    folder = ROOT / split / "images"
    matches = [p for p in folder.iterdir() if p.is_file() and p.stem.casefold() == label.stem.casefold()]
    return matches[0] if len(matches) == 1 else None


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="move 10 unique examples to val and 10 to test")
    args = parser.parse_args()

    candidates = []
    for label in sorted((ROOT / "train" / "labels").glob("*.txt"), key=lambda p: p.name.casefold()):
        if any(line.strip().split(maxsplit=1)[0] == "4" for line in label.read_text(encoding="utf-8-sig").splitlines() if line.strip()):
            image = image_for_label("train", label)
            if image:
                candidates.append((image, label))
    if len(candidates) < TARGET_PER_SPLIT * 2:
        raise SystemExit(f"Only {len(candidates)} class-4 training images; cannot allocate 10 each to val/test.")

    # Hash existing images so moved samples cannot have an identical image in another split.
    digest_counts: Counter[str] = Counter()
    candidate_hashes: dict[str, tuple[Path, Path]] = {}
    split_files: list[tuple[str, Path]] = []
    for split in ("train", "val", "test"):
        for image in (ROOT / split / "images").iterdir():
            if image.is_file():
                split_files.append((split, image))
    for split, image in split_files:
        sha = digest(image)
        digest_counts[sha] += 1
        if split == "train":
            for candidate_image, candidate_label in candidates:
                if image == candidate_image:
                    candidate_hashes[sha] = (candidate_image, candidate_label)
                    break

    eligible = [candidate_hashes[h] for h, count in digest_counts.items() if count == 1 and h in candidate_hashes]
    if len(eligible) < TARGET_PER_SPLIT * 2:
        raise SystemExit(
            f"Only {len(eligible)} unique class-4 images have no exact duplicate anywhere in the dataset; "
            "no files were moved."
        )
    val_moves = eligible[:TARGET_PER_SPLIT]
    test_moves = eligible[TARGET_PER_SPLIT : TARGET_PER_SPLIT * 2]
    moves = [(image, label, "val") for image, label in val_moves] + [(image, label, "test") for image, label in test_moves]

    print(f"Class-4 training images: {len(candidates)}")
    print(f"Exact-duplicate-free candidates: {len(eligible)}")
    print(f"Planned moves: {len(val_moves)} to val, {len(test_moves)} to test")
    for image, _, target in moves:
        print(f"  {image.name} -> {target}")
    if not args.apply:
        print("Read-only plan only; no files moved. Use --apply to proceed.")
        return 0

    if MANIFEST_BACKUP.exists() or MOVE_LOG.exists():
        raise SystemExit("A rebalance backup/log already exists; refusing to overwrite it.")
    with MANIFEST.open("rb") as f:
        original_manifest_bytes = f.read()
    MANIFEST_BACKUP.write_bytes(original_manifest_bytes)

    rows = list(csv.DictReader(original_manifest_bytes.decode("utf-8-sig").splitlines()))
    manifest_split_name = {"val": "Validate", "test": "Test"}
    moved_names = {image.name.casefold(): manifest_split_name[target] for image, _, target in moves}
    for row in rows:
        target = moved_names.get((row.get("merged_image_filename") or "").casefold())
        if target:
            row["split"] = target
    fieldnames = list(rows[0].keys()) if rows else []
    tmp_manifest = MANIFEST.with_suffix(".csv.tmp")
    with tmp_manifest.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    moved: list[tuple[Path, Path, Path, Path]] = []
    try:
        for image, label, target in moves:
            new_image = ROOT / target / "images" / image.name
            new_label = ROOT / target / "labels" / label.name
            if new_image.exists() or new_label.exists():
                raise FileExistsError(f"Destination already exists for {image.name}")
            shutil.move(str(image), str(new_image))
            shutil.move(str(label), str(new_label))
            moved.append((image, label, new_image, new_label))
        os.replace(tmp_manifest, MANIFEST)
    except Exception:
        for old_image, old_label, new_image, new_label in reversed(moved):
            if new_image.exists():
                shutil.move(str(new_image), str(old_image))
            if new_label.exists():
                shutil.move(str(new_label), str(old_label))
        if tmp_manifest.exists():
            tmp_manifest.unlink()
        raise

    with MOVE_LOG.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "previous_split", "new_split", "sha256"])
        for image, _, target in moves:
            writer.writerow([image.name, "Train", manifest_split_name[target], digest(ROOT / target / "images" / image.name)])
    print(f"Moved files. Manifest backup: {MANIFEST_BACKUP}")
    print(f"Move log: {MOVE_LOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
