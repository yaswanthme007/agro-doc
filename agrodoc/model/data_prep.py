import os
import json
import random
from pathlib import Path
from collections import defaultdict

from datasets import load_dataset
from PIL import Image

DATASET_NAME = "BrandonFors/Plant-Diseases-PlantVillage-Dataset"
DATA_DIR = Path(__file__).parent / "data"
TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
CLASS_LABELS_PATH = DATA_DIR / "class_labels.json"

TRAIN_PER_CLASS = 175
VAL_PER_CLASS = 30
SEED = 42


def format_class_name(raw: str) -> str:
    parts = raw.replace("___", " - ").replace("_", " ")
    return parts.title()


def inspect_dataset(ds):
    print("\n--- Dataset Schema ---")
    print("Features:", ds.features)
    print("Column names:", ds.column_names)
    print("Number of rows:", len(ds))
    print("----------------------\n")


def detect_columns(ds):
    cols = ds.column_names
    image_col = next(
        (c for c in cols if "image" in c.lower() or "img" in c.lower()), None
    )
    label_col = next(
        (c for c in cols if "label" in c.lower() or "class" in c.lower()), None
    )
    if image_col is None or label_col is None:
        print(f"Available columns: {cols}")
        raise ValueError(
            f"Could not auto-detect image/label columns. "
            f"Found image_col={image_col!r}, label_col={label_col!r}. "
            "Update detect_columns() with the correct names."
        )
    print(f"Detected columns — image: '{image_col}', label: '{label_col}'")
    return image_col, label_col


def resolve_class_names(ds, label_col):
    feature = ds.features[label_col]
    if hasattr(feature, "names"):
        return feature.names
    # Fallback: collect unique string labels
    unique = sorted(set(str(ds[i][label_col]) for i in range(len(ds))))
    return unique


def build_index(ds, label_col, class_names):
    print("Building per-class index...")
    index = defaultdict(list)
    for i, example in enumerate(ds):
        raw = example[label_col]
        label = class_names[raw] if isinstance(raw, int) else str(raw)
        index[label].append(i)
        if (i + 1) % 5000 == 0:
            print(f"  Indexed {i + 1} / {len(ds)} examples")
    print(f"Indexed {len(ds)} examples across {len(index)} classes.\n")
    return index


def save_split(ds, index, class_names, split_dir, n_per_class, image_col, rng):
    split_dir.mkdir(parents=True, exist_ok=True)
    total_saved = 0
    skipped = 0
    counts = {}

    for cls_name, indices in sorted(index.items()):
        chosen = rng.sample(indices, min(n_per_class, len(indices)))
        cls_dir = split_dir / cls_name
        cls_dir.mkdir(parents=True, exist_ok=True)
        saved = 0
        for idx in chosen:
            try:
                img = ds[idx][image_col]
                if not isinstance(img, Image.Image):
                    img = Image.fromarray(img)
                img = img.convert("RGB")
                out_path = cls_dir / f"{idx}.jpg"
                img.save(out_path, "JPEG", quality=90)
                saved += 1
                total_saved += 1
                if total_saved % 500 == 0:
                    print(f"  Saved {total_saved} images so far...")
            except Exception as e:
                skipped += 1
                if skipped <= 10:
                    print(f"  [WARN] Skipped index {idx} ({cls_name}): {e}")
        counts[cls_name] = saved

    print(f"  Done: {total_saved} images saved, {skipped} skipped.\n")
    return counts


def main():
    random.seed(SEED)
    rng = random.Random(SEED)

    print(f"Loading dataset: {DATASET_NAME}")
    ds = load_dataset(DATASET_NAME, split="train")

    inspect_dataset(ds)

    image_col, label_col = detect_columns(ds)
    class_names = resolve_class_names(ds, label_col)
    print(f"Found {len(class_names)} classes:")
    for i, name in enumerate(class_names):
        print(f"  [{i:02d}] {name}")
    print()

    index = build_index(ds, label_col, class_names)

    print(f"Saving training split (~{TRAIN_PER_CLASS} per class) to {TRAIN_DIR}")
    train_counts = save_split(ds, index, class_names, TRAIN_DIR, TRAIN_PER_CLASS, image_col, rng)

    print(f"Saving validation split (~{VAL_PER_CLASS} per class) to {VAL_DIR}")
    val_counts = save_split(ds, index, class_names, VAL_DIR, VAL_PER_CLASS, image_col, rng)

    # Build and save class_labels.json
    label_map = {
        str(i): {
            "raw": name,
            "display": format_class_name(name),
            "train_count": train_counts.get(name, 0),
            "val_count": val_counts.get(name, 0),
        }
        for i, name in enumerate(class_names)
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CLASS_LABELS_PATH, "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"Class labels saved to {CLASS_LABELS_PATH}")

    # Summary
    total_train = sum(train_counts.values())
    total_val = sum(val_counts.values())
    print("\n=== Summary ===")
    print(f"Classes : {len(class_names)}")
    print(f"Train   : {total_train} images")
    print(f"Val     : {total_val} images")
    print(f"Total   : {total_train + total_val} images")
    print("\nPer-class breakdown (train | val):")
    for name in sorted(class_names):
        tc = train_counts.get(name, 0)
        vc = val_counts.get(name, 0)
        print(f"  {name:<45} {tc:>4} | {vc:>3}")
    print("===============\n")


if __name__ == "__main__":
    main()
