import { motion } from 'framer-motion'
import { ScanLine, FileText, Languages } from 'lucide-react'

const FEATURES = [
  { icon: ScanLine,   label: 'AI Diagnosis',     desc: 'Instant disease detection' },
  { icon: FileText,   label: 'Treatment Plans',   desc: 'Step-by-step guidance' },
  { icon: Languages,  label: '5 Languages',       desc: 'In your mother tongue' },
]

const stagger = { animate: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }
const item    = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function HeroIntro() {
  return (
    <motion.div
      variants={stagger} initial="initial" animate="animate"
      className="text-center py-4 pb-2"
    >
      <motion.p
        variants={item}
        className="text-base md:text-lg leading-snug font-medium mb-1"
        style={{ color: 'var(--color-brown-mid)' }}
      >
        Instant AI crop disease diagnosis —
      </motion.p>
      <motion.p
        variants={item}
        className="text-base md:text-lg leading-snug font-medium mb-8"
        style={{ color: 'var(--color-brown-mid)' }}
      >
        snap a leaf, get a treatment plan in your language.
      </motion.p>

      <motion.div variants={stagger} className="grid grid-cols-3 gap-3">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <motion.div
            key={label} variants={item}
            className="flex flex-col items-center gap-2 rounded-2xl p-3 md:p-4"
            style={{ background: 'var(--color-cream-dark)', border: '1px solid var(--color-cream-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(30,77,43,0.08)' }}>
              <Icon size={18} style={{ color: 'var(--color-forest-mid)' }} />
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--color-brown)' }}>{label}</span>
            <span className="text-[11px] leading-tight text-center hidden md:block"
                  style={{ color: 'var(--color-brown-light)' }}>{desc}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
