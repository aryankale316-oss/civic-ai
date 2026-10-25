r"""Prepare D:\Civic-ai-Dataset in place for five-department YOLO detection.

Default mode is a read-only preflight. Pass --apply to back up the labels,
remap source class IDs, convert segmentation polygons to detection boxes,
normalize YOLO folder names, and write data.yaml plus a preparation report.

Images are never modified or copied. The only backup is a zip of original
label text files, so this operation can be rolled back without duplicating
the image dataset.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(r"D:\Civic-ai-Dataset")
MANIFEST = ROOT / "merge_manifest.csv"
BACKUP = ROOT / "_labels_before_department_remap.zip"

# Five department-level target classes. Public Transport remains text-only.
TARGET_NAMES = [
    "Roads and Footpaths",
    "Solid Waste and Garbage",
    "Water Supply",
    "Sewerage and Drainage",
    "Electricity and Streetlights",
]
SOURCE_MAPS = {
    "india_pothole.v2i.yolov8": {0: 0},
    "damages detection.v3i.yolov8": {0: 0, 1: 4, 2: 4},
    "litter detection dataset.v1-all-classes.yolov8": {i: 1 for i in range(12)},
    "water leak.v1i.yolov8": {0: 2},
    "dataset": {0: 3, 1: 3},
}
SOURCE_NAMES = {
    "india_pothole.v2i.yolov8": "India_pothole.v2i.yolov8",
    "damages detection.v3i.yolov8": "Damages detection.v3i.yolov8",
    "litter detection dataset.v1-all-classes.yolov8": "Litter Detection Dataset.v1-all-classes.yolov8",
    "water leak.v1i.yolov8": "water leak.v1i.yolov8",
    "dataset": "Dataset (stagnant water / wet surface)",
}


def norm_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def parse_candidates(value: str) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def source_for_manifest_row(row: dict[str, str]) -> str | None:
    source = (row.get("source_dataset") or "").strip()
    if source:
        return source
    candidates = parse_candidates(row.get("candidate_sources", ""))
    if candidates and all(norm_name(x) == norm_name(candidates[0]) for x in candidates):
        return candidates[0]
    return None


def target_class(source: str, source_class: int) -> int:
    mapping = SOURCE_MAPS.get(norm_name(source))
    if mapping is None or source_class not in mapping:
        raise ValueError(f"No source-class mapping for {source!r} class {source_class}")
    return mapping[source_class]


def image_files(split_dir: Path) -> list[Path]:
    image_dir = split_dir / "Images"
    if not image_dir.is_dir():
        image_dir = split_dir / "images"
    if not image_dir.is_dir():
        return []
    return sorted(p for p in image_dir.iterdir() if p.is_file())


def format_num(value: float) -> str:
    return f"{value:.8f}".rstrip("0").rstrip(".") or "0"


def convert_label(text: str, source: str) -> tuple[str, int, int, int]:
    """Return converted text and counts of boxes, polygons, and invalid rows."""
    converted: list[str] = []
    box_count = polygon_count = invalid_count = 0
    for line_no, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        try:
            source_class = int(parts[0])
            values = [float(x) for x in parts[1:]]
        except (ValueError, IndexError) as exc:
            raise ValueError(f"Invalid label line {line_no}: {raw!r}") from exc
        class_id = target_class(source, source_class)
        if len(values) == 4:
            cx, cy, width, height = values
            if width <= 0 or height <= 0:
                invalid_count += 1
                continue
            box_count += 1
        elif len(values) >= 6 and len(values) % 2 == 0:
            xs, ys = values[0::2], values[1::2]
            if len(xs) < 3:
                raise ValueError(f"Polygon has fewer than 3 points at line {line_no}")
            xmin, xmax = min(xs), max(xs)
            ymin, ymax = min(ys), max(ys)
            cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
            width, height = xmax - xmin, ymax - ymin
            if width <= 0 or height <= 0:
                invalid_count += 1
                continue
            polygon_count += 1
        else:
            raise ValueError(
                f"Expected YOLO box (4 coordinates) or polygon (>=6 even coordinates) "
                f"at line {line_no}; found {len(values)} coordinates"
            )
        if any(not 0.0 <= v <= 1.0 for v in values):
            raise ValueError(f"Coordinates outside [0,1] at line {line_no}: {raw!r}")
        converted.append(" ".join(map(format_num, [class_id, cx, cy, width, height])))
    return ("\n".join(converted) + ("\n" if converted else ""), box_count, polygon_count, invalid_count)


def yaml_contents() -> str:
    names = "\n".join(f"  {i}: {json.dumps(name, ensure_ascii=False)}" for i, name in enumerate(TARGET_NAMES))
    return (
        "# Five department-level detection classes. Public Transport is text-only.\n"
        "path: .\n"
        "train: train/images\n"
        "val: val/images\n"
        "test: test/images\n"
        "names:\n"
        f"{names}\n"
    )


def rename_case_only(path: Path, target_name: str) -> Path:
    target = path.with_name(target_name)
    if path.name == target_name:
        return path
    temp = path.with_name(path.name + ".civic_tmp_rename")
    if temp.exists():
        raise FileExistsError(temp)
    path.rename(temp)
    temp.rename(target)
    return target


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="apply changes in place; default only audits")
    parser.add_argument("--config-only", action="store_true", help="write only data.yaml after the dataset is already converted")
    args = parser.parse_args()

    if args.config_only:
        if not ROOT.is_dir():
            raise SystemExit(f"Dataset root not found: {ROOT}")
        (ROOT / "data.yaml").write_text(yaml_contents(), encoding="utf-8", newline="\n")
        print(f"Wrote YOLO config: {ROOT / 'data.yaml'}")
        return 0

    if not ROOT.is_dir() or not MANIFEST.is_file():
        raise SystemExit(f"Dataset root or manifest not found: {ROOT}")
    with MANIFEST.open("r", encoding="utf-8-sig", newline="") as f:
        manifest_rows = list(csv.DictReader(f))
    source_by_key: dict[tuple[str, str], str] = {}
    ambiguous_water_rows = 0
    for row in manifest_rows:
        split = (row.get("split") or "").strip()
        name = (row.get("merged_image_filename") or "").strip()
        source = source_for_manifest_row(row)
        if row.get("source_status") == "ambiguous" and source:
            ambiguous_water_rows += 1
        if split and name and source:
            source_by_key[(split.casefold(), name.casefold())] = source

    plans: list[tuple[Path, Path, str, str]] = []
    format_counts = Counter()
    split_counts = Counter()
    source_counts = Counter()
    labels_without_images: list[str] = []
    missing_labels: list[str] = []
    inferred_names: list[str] = []
    failures: list[str] = []
    current_images: set[tuple[str, str]] = set()

    for split_dir_name, split_lower in (("Train", "train"), ("Validate", "val"), ("Test", "test")):
        split_dir = ROOT / split_dir_name
        if not split_dir.is_dir():
            split_dir = ROOT / split_lower
        if not split_dir.is_dir():
            continue
        split_key = split_dir_name
        for image in image_files(split_dir):
            current_images.add((split_key.casefold(), image.name.casefold()))
            label_dir = split_dir / ("Labels" if (split_dir / "Labels").is_dir() else "labels")
            label = label_dir / f"{image.stem}.txt"
            source = source_by_key.get((split_key.casefold(), image.name.casefold()))
            if source is None:
                # These three post-manifest additions are clearly plumbing-leak examples by filename.
                lowered = image.name.casefold()
                if any(term in lowered for term in ("plumbing", "leak", "leakingwaterpipe", "static-wixstatic-com_media_5c410d")):
                    source = "water leak.v1i.yolov8"
                    inferred_names.append(image.name)
            if source is None:
                failures.append(f"No source mapping for {split_key}/{image.name}")
                continue
            if not label.is_file():
                missing_labels.append(f"{split_key}/{image.name}")
                continue
            try:
                original = label.read_text(encoding="utf-8-sig")
                converted, boxes, polygons, invalid = convert_label(original, source)
            except Exception as exc:
                failures.append(f"{split_key}/{label.name}: {exc}")
                continue
            plans.append((label, image, source, converted))
            source_counts[SOURCE_NAMES.get(norm_name(source), source)] += 1
            split_counts[split_key] += 1
            format_counts["box_annotations"] += boxes
            format_counts["polygon_annotations_converted"] += polygons
            format_counts["zero_area_annotations_dropped"] += invalid

    for split_dir_name, split_lower in (("Train", "train"), ("Validate", "val"), ("Test", "test")):
        split_dir = ROOT / split_dir_name
        if not split_dir.is_dir():
            split_dir = ROOT / split_lower
        if not split_dir.is_dir():
            continue
        label_dir = split_dir / ("Labels" if (split_dir / "Labels").is_dir() else "labels")
        image_dir = split_dir / ("Images" if (split_dir / "Images").is_dir() else "images")
        if not label_dir.is_dir():
            continue
        image_stems = {p.stem.casefold() for p in image_dir.iterdir() if p.is_file()} if image_dir.is_dir() else set()
        for label in label_dir.glob("*.txt"):
            if label.stem.casefold() not in image_stems:
                labels_without_images.append(f"{split_dir_name}/{label.name}")

    current_only = sorted(current_images - set(source_by_key))
    manifest_only = sorted(set(source_by_key) - current_images)

    print(f"Dataset: {ROOT}")
    print(f"Manifest rows: {len(manifest_rows)}; image-label pairs convertible: {len(plans)}")
    print(f"Mapped source counts: {dict(source_counts)}")
    print(f"Ambiguous manifest rows resolved by same water-leak candidate: {ambiguous_water_rows}")
    print(f"Images inferred as water-leak additions (not in manifest): {len(inferred_names)}")
    print(f"Annotation rows: {dict(format_counts)}")
    print(f"Images missing labels: {len(missing_labels)}; orphan labels: {len(labels_without_images)}")
    print(f"Current images absent from manifest: {len(current_only)}; stale manifest images: {len(manifest_only)}")
    print("Repeated-image hashes are not rescanned by this label-only preflight.")
    if inferred_names:
        print("Inferred additions:")
        for name in inferred_names:
            print(f"  {name}")
    if labels_without_images:
        print("Orphan labels (left untouched):")
        for name in labels_without_images:
            print(f"  {name}")
    if failures:
        print(f"PRECHECK FAILED ({len(failures)} issues):")
        for issue in failures[:100]:
            print(f"  {issue}")
        return 2

    if not args.apply:
        print("Read-only preflight complete. No files were changed. Use --apply to proceed.")
        return 0

    if BACKUP.exists():
        raise SystemExit(f"Refusing to overwrite existing rollback archive: {BACKUP}")
    # Preserve the original annotation files before any in-place rewrite.
    with zipfile.ZipFile(BACKUP, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for label, _, _, _ in plans:
            archive.write(label, label.relative_to(ROOT).as_posix())
    print(f"Original labels backed up to: {BACKUP}")

    for label, _, _, converted in plans:
        temp = label.with_suffix(label.suffix + ".tmp")
        temp.write_text(converted, encoding="utf-8", newline="\n")
        temp.replace(label)

    # Normalize directory names in-place for Ultralytics' image-to-label lookup.
    for old, new in (("Train", "train"), ("Validate", "val"), ("Test", "test")):
        split_dir = ROOT / old
        if not split_dir.is_dir():
            split_dir = ROOT / new
        if not split_dir.is_dir():
            raise FileNotFoundError(f"Missing split directory {old}")
        split_dir = rename_case_only(split_dir, new)
        for old_child, new_child in (("Images", "images"), ("Labels", "labels")):
            child = split_dir / old_child
            if not child.is_dir():
                child = split_dir / new_child
            if not child.is_dir():
                raise FileNotFoundError(f"Missing {old_child} under {split_dir}")
            rename_case_only(child, new_child)

    (ROOT / "data.yaml").write_text(yaml_contents(), encoding="utf-8", newline="\n")
    report = [
        "# In-place YOLO dataset preparation report",
        "",
        f"Dataset root: `{ROOT}`",
        "Original images were not modified or copied. Original label files are archived in `_labels_before_department_remap.zip`.",
        "",
        "## Target classes",
        *[f"- {i}: {name}" for i, name in enumerate(TARGET_NAMES)],
        "",
        "## Mapping applied",
        "- India_pothole class 0 (D40) -> Roads and Footpaths (assumed from source dataset name).",
        "- Damages class 0 -> Roads and Footpaths; classes 1 and 2 -> Electricity and Streetlights.",
        "- Litter classes 0-11 -> Solid Waste and Garbage.",
        "- Water leak class 0 -> Water Supply.",
        "- Stagnant dataset classes 0-1 -> Sewerage and Drainage.",
        "- Three unlisted plumbing/leak images were assigned to Water Supply based on filename and visual inspection.",
        "- Polygon segmentation rows were converted to enclosing YOLO detection boxes.",
        "",
        "## Audit counts",
        f"- Converted image-label pairs: {len(plans)}",
        f"- Box annotation rows retained: {format_counts['box_annotations']}",
        f"- Polygon rows converted: {format_counts['polygon_annotations_converted']}",
        f"- Zero-area annotation rows dropped: {format_counts['zero_area_annotations_dropped']}",
        f"- Orphan labels left untouched: {len(labels_without_images)}",
        "- The earlier image-hash audit found repeated-image groups, including 9 groups crossing splits. Review them before claiming held-out evaluation metrics.",
        f"- Ambiguous rows resolved because all candidates identify the same water-leak source: {ambiguous_water_rows}",
        "",
        "The YOLO train/val/test split is retained. Repeated image files were not deleted; cross-split duplicates can inflate evaluation scores.",
    ]
    (ROOT / "preparation_report.md").write_text("\n".join(report) + "\n", encoding="utf-8", newline="\n")
    print(f"Applied in place. Config: {ROOT / 'data.yaml'}")
    print(f"Report: {ROOT / 'preparation_report.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
