import { motion } from 'framer-motion'

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Diagnosis' },
  { n: 3, label: 'Treatment' },
  { n: 4, label: 'Ask AgroDoc' },
]

export default function StepProgress({ currentStep }) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px mx-6"
             style={{ background: 'var(--color-cream-border)', zIndex: 0 }} />

        {/* Filled progress line */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-px mx-6"
          style={{ background: 'var(--color-forest-light)', zIndex: 1, transformOrigin: 'left' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (currentStep - 1) / (STEPS.length - 1) }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((step) => {
          const done   = currentStep > step.n
          const active = currentStep === step.n
          return (
            <div key={step.n} className="flex flex-col items-center gap-1.5 relative z-10">
              <motion.div
                animate={{
                  background: done || active ? 'var(--color-forest)' : 'var(--color-cream-dark)',
                  borderColor: done || active ? 'var(--color-forest)' : 'var(--color-cream-border)',
                  scale: active ? 1.15 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
              >
                {done ? (
                  <motion.svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.path
                      d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.svg>
                ) : (
                  <span className="text-[10px] font-bold"
                        style={{ color: active ? 'white' : 'var(--color-brown-light)' }}>
                    {step.n}
                  </span>
                )}
              </motion.div>
              <motion.span
                className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:block"
                animate={{ color: active ? 'var(--color-forest)' : done ? 'var(--color-forest-mid)' : 'var(--color-brown-light)' }}
                transition={{ duration: 0.3 }}
              >
                {step.label}
              </motion.span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
