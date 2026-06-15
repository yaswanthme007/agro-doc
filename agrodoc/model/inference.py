import json
import io
from pathlib import Path

import torch
from PIL import Image
from transformers import AutoModelForImageClassification, MobileNetV2ImageProcessor

MODEL_DIR   = Path(__file__).parent / "saved_model"
LABELS_PATH = Path(__file__).parent / "data" / "class_labels.json"

_model      = None
_processor  = None
_idx_to_raw     = None
_idx_to_display = None


def _load():
    global _model, _processor, _idx_to_raw, _idx_to_display
    if _model is not None:
        return

    with open(LABELS_PATH) as f:
        label_map = json.load(f)
    _idx_to_raw     = {int(k): v["raw"]     for k, v in label_map.items()}
    _idx_to_display = {int(k): v["display"] for k, v in label_map.items()}

    _processor = MobileNetV2ImageProcessor.from_pretrained(MODEL_DIR)
    _model     = AutoModelForImageClassification.from_pretrained(MODEL_DIR)
    _model.eval()
    print(f"[inference] Model loaded from {MODEL_DIR}")


def predict(image: Image.Image) -> dict:
    _load()

    rgb = image.convert("RGB")
    enc = _processor(images=rgb, return_tensors="pt")

    with torch.no_grad():
        logits = _model(pixel_values=enc["pixel_values"]).logits

    probs = torch.softmax(logits, dim=-1)[0]
    top = probs.topk(3)

    top_indices = top.indices.tolist()
    top_probs   = top.values.tolist()

    pred_idx   = top_indices[0]
    pred_raw   = _idx_to_raw.get(pred_idx, str(pred_idx))
    pred_label = _idx_to_display.get(pred_idx, pred_raw)
    is_healthy = "healthy" in pred_raw.lower()

    return {
        "predicted_class": pred_label,
        "confidence": round(float(top_probs[0]), 4),
        "top_3_predictions": [
            {
                "class":      _idx_to_display.get(i, _idx_to_raw.get(i, str(i))),
                "confidence": round(float(p), 4),
            }
            for i, p in zip(top_indices, top_probs)
        ],
        "is_healthy": is_healthy,
    }


def predict_bytes(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes))
    return predict(image)
