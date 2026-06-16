import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Load .env from the backend directory
load_dotenv(Path(__file__).parent / ".env")

# Make model/ importable when running from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))
from model import inference  # noqa: E402

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="AgroDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Safety net: convert any unhandled exception to a JSONResponse so it travels
# through CORSMiddleware's send-wrapper and always gets CORS headers.
@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {exc}"})

FEATHERLESS_URL   = "https://api.featherless.ai/v1/chat/completions"
FEATHERLESS_MODEL = "Qwen/Qwen2.5-7B-Instruct"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def _api_key() -> str:
    key = os.getenv("FEATHERLESS_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="FEATHERLESS_API_KEY is not set")
    return key


def featherless_chat(messages: list, max_tokens: int = 1024, temperature: float = 0.3) -> str:
    try:
        resp = requests.post(
            FEATHERLESS_URL,
            headers={
                "Authorization": f"Bearer {_api_key()}",
                "Content-Type": "application/json",
            },
            json={
                "model": FEATHERLESS_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        resp.raise_for_status()
    except requests.Timeout:
        raise HTTPException(status_code=504, detail="Featherless API timed out")
    except requests.HTTPError as e:
        body = ""
        try:
            body = e.response.text[:300]
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Featherless API error {e.response.status_code}: {body}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Featherless connection error: {e}")

    try:
        return resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"Unexpected Featherless response: {resp.text[:300]}")


def strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    image_bytes = await file.read()
    try:
        result = inference.predict_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")

    return result


class AdviceRequest(BaseModel):
    disease_name: str
    crop_name: str


@app.post("/advice")
def advice(req: AdviceRequest):
    system = (
        "You are an agricultural extension advisor helping smallholder farmers. "
        "Use simple, direct language. Avoid jargon. "
        "Always respond with valid JSON only — no markdown, no extra text."
    )
    user = (
        f"A farmer's {req.crop_name} plant has been diagnosed with: {req.disease_name}.\n\n"
        "Return a JSON object with exactly these fields:\n"
        '  "problem_summary": string  (1-2 plain-language sentences describing the problem)\n'
        '  "cause": string            (brief explanation of what causes this disease)\n'
        '  "treatment_steps": array   (3-5 action steps the farmer should take NOW)\n'
        '  "organic_options": array   (2-3 natural or organic treatment alternatives)\n'
        '  "prevention_tips": array   (2-3 tips to prevent recurrence next season)\n'
        '  "urgency_level": string    (exactly one of: "low", "medium", "high")\n\n'
        "Output valid JSON only."
    )

    raw = featherless_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=1024,
    )

    try:
        data = json.loads(strip_json_fences(raw))
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned invalid JSON: {raw[:300]}",
        )

    return data


class TranslateRequest(BaseModel):
    target_language: str
    # Batch mode: translate the full treatment-plan structure in one round-trip.
    # Keys: problem_summary (str), cause (str), treatment_steps ([str]),
    #        organic_options ([str]), prevention_tips ([str])
    fields: dict


@app.post("/translate")
def translate(req: TranslateRequest) -> dict:
    system = (
        "You are a professional translator. "
        "You receive a JSON object and must translate every string value to the target language. "
        "Rules: keep all JSON keys unchanged; translate each string element inside arrays; "
        "return ONLY valid JSON — no markdown, no explanation, no extra text."
    )
    user = (
        f"Translate every text value in the JSON below to {req.target_language}. "
        "Return only valid JSON with the same structure.\n\n"
        + json.dumps(req.fields, ensure_ascii=False)
    )

    raw = featherless_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=1200,
        temperature=0.2,
    )

    try:
        return json.loads(strip_json_fences(raw))
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned invalid JSON for translation: {raw[:300]}",
        )


class ChatRequest(BaseModel):
    disease_context: str
    question: str


@app.post("/chat")
def chat(req: ChatRequest):
    system = (
        "You are a helpful agricultural advisor speaking directly to a farmer. "
        "Use simple, clear, practical language. Keep answers concise. "
        f"Current context: {req.disease_context}"
    )

    answer = featherless_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": req.question}],
        max_tokens=512,
        temperature=0.4,
    )

    return {"answer": answer.strip()}


# ---------------------------------------------------------------------------
# Model stats endpoints
# ---------------------------------------------------------------------------
_SAVED_DIR    = Path(__file__).parent.parent / "model" / "saved_model"
_METRICS_PATH = _SAVED_DIR / "metrics.json"

# Training history recorded from the actual training run (see model/eval.py)
_TRAINING_HISTORY = {
    "epochs":     [1, 2, 3],
    "train_loss": [0.2866, 0.2222, 0.1950],
    "train_acc":  [91.4,   93.2,   94.5],
    "val_loss":   [0.6075, 0.3002, 0.5855],
    "val_acc":    [83.6,   90.8,   82.8],
    "best_epoch": 2,
}


def _fmt_class(raw: str) -> str:
    """'Apple___Apple_scab' → 'Apple - Apple scab'"""
    parts = raw.split("___")
    if len(parts) == 2:
        crop    = parts[0].replace("_", " ")
        disease = parts[1].replace("_", " ")
        return f"{crop} - {disease}"
    return raw.replace("_", " ")


@app.get("/model-stats")
def model_stats():
    if not _METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="metrics.json not found — run model/eval.py first",
        )
    with open(_METRICS_PATH) as f:
        metrics = json.load(f)

    per_class_f1 = sorted(
        [
            {
                "class":     _fmt_class(cls),
                "f1":        round(d["f1"],        4),
                "precision": round(d["precision"], 4),
                "recall":    round(d["recall"],    4),
            }
            for cls, d in metrics["per_class"].items()
        ],
        key=lambda x: x["f1"],
        reverse=True,
    )

    return {
        "summary": {
            "val_accuracy":    round(metrics["final_val_accuracy"], 2),
            "macro_f1":        round(metrics["macro_f1"],           4),
            "macro_precision": round(metrics["macro_precision"],    4),
            "macro_recall":    round(metrics["macro_recall"],       4),
            "num_classes":  38,
            "num_crops":    14,
            "train_images": 6650,
            "val_images":   1140,
        },
        "training_history": _TRAINING_HISTORY,
        "per_class_f1": per_class_f1,
    }


@app.get("/model-stats/confusion-matrix")
def confusion_matrix_img():
    p = _SAVED_DIR / "confusion_matrix.png"
    if not p.exists():
        raise HTTPException(status_code=404, detail="confusion_matrix.png not found")
    return FileResponse(str(p), media_type="image/png")
