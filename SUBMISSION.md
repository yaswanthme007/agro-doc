# AgroDoc — Devpost Submission

Copy-paste ready content for each Devpost form field.

---

## Project Title

**AgroDoc — AI Crop Doctor for Farmers**

---

## Tagline / Short Description

Snap a leaf. Get an instant disease diagnosis, a step-by-step treatment plan, and expert answers — translated into your language, right from your phone.

---

## Problem Statement

Smallholder farmers lose 20–40% of their annual crop yield to plant diseases and pests that go undiagnosed until it is too late. The root cause is access: certified agronomists are concentrated in cities, extension services are chronically under-resourced, and a single farm visit can cost more than a week's income for a small farmer. By the time an expert sees the plant, the infection has already spread to neighbouring crops.

This is not a niche problem. Over 500 million smallholder farming families worldwide face this gap. The farmers who can least afford crop loss are the ones with the least access to the knowledge that could prevent it. AgroDoc is built to close that gap.

---

## Solution Overview

AgroDoc is a full-stack AI application that puts an expert crop doctor in every farmer's pocket. The experience is four steps:

1. **Upload** — The farmer photographs a diseased leaf or selects an image from their gallery. No account or registration required.

2. **Diagnose** — A fine-tuned MobileNetV2 vision model identifies the disease from 38 disease and healthy states across 14 major crops, returning the top prediction with a confidence score and the top-3 candidates with animated probability bars. The model achieves 87.72% validation accuracy.

3. **Treat** — With one tap, an LLM (Qwen 2.5 7B via Featherless.ai) generates a structured, plain-language treatment plan: what the disease is, what causes it, what to do right now (3–5 steps), organic alternatives, and how to prevent recurrence. High-urgency cases are flagged visually.

4. **Ask** — A contextual chat interface lets the farmer ask any follow-up question grounded in their specific diagnosis ("Can I still sell the fruit?", "What if I can't find that chemical?").

Every response can be translated into Hindi, Spanish, Swahili, or French with a single dropdown selection. Translations are cached client-side so switching languages is instant after the first load.

---

## Key Features

- **AI Disease Diagnosis** — 38-class plant disease classifier (MobileNetV2, fine-tuned on PlantVillage) with 87.72% validation accuracy; top-3 animated confidence bars
- **Confidence Awareness** — High / Moderate / Low confidence pills; a photo-quality advisory appears automatically when the model is uncertain (< 50% confidence)
- **Structured Treatment Plans** — LLM-generated advice in JSON: root cause, treatment steps, organic options, prevention tips, urgency level
- **5-Language Support** — English, Hindi (हिंदी), Spanish (Español), Swahili (Kiswahili), French (Français); batch translation in a single API call; client-side cache for instant re-selection
- **Contextual Chat** — Follow-up Q&A grounded in the current diagnosis
- **Step Progress UI** — 4-step visual flow so the farmer always knows where they are
- **Mobile-first** — Responsive at 375 px; direct camera capture for in-field use
- **Friendly Error Handling** — Every API failure surfaces a human-readable inline message; no silent fails
- **Reset Flow** — "Try another photo" button on diagnosis and treatment screens for quick iteration
- **AI Disclaimer** — Inline footer clearly states AgroDoc is AI-assisted guidance, not a substitute for professional agricultural advice

---

## Technologies Used

**Machine Learning & Model**
- PyTorch — training loop, DataLoader, AdamW optimizer
- HuggingFace Transformers — MobileNetV2ImageProcessor, AutoModelForImageClassification
- Base model: `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
- Dataset: PlantVillage via HuggingFace `datasets` — 6,650 training images (175 per class), 1,140 validation images (30 per class) across 38 classes and 14 crops
- Best-checkpoint saving: model saved whenever validation accuracy improves; final eval uses the best epoch (epoch 2 of 3, 87.72% val accuracy)
- scikit-learn for classification report and confusion matrix; matplotlib for training curves

**Backend**
- FastAPI (Python) — REST API with automatic docs
- Featherless.ai — OpenAI-compatible API; `Qwen/Qwen2.5-7B-Instruct` for advice, batch translation, and chat
- python-dotenv for secrets management

**Frontend**
- React 19 + Vite 8
- Tailwind CSS v4 (custom design tokens via `@theme {}`)
- framer-motion v12 — animations, transitions, loading overlays
- lucide-react — icons
- Google Fonts: Playfair Display + DM Sans

---

## Target Users

**Primary** — Smallholder farmers in developing regions (Sub-Saharan Africa, South Asia, Latin America) with a smartphone and intermittent connectivity. AgroDoc requires no login and works from any browser.

**Secondary** — Agricultural extension workers and NGO field staff who support farmers and need a rapid second opinion or demonstration tool.

**Tertiary** — Students, agronomy educators, and researchers who want an accessible entry point to AI-assisted plant pathology.

---

## What We Learned

- Fine-tuning a pre-trained vision model on a domain-specific subset (PlantVillage) achieves strong results quickly — 87.72% accuracy in under 3 epochs, even on CPU.
- Best-checkpoint selection matters more than more epochs: epoch 3 regressed to 81.3%, but the saved epoch 2 checkpoint preserved the 87.7% peak.
- Unhandled Python exceptions in FastAPI propagate past CORSMiddleware's send-wrapper (which is inside ServerErrorMiddleware) and return a 500 response without CORS headers — the browser reports this as a CORS error. The fix is to ensure all exceptions become HTTPException before they reach the middleware boundary.
- Batch LLM translation (all fields in one structured JSON call) is 5× faster than 5 parallel single-field calls, and client-side caching makes language switching instant after the first fetch.
- Tailwind v4 CSS layer ordering: unlayered custom styles (e.g. `* { margin: 0 }`) beat `@layer utilities` in the cascade regardless of specificity, silently nullifying `mx-auto`. Moving custom resets into `@layer base` fixes this.

---

## Challenges

- **MobileNetV2 image processor detection** — `AutoImageProcessor.from_pretrained()` could not detect the processor type from the HuggingFace model's `preprocessor_config.json`. Required explicitly calling `MobileNetV2ImageProcessor.from_pretrained()` with a fallback constructor using ImageNet default settings.
- **Windows terminal encoding** — The training script crashed on print statements after successful training because Windows cp1252 cannot encode Unicode arrows (→), checkmarks (✓/✗), or em-dashes (—). Fixed by replacing all non-ASCII characters in print output.
- **Translation latency** — 5 parallel API calls for translation felt slow for a live demo. Solved with a batch translate endpoint (one round-trip, structured JSON output) + client-side translation cache keyed by language code.
- **CSS layer ordering in Tailwind v4** — Content was stuck to the left half of the screen because an unlayered `*` reset overrode `@layer utilities` (`mx-auto`). Required understanding the CSS cascade spec around `@layer` priority.

---

## Future Work

- Edge / offline deployment via TFLite or ONNX for zero-connectivity field use
- Expanded crop coverage: cassava, rice, sorghum, chickpea, and other staple crops critical to Sub-Saharan Africa and South Asia
- Pest identification (insects, mites) alongside disease
- Voice interface: speech-to-text input and text-to-speech output
- WhatsApp / SMS channel for farmers who do not use mobile browsers
- Geo-tagged outbreak map: aggregate anonymised diagnoses to surface regional disease patterns
- Integration with national plant health surveillance systems and extension worker dashboards
- Severity scoring: estimate early / mid / late stage from the image
