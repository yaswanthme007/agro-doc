import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import StepProgress from './components/StepProgress'
import HeroIntro from './components/HeroIntro'
import UploadSection from './components/UploadSection'
import ResultsSection from './components/ResultsSection'
import TreatmentPlan from './components/TreatmentPlan'
import ChatBox from './components/ChatBox'
import AboutModel from './components/AboutModel'

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

export default function App() {
  const [file, setFile]                   = useState(null)
  const [preview, setPreview]             = useState(null)
  const [prediction, setPrediction]       = useState(null)
  const [advice, setAdvice]               = useState(null)
  const [translatedAdvice, setTranslated] = useState(null)
  const [language, setLanguage]           = useState(LANGUAGES[0])
  const [chatHistory, setChatHistory]     = useState([])
  const [isPredicting, setIsPredicting]   = useState(false)
  const [isAdvising, setIsAdvising]       = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isChatting, setIsChatting]       = useState(false)
  const [error, setError]                 = useState(null)

  const currentStep = chatHistory.length > 0 ? 4
                    : advice                  ? 3
                    : prediction              ? 2
                    : 1

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
    setPrediction(null)
    setAdvice(null)
    setTranslated(null)
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
      if (!res.ok) throw new Error(`Prediction failed (${res.status})`)
      setPrediction(await res.json())
    } catch (e) {
      setError(e.message)
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
      if (!res.ok) throw new Error(`Advice failed (${res.status})`)
      setAdvice(await res.json())
      setTranslated(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setIsAdvising(false)
    }
  }, [prediction])

  const handleLanguageChange = useCallback(async (lang) => {
    setLanguage(lang)
    if (lang.code === 'en' || !advice) { setTranslated(null); return }
    setIsTranslating(true)
    setError(null)
    try {
      const translateField = async (text) => {
        const res = await fetch(`${API_BASE_URL}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, target_language: lang.name.split('(')[0].trim() }),
        })
        if (!res.ok) throw new Error('Translation failed')
        return (await res.json()).translated_text
      }
      const translateList = (arr) => Promise.all(arr.map(translateField))
      const [summary, cause, steps, organic, tips] = await Promise.all([
        translateField(advice.problem_summary),
        translateField(advice.cause),
        translateList(advice.treatment_steps),
        translateList(advice.organic_options),
        translateList(advice.prevention_tips),
      ])
      setTranslated({ problem_summary: summary, cause, treatment_steps: steps, organic_options: organic, prevention_tips: tips, urgency_level: advice.urgency_level })
    } catch (e) {
      setError(e.message)
    } finally {
      setIsTranslating(false)
    }
  }, [advice])

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
      if (!res.ok) throw new Error('Chat failed')
      const { answer } = await res.json()
      setChatHistory(h => [...h, { role: 'assistant', content: answer }])
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Sorry, could not get a response. Please try again.' }])
    } finally {
      setIsChatting(false)
    }
  }, [prediction])

  const displayAdvice = translatedAdvice ?? advice

  return (
    <div className="w-full min-h-dvh flex flex-col">
      <Header />

      <div className="w-full max-w-3xl mx-auto px-4">
        <StepProgress currentStep={currentStep} />
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-20 space-y-5">

        <AnimatePresence>
          {!preview && (
            <motion.div key="hero" {...fadeUp}>
              <HeroIntro />
            </motion.div>
          )}
        </AnimatePresence>

        <UploadSection
          preview={preview}
          onFileSelect={handleFileSelect}
          onDiagnose={handlePredict}
          isPredicting={isPredicting}
          hasPrediction={!!prediction}
        />

        <AnimatePresence>
          {error && (
            <motion.div key="err" {...fadeUp}
              className="rounded-2xl border px-5 py-4 text-sm font-medium"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {prediction && (
            <motion.div key="results" {...fadeUp}>
              <ResultsSection
                prediction={prediction}
                preview={preview}
                onGetAdvice={handleAdvice}
                isAdvising={isAdvising}
                hasAdvice={!!advice}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {advice && (
            <motion.div key="treatment" {...fadeUp}>
              <TreatmentPlan
                advice={displayAdvice}
                languages={LANGUAGES}
                language={language}
                onLanguageChange={handleLanguageChange}
                isTranslating={isTranslating}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {advice && (
            <motion.div key="chat" {...fadeUp}>
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
    </div>
  )
}
