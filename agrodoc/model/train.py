import json
import sys
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoModelForImageClassification,
    MobileNetV2ImageProcessor,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
TRAIN_DIR  = DATA_DIR / "train"
VAL_DIR    = DATA_DIR / "val"
SAVE_DIR   = BASE_DIR / "saved_model"
LABELS_PATH = DATA_DIR / "class_labels.json"

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

# ---------------------------------------------------------------------------
# Hyperparameters
# ---------------------------------------------------------------------------
EPOCHS     = 3
LR         = 2e-5
NUM_WORKERS = 0   # keep 0 for Windows compatibility

# ---------------------------------------------------------------------------
# Device detection & batch-size warning
# ---------------------------------------------------------------------------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if DEVICE.type == "cpu":
    BATCH_SIZE = 16
    # Rough estimate: MobileNetV2 on CPU @ batch=16
    # ~0.5–1 s/batch * ~412 batches/epoch * 3 epochs ≈ 20–40 min
    print("\n[INFO] No GPU detected — running on CPU.")
    print(f"[INFO] Batch size set to {BATCH_SIZE}.")
    print("[INFO] Estimated runtime: 20–45 min on a modern CPU (MobileNetV2 is lightweight).")
    print("[INFO] This is well under 90 min — proceeding automatically.")
    print("[INFO] To go faster, reduce EPOCHS to 2 or set TRAIN_PER_CLASS=100 in data_prep.py.\n")
