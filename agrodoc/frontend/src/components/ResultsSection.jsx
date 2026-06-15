import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Loader2, Leaf, Bug } from 'lucide-react'

function parseClass(raw) {
  const parts = raw.split(' - ')
  return { crop: parts[0] ?? raw, disease: parts.slice(1).join(' - ') || 'Healthy' }
}

function confidenceMeta(pct) {
  if (pct >= 80) return { label: 'High confidence',              color: 'var(--color-forest-mid)',    bg: 'var(--color-forest-pale)' }
  if (pct >= 50) return { label: 'Moderate — could be similar disease', color: 'var(--color-warning)',       bg: '#fef3c7' }
  return              { label: 'Low — try a clearer photo',      color: 'var(--color-danger)',         bg: '#fee2e2' }
}

function PredictionBar({ rank, label, confidence, delay }) {
  const [width, setWidth] = useState(0)
  const pct = Math.round(confidence * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120 + delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  const barColor = rank === 0 ? 'var(--color-forest-mid)'
                 : rank === 1 ? 'var(--color-gold)'
                 : 'var(--color-brown-light)'

  const { crop, disease } = parseClass(label)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
      className="space-y-1"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {rank === 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: 'var(--color-forest-pale)', color: 'var(--color-forest)' }}>
              TOP
            </span>
          )}
          <span className="text-xs font-semibold truncate" style={{ color: rank === 0 ? 'var(--color-brown)' : 'var(--color-brown-mid)' }}>
            {rank === 0 ? `${crop} · ${disease}` : label}
          </span>
        </div>
        <span className="text-xs font-bold flex-shrink-0 tabular-nums"
              style={{ color: barColor }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden"
           style={{ background: rank === 0 ? 'rgba(30,77,43,0.12)' : 'var(--color-cream-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: (120 + delay) / 1000 }}
        />
      </div>
    </motion.div>
  )
}

export default function ResultsSection({ prediction, preview, onGetAdvice, isAdvising, hasAdvice }) {
  const { predicted_class, confidence, top_3_predictions, is_healthy } = prediction
  const pct  = Math.round(confidence * 100)
  const meta = confidenceMeta(pct)
  const { crop, disease } = parseClass(predicted_class)

  return (
    <section className="rounded-3xl overflow-hidden shadow-sm"
             style={{ border: '1px solid var(--color-cream-border)' }}>

      {/* ── Top: image + headline ── */}
      <div className="p-5 md:p-6" style={{ background: 'var(--color-cream-dark)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
           style={{ color: 'var(--color-brown-light)' }}>
          Step 2 — Diagnosis Result
        </p>

        <div className="flex gap-4 items-start">
          <motion.img
            src={preview} alt="Uploaded crop"
            className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover flex-shrink-0"
            style={{ border: '2px solid var(--color-cream-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="flex-1 min-w-0">
            {is_healthy ? (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 mb-2">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--color-forest-light)' }} />
                </motion.div>
                <span className="font-bold text-sm" style={{ color: 'var(--color-forest-mid)' }}>
                  Your plant looks healthy!
                </span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} style={{ color: 'var(--color-terracotta)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: 'var(--color-terracotta)' }}>Disease Detected</span>
              </div>
            )}

            <motion.h2
              className="font-bold text-xl md:text-2xl leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brown)' }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {predicted_class}
            </motion.h2>

            {/* Crop / Disease tags */}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(30,77,43,0.08)', color: 'var(--color-forest-mid)' }}>
                <Leaf size={10} /> {crop}
              </span>
              {!is_healthy && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--color-terracotta)' }}>
                  <Bug size={10} /> {disease}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Model Insights panel ── */}
      <div className="px-5 md:px-6 py-5 space-y-4"
           style={{ background: 'white', borderTop: '1px solid var(--color-cream-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-brown-light)' }}>Model Insights</h3>
          {/* Confidence pill */}
          <motion.span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: meta.bg, color: meta.color }}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, delay: 0.2 }}
          >
            {meta.label}
          </motion.span>
        </div>

        {/* Top-3 bars — always visible */}
        <div className="space-y-3">
          {top_3_predictions.map((p, i) => (
            <PredictionBar
              key={i}
              rank={i}
              label={p.class}
              confidence={p.confidence}
              delay={i * 80}
            />
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      {!is_healthy && (
        <div className="px-5 md:px-6 py-4"
             style={{ background: 'rgba(30,77,43,0.03)', borderTop: '1px solid var(--color-cream-border)' }}>
          <motion.button
            onClick={onGetAdvice}
            disabled={isAdvising || hasAdvice}
            whileHover={!isAdvising && !hasAdvice ? { scale: 1.015 } : {}}
            whileTap={!isAdvising && !hasAdvice ? { scale: 0.985 } : {}}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            style={{
              background: hasAdvice
                ? 'var(--color-cream-border)'
                : 'linear-gradient(135deg, var(--color-terracotta) 0%, var(--color-terracotta-lt) 100%)',
              color: hasAdvice ? 'var(--color-brown-light)' : 'white',
              boxShadow: hasAdvice ? 'none' : '0 4px 14px rgba(196,98,45,0.22)',
            }}
          >
            {isAdvising ? (
              <><Loader2 size={16} className="animate-spin" /> Getting treatment plan…</>
            ) : hasAdvice ? (
              '✓ Treatment plan loaded below'
            ) : (
              'Get Treatment Plan →'
            )}
          </motion.button>
        </div>
      )}
    </section>
  )
}
