import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Cpu } from 'lucide-react'

const STATS = [
  { value: '38',     label: 'Disease Classes', sub: 'across 14 crops' },
  { value: '14',     label: 'Crop Types',       sub: 'from Apple to Tomato' },
  { value: '87.7%',  label: 'Val Accuracy',     sub: 'best-checkpoint epoch' },
  { value: '7,700+', label: 'Training Images',  sub: 'PlantVillage subset' },
]

const stagger = { animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
const card    = {
  initial: { opacity: 0, scale: 0.92, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export default function AboutModel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-colors group"
        style={{
          background: open ? 'var(--color-cream-dark)' : 'transparent',
          border: '1px solid var(--color-cream-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Cpu size={15} style={{ color: 'var(--color-forest-mid)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-brown)' }}>
            About the Model
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} style={{ color: 'var(--color-brown-light)' }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 px-1">
              <p className="text-sm leading-relaxed mb-4 px-1"
                 style={{ color: 'var(--color-brown-mid)' }}>
                Powered by a fine-tuned{' '}
                <span className="font-semibold" style={{ color: 'var(--color-brown)' }}>MobileNetV2</span>{' '}
                model trained on the PlantVillage dataset — 38 disease classes across 14 crops,
                achieving <span className="font-semibold" style={{ color: 'var(--color-forest-mid)' }}>87.7% validation accuracy</span> using
                best-checkpoint selection (epoch 2 of 3).
              </p>

              <motion.div
                variants={stagger} initial="initial" animate="animate"
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {STATS.map(({ value, label, sub }) => (
                  <motion.div
                    key={label} variants={card}
                    className="rounded-2xl p-4 text-center"
                    style={{ background: 'var(--color-cream-dark)', border: '1px solid var(--color-cream-border)' }}
                  >
                    <div
                      className="text-2xl font-bold mb-0.5"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}
                    >
                      {value}
                    </div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-brown)' }}>
                      {label}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-brown-light)' }}>
                      {sub}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <p className="text-[11px] text-center mt-4 pb-2" style={{ color: 'var(--color-brown-light)' }}>
                linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification · HuggingFace
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
