import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import Header from './components/Header'
import StepProgress from './components/StepProgress'
import HeroIntro from './components/HeroIntro'
import UploadSection from './components/UploadSection'
import ResultsSection from './components/ResultsSection'
import TreatmentPlan from './components/TreatmentPlan'
import ChatBox from './components/ChatBox'
import AboutModel from './components/AboutModel'
import ModelPerformance from './components/ModelPerformance'
import Footer from './components/Footer'

export const API_BASE_URL = 'http://localhost:8000'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'sw', name: 'Kiswahili (Swahili)' },
  { code: 'fr', name: 'Français (French)' },
]

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

const friendlyMessage = (e, context) => {
  if (e.name === 'TypeError' || e.message === 'Failed to fetch') {
    return "Couldn't reach the server — please make sure the backend is running and try again."
  }
  return e.message || `${context} failed, please try again.`
}

export default function App() {
  const [file, setFile]                   = useState(null)
  const [preview, setPreview]             = useState(null)
  const [prediction, setPrediction]       = useState(null)
  const [advice, setAdvice]               = useState(null)
  const [translatedAdvice, setTranslated] = useState(null)
  const [translationCache, setTranslationCache] = useState({})
  const [language, setLanguage]           = useState(LANGUAGES[0])
  const [chatHistory, setChatHistory]     = useState([])
  const [isPredicting, setIsPredicting]   = useState(false)
  const [isAdvising, setIsAdvising]       = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isChatting, setIsChatting]       = useState(false)
  const [error, setError]                 = useState(null)

  // 5 = "past step 4" so step 4 renders as done (green checkmark).
  const currentStep = chatHistory.length > 0 ? 5
                    : advice                  ? 3
                    : prediction              ? 2
                    : 1

  const STEP_SECTION_IDS = {
    1: 'section-upload',
    2: 'section-diagnosis',
    3: 'section-treatment',
    4: 'section-chat',
  }

  const handleStepClick = useCallback((stepN) => {
    const el = document.getElementById(STEP_SECTION_IDS[stepN])
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleReset = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setFile(null)
    setPreview(null)
    setPrediction(null)
    setAdvice(null)
    setTranslated(null)
    setTranslationCache({})
    setChatHistory([])
    setError(null)
    setLanguage(LANGUAGES[0])
  }, [])

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
    setPrediction(null)
    setAdvice(null)
    setTranslated(null)
    setTranslationCache({})
    setChatHistory([])
    setError(null)
    setLanguage(LANGUAGES[0])
  }, [])

  const handlePredict = useCallback(async () => {
    if (!file) return
    setIsPredicting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE_URL}/predict`, { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error (${res.status})`)
      }
      setPrediction(await res.json())
    } catch (e) {
      setError(friendlyMessage(e, 'Diagnosis'))
    } finally {
      setIsPredicting(false)
    }
  }, [file])

  const handleAdvice = useCallback(async () => {
    if (!prediction) return
    setIsAdvising(true)
    setError(null)
    try {
      const raw     = prediction.predicted_class
      const parts   = raw.split(' - ')
      const crop    = parts[0] ?? raw
      const disease = parts.slice(1).join(' - ') || raw
      const res = await fetch(`${API_BASE_URL}/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease_name: disease, crop_name: crop }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error (${res.status})`)
      }
      setAdvice(await res.json())
      setTranslated(null)
      setTranslationCache({})
    } catch (e) {
      setError(friendlyMessage(e, 'Treatment plan'))
    } finally {
      setIsAdvising(false)
    }
  }, [prediction])

  const handleLanguageChange = useCallback(async (lang) => {
    setLanguage(lang)
    setError(null)

    if (lang.code === 'en' || !advice) {
      setTranslated(null)
      return
    }

    if (translationCache[lang.code]) {
      setTranslated(translationCache[lang.code])
      return
    }

    setIsTranslating(true)
    try {
      const res = await fetch(`${API_BASE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_language: lang.name.split('(')[0].trim(),
          fields: {
            problem_summary: advice.problem_summary,
            cause:           advice.cause,
            treatment_steps: advice.treatment_steps,
            organic_options: advice.organic_options,
            prevention_tips: advice.prevention_tips,
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error (${res.status})`)
      }
      const translated = await res.json()
      const full = { ...translated, urgency_level: advice.urgency_level }
      setTranslationCache(c => ({ ...c, [lang.code]: full }))
      setTranslated(full)
    } catch (e) {
      setError(friendlyMessage(e, 'Translation'))
      setLanguage(LANGUAGES[0])
      setTranslated(null)
    } finally {
      setIsTranslating(false)
    }
  }, [advice, translationCache])

  const handleChat = useCallback(async (question) => {
    if (!question.trim()) return
    setChatHistory(h => [...h, { role: 'user', content: question }])
    setIsChatting(true)
    try {
      const context = prediction
        ? `Disease: ${prediction.predicted_class}. Confidence: ${(prediction.confidence * 100).toFixed(1)}%.`
        : 'General crop disease question.'
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease_context: context, question }),
      })
      if (!res.ok) throw new Error('Server error')
      const { answer } = await res.json()
      setChatHistory(h => [...h, { role: 'assistant', content: answer }])
    } catch (e) {
      const msg = e.name === 'TypeError'
        ? "Couldn't reach the server — please try again."
        : 'Sorry, I could not get a response right now. Please try again.'
      setChatHistory(h => [...h, { role: 'assistant', content: msg }])
    } finally {
      setIsChatting(false)
    }
  }, [prediction])

  const displayAdvice = translatedAdvice ?? advice

  return (
    <div className="w-full min-h-dvh flex flex-col">
      <Header />

      {/* Step progress — full width, centered within max-w-6xl */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <StepProgress currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* Two-column layout on lg+; single column on mobile */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">

          {/* ── LEFT: main flow ──────────────────────────────────────────── */}
          <main className="min-w-0 space-y-5 pb-6 lg:pb-10">

            <AnimatePresence>
              {!preview && (
                <motion.div key="hero" {...fadeUp}>
                  <HeroIntro />
                </motion.div>
              )}
            </AnimatePresence>

            <div id="section-upload" style={{ scrollMarginTop: '1rem' }}>
              <UploadSection
                preview={preview}
                onFileSelect={handleFileSelect}
                onDiagnose={handlePredict}
                isPredicting={isPredicting}
                hasPrediction={!!prediction}
              />
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div key="err" {...fadeUp}
                  className="rounded-2xl border px-4 py-3.5 flex items-start gap-3"
                  style={{ background: '#fef2f2', borderColor: '#fecaca' }}
                >
                  <AlertCircle size={17} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-sm font-medium flex-1 leading-snug" style={{ color: '#b91c1c' }}>
                    {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    className="flex-shrink-0 p-0.5 rounded-lg transition-colors"
                    style={{ color: '#b91c1c' }}
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {prediction && (
                <motion.div key="results" id="section-diagnosis" style={{ scrollMarginTop: '1rem' }} {...fadeUp}>
                  <ResultsSection
                    prediction={prediction}
                    preview={preview}
                    onGetAdvice={handleAdvice}
                    isAdvising={isAdvising}
                    hasAdvice={!!advice}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {advice && (
                <motion.div key="treatment" id="section-treatment" style={{ scrollMarginTop: '1rem' }} {...fadeUp}>
                  <TreatmentPlan
                    advice={displayAdvice}
                    languages={LANGUAGES}
                    language={language}
                    onLanguageChange={handleLanguageChange}
                    isTranslating={isTranslating}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {advice && (
                <motion.div key="chat" id="section-chat" style={{ scrollMarginTop: '1rem' }} {...fadeUp}>
                  <ChatBox
                    messages={chatHistory}
                    onSend={handleChat}
                    isChatting={isChatting}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AboutModel />

          </main>

          {/* ── RIGHT: Model Performance sidebar ────────────────────────── */}
          {/*
            On lg+: sticky, scrollable independently within the viewport.
            On mobile: stacks below the main flow, full-width.
          */}
          <aside
            className="mt-6 lg:mt-0 lg:self-start lg:sticky lg:top-4"
            style={{}}
          >
            {/* Scrollable container for very tall sidebar content */}
            <div
              className="lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto"
              style={{ paddingBottom: '1.5rem' }}
            >
              {/* Sidebar panel with card-like border */}
              <div
                className="rounded-3xl p-4"
                style={{
                  background: 'var(--color-cream)',
                  border: '1px solid var(--color-cream-border)',
                  boxShadow: '0 1px 8px rgba(44,26,14,0.05)',
                }}
              >
                <ModelPerformance />
              </div>
            </div>
          </aside>

        </div>
      </div>

      <Footer />
    </div>
  )
}
