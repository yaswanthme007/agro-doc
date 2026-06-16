# AgroDoc — AI Crop Disease Detector

> Upload a photo of a sick plant leaf → get an instant diagnosis, treatment plan, and follow-up chat in multiple languages.

---

## Quick Start

**Prerequisites**

| Tool | Version | Why |
|------|---------|-----|
| Python | 3.10 or higher | Backend runtime |
| Node.js | 18 or higher | Frontend dev server |
| Featherless.ai API key | — | LLM for advice + chat ([get one free at featherless.ai](https://featherless.ai)) |

> **No model training needed.** The trained model weights are already included in `model/saved_model/` — the app works out of the box.

---

### Step 1 — Clone the repo

```bash
git clone <repo-url>
cd agro-doc/agrodoc
```

---

### Step 2 — Backend setup

```bash
# 1. Enter the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# 3. Install dependencies  (first run takes ~2 min — torch is large)
pip install -r requirements.txt

# 4. Create your .env file with your Featherless API key
#    Copy the example, then open it and replace "your_key_here"
cp .env.example .env
# Now edit .env: set FEATHERLESS_API_KEY=<your actual key>

# 5. Start the backend server
uvicorn main:app --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

---

### Step 3 — Frontend setup

Open a **new terminal** (keep the backend running), then:

```bash
# From the agrodoc/ directory
cd frontend

# Install dependencies (first run ~30 sec)
npm install

# Start the dev server
npm run dev
```

You should see: `Local: http://localhost:5173/`

---

### Step 4 — Open the app

Open **http://localhost:5173** in your browser. Upload a crop leaf image and try it out.

---

## Environment Variables

The only required environment variable is your Featherless API key.

`backend/.env.example`:
```
FEATHERLESS_API_KEY=your_key_here
```

Copy it to `backend/.env` and replace `your_key_here` with your actual key from [featherless.ai](https://featherless.ai).

---

## Demo

> **Video walkthrough:** *(YouTube link coming soon — available for judges who prefer to watch rather than run locally)*

---

## Problem Statement

Smallholder farmers in developing regions often lack access to agronomists. A diseased crop caught late can devastate a family's income. AgroDoc gives any farmer with a phone camera an instant, expert-level diagnosis and actionable treatment plan — no internet connectivity to a specialist required.

---

## Solution Overview

AgroDoc is a full-stack web application that:

1. **Diagnoses** crop disease from a leaf photo using a fine-tuned Vision Transformer (ViT-Base) trained on 38 disease classes across 14 crops
2. **Explains** the disease with an AI-generated treatment plan (organic + chemical options, prevention tips)
3. **Translates** the advice into Hindi, Spanish, Swahili, or French for non-English-speaking farmers
4. **Answers follow-up questions** via a context-aware chat interface powered by an LLM

---

## Key Features

- **Instant diagnosis** — ViT model runs locally, no external ML API needed
- **Treatment plan** — structured advice with urgency level, organic options, and prevention tips
- **Multilingual** — English, Hindi, Spanish, Swahili, French
- **Follow-up chat** — ask AgroDoc anything about the detected disease
- **Model transparency** — live performance metrics sidebar (accuracy, F1, training curves, confusion matrix)
- **38 disease classes** across Apple, Blueberry, Cherry, Corn, Grape, Orange, Peach, Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato

---

## Technologies Used

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Recharts |
| Backend | FastAPI, Uvicorn, Python 3.10+ |
| ML Model | Vision Transformer (ViT-Base-Patch16-224), PyTorch, HuggingFace Transformers |
| LLM | Featherless.ai API (meta-llama/Llama-3.3-70B-Instruct) |
| Training Data | PlantVillage dataset — 38 classes, 14 crops |

---

## Model Details

- **Architecture:** `google/vit-base-patch16-224` fine-tuned for image classification
- **Training:** 5 epochs, AdamW optimizer, cosine LR schedule with warmup
- **Test accuracy:** ~98% on held-out PlantVillage test split
- **Weights location:** `model/saved_model/` (included in repo — no retraining needed)

---

## Project Structure

```
agrodoc/
├── backend/
│   ├── main.py              # FastAPI app — predict, advice, translate, chat endpoints
│   ├── requirements.txt
│   ├── .env.example         # Copy to .env and add your Featherless key
│   └── .env                 # Your local secrets (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app state + layout
│   │   └── components/      # UploadSection, ResultsSection, TreatmentPlan, ChatBox, etc.
│   └── package.json
└── model/
    ├── saved_model/         # Trained weights (model.safetensors + config)
    ├── inference.py         # Prediction logic used by backend
    └── train.py             # Training script (not needed to run the app)
```

---

## Target Users

- **Smallholder farmers** in low-connectivity regions who need quick diagnosis without waiting for an agronomist
- **Extension workers** who can use AgroDoc to advise multiple farmers rapidly in the field
- **Agricultural students** learning to identify and treat crop diseases

---

## Troubleshooting

**"Couldn't reach the server"** — The backend isn't running. Run `uvicorn main:app --port 8000` in the `backend/` directory with the venv activated.

**"ModuleNotFoundError: torch"** — The venv isn't activated, or `pip install -r requirements.txt` didn't finish. Re-run with the venv active.

**Featherless API errors** — Check that `backend/.env` exists and contains a valid `FEATHERLESS_API_KEY`. Get a free key at featherless.ai.

**Port already in use** — Kill any process on port 8000 (`lsof -ti:8000 | xargs kill` on Mac/Linux; Task Manager on Windows) and retry.
