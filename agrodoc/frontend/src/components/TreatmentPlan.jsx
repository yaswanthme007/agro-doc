import { motion, AnimatePresence } from 'framer-motion'
import { Sprout, FlaskConical, ShieldCheck, Globe, Loader2, AlertTriangle } from 'lucide-react'

const URGENCY = {
  low:    { label: 'Low Urgency',    bg: 'var(--color-forest-pale)',   text: 'var(--color-forest)',    pulse: false },
  medium: { label: 'Medium Urgency', bg: '#fef3c7',                   text: 'var(--color-warning)',   pulse: false },
  high:   { label: 'High Urgency',   bg: '#fee2e2',                   text: 'var(--color-danger)',    pulse: true  },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
}
const item = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color }} />
        <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

export default function TreatmentPlan({ advice, languages, language, onLanguageChange, isTranslating }) {
  if (!advice) return null
  const urgencyKey = advice.urgency_level?.toLowerCase() ?? 'medium'
  const urgency = URGENCY[urgencyKey] ?? URGENCY.medium

  return (
    <section
      className="rounded-3xl overflow-hidden shadow-sm"
      style={{ border: '1px solid var(--color-cream-border)' }}
    >
      {/* Header */}
      <div className="px-5 md:px-6 pt-5 pb-4 flex items-start justify-between gap-3"
           style={{ background: 'var(--color-cream-dark)', borderBottom: '1px solid var(--color-cream-border)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
             style={{ color: 'var(--color-brown-light)' }}>
            Step 3 — Treatment Plan
          </p>
          <p className="text-sm" style={{ color: 'var(--color-brown-mid)' }}>
            {advice.problem_summary}
          </p>
        </div>
        {/* Urgency badge */}
        <motion.span
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${urgency.pulse ? 'animate-pulse-badge' : ''}`}
          style={{ background: urgency.bg, color: urgency.text }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {urgency.label}
        </motion.span>
      </div>

      {/* Language selector */}
      <div className="px-5 md:px-6 py-3 flex items-center gap-2"
           style={{ background: 'rgba(30,77,43,0.03)', borderBottom: '1px solid var(--color-cream-border)' }}>
        <Globe size={14} style={{ color: 'var(--color-brown-light)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>Language:</span>
        <select
          value={language.code}
          onChange={e => {
            const lang = languages.find(l => l.code === e.target.value)
            if (lang) onLanguageChange(lang)
          }}
          className="text-sm font-medium rounded-lg px-2 py-1 flex-1 max-w-48 transition-colors"
          style={{
            background: 'white',
            border: '1px solid var(--color-cream-border)',
            color: 'var(--color-brown)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {languages.map(l => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
        {isTranslating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-forest-mid)' }} />
          </motion.div>
        )}
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={language.code}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-5 md:px-6 py-5 space-y-6"
          style={{ background: 'white' }}
        >
          {/* Cause */}
          <Section icon={AlertTriangle} title="Cause" color="var(--color-terracotta)">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-mid)' }}>
              {advice.cause}
            </p>
          </Section>

          {/* Treatment steps */}
          <Section icon={Sprout} title="Treatment Steps" color="var(--color-forest)">
            <motion.ol variants={stagger} initial="initial" animate="animate" className="space-y-2">
              {advice.treatment_steps?.map((step, i) => (
                <motion.li key={i} variants={item}
                  className="flex gap-3 text-sm leading-relaxed"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--color-forest-pale)', color: 'var(--color-forest)' }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: 'var(--color-brown)' }}>{step}</span>
                </motion.li>
              ))}
            </motion.ol>
          </Section>

          {/* Organic options */}
          <Section icon={FlaskConical} title="Organic Options" color="var(--color-forest-mid)">
            <motion.div
              variants={stagger} initial="initial" animate="animate"
              className="rounded-2xl p-4 space-y-2"
              style={{ background: 'var(--color-forest-pale)' }}
            >
              {advice.organic_options?.map((opt, i) => (
                <motion.div key={i} variants={item}
                  className="flex gap-2 text-sm"
                >
                  <span style={{ color: 'var(--color-forest-light)' }}>✦</span>
                  <span style={{ color: 'var(--color-forest)' }}>{opt}</span>
                </motion.div>
              ))}
            </motion.div>
          </Section>

          {/* Prevention */}
          <Section icon={ShieldCheck} title="Prevention Tips" color="var(--color-gold)">
            <motion.ul variants={stagger} initial="initial" animate="animate" className="space-y-2">
              {advice.prevention_tips?.map((tip, i) => (
                <motion.li key={i} variants={item}
                  className="flex gap-2.5 text-sm leading-relaxed"
                >
                  <span className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full mt-2"
                        style={{ background: 'var(--color-gold)' }} />
                  <span style={{ color: 'var(--color-brown-mid)' }}>{tip}</span>
                </motion.li>
              ))}
            </motion.ul>
          </Section>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
