import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    text: str
    target_language: str


@app.post("/translate")
def translate(req: TranslateRequest):
    system = (
        "You are a professional translator. "
        "Translate exactly as given, preserving meaning and tone. "
        "Output only the translated text — nothing else."
    )
    user = f"Translate the following text to {req.target_language}:\n\n{req.text}"

    translated = featherless_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=2048,
        temperature=0.1,
    )

    return {"translated_text": translated.strip()}


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