else:
    BATCH_SIZE = 32
    print(f"\n[INFO] GPU detected: {torch.cuda.get_device_name(0)}. Using batch size {BATCH_SIZE}.\n")


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
class PlantDiseaseDataset(Dataset):
    def __init__(self, root_dir: Path, processor, class_to_idx: dict):
        self.processor = processor
        self.class_to_idx = class_to_idx
        self.samples = []
        for cls_dir in sorted(root_dir.iterdir()):
            if not cls_dir.is_dir():
                continue
            label = class_to_idx.get(cls_dir.name)
            if label is None:
                print(f"  [WARN] Unknown class directory: {cls_dir.name} — skipped")
                continue
            for img_path in cls_dir.glob("*.jpg"):
                self.samples.append((img_path, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        encoding = self.processor(images=img, return_tensors="pt")
        pixel_values = encoding["pixel_values"].squeeze(0)
        return pixel_values, label


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_class_info():
    with open(LABELS_PATH) as f:
        label_map = json.load(f)
    # label_map keys are str indices; values have "raw" (folder name) and "display"
    idx_to_raw     = {int(k): v["raw"]     for k, v in label_map.items()}
    idx_to_display = {int(k): v["display"] for k, v in label_map.items()}
    raw_to_idx     = {v: k for k, v in idx_to_raw.items()}
    return idx_to_raw, idx_to_display, raw_to_idx


def run_epoch(model, loader, criterion, optimizer, device, train=True):
    model.train() if train else model.eval()
    total_loss, correct, total = 0.0, 0, 0
    mode = "Train" if train else "Val"

    ctx = torch.enable_grad() if train else torch.no_grad()
    with ctx:
        for batch_idx, (pixels, labels) in enumerate(loader):
            pixels = pixels.to(device)
            labels = labels.to(device)

            outputs = model(pixel_values=pixels)
            loss = criterion(outputs.logits, labels)

            if train:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            batch_loss = loss.item()
            total_loss += batch_loss * len(labels)
            preds = outputs.logits.argmax(dim=-1)
            correct += (preds == labels).sum().item()
            total += len(labels)

            if (batch_idx + 1) % 10 == 0 or (batch_idx + 1) == len(loader):
                running_acc = correct / total * 100
                print(
                    f"  [{mode}] Batch {batch_idx+1:>4}/{len(loader)} | "
                    f"Loss: {batch_loss:.4f} | Running Acc: {running_acc:.1f}%"
                )

    return total_loss / total, correct / total * 100


def collect_predictions(model, loader, device):
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for pixels, labels in loader:
            pixels = pixels.to(device)
            outputs = model(pixel_values=pixels)
            preds = outputs.logits.argmax(dim=-1).cpu().tolist()
            all_preds.extend(preds)
            all_labels.extend(labels.tolist())
    return np.array(all_labels), np.array(all_preds)


def plot_curves(history, save_path):
    epochs = range(1, len(history["train_loss"]) + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

    ax1.plot(epochs, history["train_loss"], "b-o", label="Train")
    ax1.plot(epochs, history["val_loss"],   "r-o", label="Val")
    ax1.set_title("Loss per Epoch")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.legend()
    ax1.grid(True)

    ax2.plot(epochs, history["train_acc"], "b-o", label="Train")
    ax2.plot(epochs, history["val_acc"],   "r-o", label="Val")
    ax2.set_title("Accuracy per Epoch (%)")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy (%)")
    ax2.legend()
    ax2.grid(True)

    plt.tight_layout()
    plt.savefig(save_path, dpi=120)
    plt.close()
    print(f"Training curves saved -> {save_path}")


def plot_confusion_matrix(y_true, y_pred, class_names, save_path):
    cm = confusion_matrix(y_true, y_pred)
    n = len(class_names)
    fig, ax = plt.subplots(figsize=(18, 16))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax, fraction=0.03)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    short = [c.replace("___", "\n").replace("_", " ")[:22] for c in class_names]
    ax.set_xticklabels(short, rotation=90, fontsize=6)
    ax.set_yticklabels(short, fontsize=6)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("Confusion Matrix - Validation Set")
    plt.tight_layout()
    plt.savefig(save_path, dpi=120, bbox_inches="tight")
    plt.close()
    print(f"Confusion matrix saved -> {save_path}")


def save_metrics(y_true, y_pred, class_names, val_acc, save_dir):
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(len(class_names))), zero_division=0
    )
    per_class = {
        class_names[i]: {
            "precision": round(float(precision[i]), 4),
            "recall":    round(float(recall[i]),    4),
            "f1":        round(float(f1[i]),        4),
            "support":   int(support[i]),
        }
        for i in range(len(class_names))
    }
    metrics = {
        "final_val_accuracy": round(val_acc, 4),
        "macro_f1":  round(float(f1.mean()),        4),
        "macro_precision": round(float(precision.mean()), 4),
        "macro_recall":    round(float(recall.mean()),    4),
        "per_class": per_class,
    }
    with open(save_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved -> {save_dir / 'metrics.json'}")

    report = classification_report(
        y_true, y_pred,
        target_names=class_names,
        labels=list(range(len(class_names))),
        zero_division=0,
    )
    with open(save_dir / "classification_report.txt", "w") as f:
        f.write(report)
    print(f"Classification report saved -> {save_dir / 'classification_report.txt'}")
    return metrics


def run_sample_inference(model, processor, val_dir, idx_to_raw, idx_to_display, device, n=5):
    print(f"\n{'='*60}")
    print(f"Sample Inference on {n} Validation Images")
    print("="*60)

    all_imgs = list(val_dir.rglob("*.jpg"))
    if not all_imgs:
        print("[WARN] No validation images found for inference.")
        return

    import random
    random.seed(0)
    samples = random.sample(all_imgs, min(n, len(all_imgs)))

    # Build reverse map: folder name -> idx
    raw_to_idx = {v: k for k, v in idx_to_raw.items()}

    model.eval()
    with torch.no_grad():
        for img_path in samples:
            cls_folder = img_path.parent.name
            true_idx   = raw_to_idx.get(cls_folder, -1)
            true_label = idx_to_display.get(true_idx, cls_folder)

            img = Image.open(img_path).convert("RGB")
            enc = processor(images=img, return_tensors="pt")
            out = model(pixel_values=enc["pixel_values"].to(device))
            probs = torch.softmax(out.logits, dim=-1)[0]
            pred_idx  = probs.argmax().item()
            confidence = probs[pred_idx].item() * 100

            pred_label = idx_to_display.get(pred_idx, idx_to_raw.get(pred_idx, str(pred_idx)))
            match = "[OK]" if pred_idx == true_idx else "[XX]"
            print(
                f"  {match} True: {true_label:<40} "
                f"Pred: {pred_label:<40} "
                f"Conf: {confidence:.1f}%"
            )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)

    # --- Load class info ---
    idx_to_raw, idx_to_display, raw_to_idx = load_class_info()
    num_classes  = len(idx_to_raw)
    class_names  = [idx_to_raw[i] for i in range(num_classes)]
    print(f"Classes: {num_classes}")

    # --- Load processor & model ---
    print(f"\nLoading processor and model from: {MODEL_NAME}")
    # AutoImageProcessor fails on this repo (missing image_processor_type in config).
    # Fall back to MobileNetV2ImageProcessor with standard ImageNet preprocessing.
    try:
        processor = MobileNetV2ImageProcessor.from_pretrained(MODEL_NAME)
        print("[OK] Loaded processor from model repo.")
    except Exception:
        print("[WARN] Could not load processor from repo — using default MobileNetV2 settings.")
        processor = MobileNetV2ImageProcessor(
            size={"height": 224, "width": 224},
            image_mean=[0.485, 0.456, 0.406],
            image_std=[0.229, 0.224, 0.225],
        )
    model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
    model.to(DEVICE)

    # Verify class count matches
    model_classes = model.config.num_labels
    if model_classes != num_classes:
        print(
            f"[WARN] Model has {model_classes} output classes but dataset has {num_classes}. "
            "The head may not align — check id2label in model config."
        )
    else:
        print(f"[OK] Model output classes match dataset: {num_classes}")

    # --- Datasets & loaders ---
    print("\nBuilding datasets...")
    train_ds = PlantDiseaseDataset(TRAIN_DIR, processor, raw_to_idx)
    val_ds   = PlantDiseaseDataset(VAL_DIR,   processor, raw_to_idx)
    print(f"  Train: {len(train_ds)} images | Val: {len(val_ds)} images")

    train_loader = DataLoader(
        train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=NUM_WORKERS
    )
    val_loader = DataLoader(
        val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )

    # --- Optimizer & loss ---
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}
    best_val_acc  = -1.0
    best_epoch    = -1

    # --- Training loop ---
    print(f"\nFine-tuning for {EPOCHS} epoch(s) on {DEVICE} ...")
    total_start = time.time()

    for epoch in range(1, EPOCHS + 1):
        epoch_start = time.time()
        print(f"\n{'='*60}")
        print(f"Epoch {epoch}/{EPOCHS}")
        print("="*60)

        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, DEVICE, train=True)
        val_loss,   val_acc   = run_epoch(model, val_loader,   criterion, optimizer, DEVICE, train=False)

        elapsed = time.time() - epoch_start

        # Best-checkpoint saving
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch   = epoch
            model.save_pretrained(SAVE_DIR)
            processor.save_pretrained(SAVE_DIR)
            print(f"\n  [BEST] New best val acc {val_acc:.2f}% at epoch {epoch} — checkpoint saved.")
        else:
            print(
                f"\n  [----] Val acc {val_acc:.2f}% did not improve from best "
                f"{best_val_acc:.2f}% (epoch {best_epoch})."
            )

        print(
            f"  >> Epoch {epoch} done in {elapsed/60:.1f} min | "
            f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.1f}% | "
            f"Val Loss:   {val_loss:.4f}  Acc: {val_acc:.1f}%"
        )

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

    total_time = time.time() - total_start
    print(f"\nTotal training time: {total_time/60:.1f} min")
    print(f"Best checkpoint: epoch {best_epoch} with val acc {best_val_acc:.2f}%")
    print(f"Best model already saved -> {SAVE_DIR}")

    # Reload best checkpoint for evaluation
    print("\nReloading best checkpoint for final evaluation...")
    model = AutoModelForImageClassification.from_pretrained(SAVE_DIR)
    model.to(DEVICE)

    # --- Plots & metrics ---
    plot_curves(history, SAVE_DIR / "training_curves.png")

    print("\nCollecting validation predictions for confusion matrix & metrics...")
    y_true, y_pred = collect_predictions(model, val_loader, DEVICE)

    plot_confusion_matrix(y_true, y_pred, class_names, SAVE_DIR / "confusion_matrix.png")
    metrics = save_metrics(y_true, y_pred, class_names, best_val_acc, SAVE_DIR)

    print(f"\n{'='*60}")
    print(f"Final Results (best checkpoint: epoch {best_epoch})")
    print("="*60)
    print(f"  Val Accuracy : {metrics['final_val_accuracy']:.2f}%")
    print(f"  Macro F1     : {metrics['macro_f1']:.4f}")
    print(f"  Macro Prec   : {metrics['macro_precision']:.4f}")
    print(f"  Macro Recall : {metrics['macro_recall']:.4f}")

    # --- Sample inference ---
    run_sample_inference(model, processor, VAL_DIR, idx_to_raw, idx_to_display, DEVICE)

    print(f"\nAll outputs saved to: {SAVE_DIR.resolve()}")


if __name__ == "__main__":
    main()
