import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'

function ConfidenceBar({ value }) {
  const [width, setWidth] = useState(0)
  const pct = Math.round(value * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  const color = pct >= 80 ? 'var(--color-forest-mid)'
              : pct >= 50 ? 'var(--color-gold)'
              : 'var(--color-terracotta)'

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-brown-light)' }}>Confidence</span>
        <motion.span
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {pct}%
        </motion.span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden"
           style={{ background: 'var(--color-cream-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>
    </div>
  )
}

function Top3({ predictions }) {
  const [open, setOpen] = useState(false)
  if (predictions.length <= 1) return null

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold mt-3 transition-colors"
        style={{ color: 'var(--color-brown-light)' }}
      >
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.span>
        {open ? 'Hide' : 'Show'} other possibilities
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-2 space-y-1.5"
          >
            {predictions.slice(1).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-brown-mid)' }}>{p.class}</span>
                <span className="font-semibold" style={{ color: 'var(--color-brown-light)' }}>
                  {Math.round(p.confidence * 100)}%
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ResultsSection({ prediction, preview, onGetAdvice, isAdvising, hasAdvice }) {
  const { predicted_class, confidence, top_3_predictions, is_healthy } = prediction

  return (
    <section
      className="rounded-3xl overflow-hidden shadow-sm"
      style={{ border: '1px solid var(--color-cream-border)' }}
    >
      <div className="p-5 md:p-6" style={{ background: 'var(--color-cream-dark)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
           style={{ color: 'var(--color-brown-light)' }}>
          Step 2 — Diagnosis Result
        </p>

        <div className="flex gap-4 items-start">
          {/* Thumbnail */}
          <motion.img
            src={preview}
            alt="Uploaded crop"
            className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover flex-shrink-0"
            style={{ border: '2px solid var(--color-cream-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            {is_healthy ? (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 mb-1"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  <CheckCircle2 size={22} style={{ color: 'var(--color-forest-light)' }} />
                </motion.div>
                <span className="font-bold text-sm" style={{ color: 'var(--color-forest-mid)' }}>
                  Your plant looks healthy!
                </span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={16} style={{ color: 'var(--color-terracotta)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--color-terracotta)' }}>Disease Detected</span>
              </div>
            )}

            <motion.h2
              className="font-bold text-xl md:text-2xl leading-tight mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brown)' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {predicted_class}
            </motion.h2>

            <ConfidenceBar value={confidence} />
            <Top3 predictions={top_3_predictions} />
          </div>
        </div>
      </div>

      {/* Get advice CTA */}
      {!is_healthy && (
        <div className="px-5 md:px-6 py-4"
             style={{ background: 'rgba(30,77,43,0.04)', borderTop: '1px solid var(--color-cream-border)' }}>
          <motion.button
            onClick={onGetAdvice}
            disabled={isAdvising || hasAdvice}
            whileHover={!isAdvising && !hasAdvice ? { scale: 1.015 } : {}}
            whileTap={!isAdvising && !hasAdvice ? { scale: 0.985 } : {}}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: hasAdvice
                ? 'var(--color-cream-border)'
                : 'linear-gradient(135deg, var(--color-terracotta) 0%, var(--color-terracotta-lt) 100%)',
              color: hasAdvice ? 'var(--color-brown-light)' : 'white',
              boxShadow: hasAdvice ? 'none' : '0 4px 14px rgba(196,98,45,0.25)',
            }}
          >
            {isAdvising ? (
              <><Loader2 size={16} className="animate-spin" /> Getting treatment plan…</>
            ) : hasAdvice ? (
              'Treatment plan loaded below'
            ) : (
              'Get Treatment Plan'
            )}
          </motion.button>
        </div>
      )}
    </section>
  )
}
