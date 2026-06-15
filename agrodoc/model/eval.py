"""
Post-training evaluation: loads the saved model and generates
training_curves.png, confusion_matrix.png, metrics.json,
classification_report.txt, and sample inference results.

Run this instead of re-training when model/saved_model/ already exists.
"""

import json
import random
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from PIL import Image
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForImageClassification, MobileNetV2ImageProcessor

BASE_DIR    = Path(__file__).parent
DATA_DIR    = BASE_DIR / "data"
VAL_DIR     = DATA_DIR / "val"
SAVE_DIR    = BASE_DIR / "saved_model"
LABELS_PATH = DATA_DIR / "class_labels.json"

BATCH_SIZE  = 16
NUM_WORKERS = 0
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Epoch metrics recorded from the completed training run
HISTORY = {
    "train_loss": [0.2866, 0.2222, 0.1950],
    "train_acc":  [91.4,   93.2,   94.5],
    "val_loss":   [0.6075, 0.3002, 0.5855],
    "val_acc":    [83.6,   90.8,   82.8],
}
BEST_EPOCH = 2  # epoch with highest val accuracy (90.8%)


class ValDataset(Dataset):
    def __init__(self, root_dir, processor, raw_to_idx):
        self.processor  = processor
        self.samples    = []
        for cls_dir in sorted(root_dir.iterdir()):
            if not cls_dir.is_dir():
                continue
            label = raw_to_idx.get(cls_dir.name)
            if label is None:
                continue
            for img_path in cls_dir.glob("*.jpg"):
                self.samples.append((img_path, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        enc = self.processor(images=img, return_tensors="pt")
        return enc["pixel_values"].squeeze(0), label


def plot_curves(history, save_path, best_epoch=None):
    epochs = range(1, len(history["train_loss"]) + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(epochs, history["train_loss"], "b-o", label="Train")
    ax1.plot(epochs, history["val_loss"],   "r-o", label="Val")
    ax1.set_title("Loss per Epoch"); ax1.set_xlabel("Epoch"); ax1.set_ylabel("Loss")
    ax1.legend(); ax1.grid(True)
    ax2.plot(epochs, history["train_acc"], "b-o", label="Train")
    ax2.plot(epochs, history["val_acc"],   "r-o", label="Val")
    if best_epoch is not None:
        best_acc = history["val_acc"][best_epoch - 1]
        ax2.axvline(x=best_epoch, color="green", linestyle="--", alpha=0.7, label=f"Best (ep {best_epoch})")
        ax2.annotate(
            f"Best: {best_acc:.1f}%",
            xy=(best_epoch, best_acc),
            xytext=(best_epoch + 0.1, best_acc - 3),
            fontsize=8, color="green",
        )
    ax2.set_title("Accuracy per Epoch (%)"); ax2.set_xlabel("Epoch"); ax2.set_ylabel("Accuracy (%)")
    ax2.legend(); ax2.grid(True)
    plt.tight_layout()
    plt.savefig(save_path, dpi=120)
    plt.close()
    print(f"Training curves saved -> {save_path}")


def plot_confusion_matrix(y_true, y_pred, class_names, save_path):
    cm = confusion_matrix(y_true, y_pred)
    n  = len(class_names)
    fig, ax = plt.subplots(figsize=(18, 16))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax, fraction=0.03)
    ax.set_xticks(range(n)); ax.set_yticks(range(n))
    short = [c.replace("___", "\n").replace("_", " ")[:22] for c in class_names]
    ax.set_xticklabels(short, rotation=90, fontsize=6)
    ax.set_yticklabels(short, fontsize=6)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True")
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
        "final_val_accuracy":  round(val_acc, 4),
        "macro_f1":            round(float(f1.mean()),        4),
        "macro_precision":     round(float(precision.mean()), 4),
        "macro_recall":        round(float(recall.mean()),    4),
        "per_class":           per_class,
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
    all_imgs   = list(val_dir.rglob("*.jpg"))
    raw_to_idx = {v: k for k, v in idx_to_raw.items()}
    random.seed(0)
    samples = random.sample(all_imgs, min(n, len(all_imgs)))
    model.eval()
    with torch.no_grad():
        for img_path in samples:
            cls_folder = img_path.parent.name
            true_idx   = raw_to_idx.get(cls_folder, -1)
            true_label = idx_to_display.get(true_idx, cls_folder)
            img = Image.open(img_path).convert("RGB")
            enc = processor(images=img, return_tensors="pt")
            out = model(pixel_values=enc["pixel_values"].to(device))
            probs      = torch.softmax(out.logits, dim=-1)[0]
            pred_idx   = probs.argmax().item()
            confidence = probs[pred_idx].item() * 100
            pred_label = idx_to_display.get(pred_idx, idx_to_raw.get(pred_idx, str(pred_idx)))
            match = "OK" if pred_idx == true_idx else "XX"
            print(
                f"  [{match}] True: {true_label:<42} "
                f"Pred: {pred_label:<42} "
                f"Conf: {confidence:.1f}%"
            )


def main():
    if not SAVE_DIR.exists():
        print(f"[ERROR] Saved model not found at {SAVE_DIR}. Run train.py first.")
        sys.exit(1)

    with open(LABELS_PATH) as f:
        label_map = json.load(f)
    idx_to_raw     = {int(k): v["raw"]     for k, v in label_map.items()}
    idx_to_display = {int(k): v["display"] for k, v in label_map.items()}
    raw_to_idx     = {v: k for k, v in idx_to_raw.items()}
    class_names    = [idx_to_raw[i] for i in range(len(idx_to_raw))]

    print(f"Loading saved model from {SAVE_DIR} ...")
    processor = MobileNetV2ImageProcessor.from_pretrained(SAVE_DIR)
    model     = AutoModelForImageClassification.from_pretrained(SAVE_DIR)
    model.to(DEVICE)
    model.eval()
    print("Model loaded.")

    # Training curves (from recorded history)
    plot_curves(HISTORY, SAVE_DIR / "training_curves.png", best_epoch=BEST_EPOCH)

    # Val predictions
    print("\nBuilding validation dataset...")
    val_ds     = ValDataset(VAL_DIR, processor, raw_to_idx)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)
    print(f"  {len(val_ds)} validation images")

    print("Running inference on validation set...")
    all_preds, all_labels = [], []
    with torch.no_grad():
        for i, (pixels, labels) in enumerate(val_loader):
            out   = model(pixel_values=pixels.to(DEVICE))
            preds = out.logits.argmax(dim=-1).cpu().tolist()
            all_preds.extend(preds)
            all_labels.extend(labels.tolist())
            if (i + 1) % 20 == 0:
                print(f"  Batch {i+1}/{len(val_loader)}")

    y_true = np.array(all_labels)
    y_pred = np.array(all_preds)
    val_acc = (y_true == y_pred).mean() * 100
    print(f"\nValidation accuracy (recomputed): {val_acc:.2f}%")

    plot_confusion_matrix(y_true, y_pred, class_names, SAVE_DIR / "confusion_matrix.png")
    metrics = save_metrics(y_true, y_pred, class_names, val_acc, SAVE_DIR)

    print(f"\n{'='*60}")
    print("Final Results")
    print("="*60)
    print(f"  Val Accuracy : {metrics['final_val_accuracy']:.2f}%")
    print(f"  Macro F1     : {metrics['macro_f1']:.4f}")
    print(f"  Macro Prec   : {metrics['macro_precision']:.4f}")
    print(f"  Macro Recall : {metrics['macro_recall']:.4f}")

    run_sample_inference(model, processor, VAL_DIR, idx_to_raw, idx_to_display, DEVICE)
    print(f"\nAll outputs saved to: {SAVE_DIR.resolve()}")


if __name__ == "__main__":
    main()
