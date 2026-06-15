import { motion } from 'framer-motion'

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Diagnosis' },
  { n: 3, label: 'Treatment' },
  { n: 4, label: 'Ask AgroDoc' },
]

// currentStep uses 1-4 for "active", and 5 to mean "all done" (step 4 complete).
// onStepClick(n) — called when the user clicks a reachable step circle.
export default function StepProgress({ currentStep, onStepClick }) {
  // Clamp progress fill to [0,1] — currentStep 5 fills the bar completely.
  const fillFraction = Math.min((currentStep - 1) / (STEPS.length - 1), 1)

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
          animate={{ scaleX: fillFraction }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((step) => {
          const done      = currentStep > step.n
          const active    = currentStep === step.n
          const reachable = done || active

          return (
            // Use a button so completed/active steps are keyboard-navigable.
            // disabled on future steps prevents click and removes focus ring.
            <button
              key={step.n}
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick?.(step.n)}
              aria-label={`Go to step ${step.n}: ${step.label}`}
              className="flex flex-col items-center gap-1.5 relative z-10 bg-transparent border-0 p-0
                         disabled:cursor-default disabled:pointer-events-none
                         focus-visible:outline-none"
              style={{ cursor: reachable ? 'pointer' : 'default' }}
            >
              <motion.div
                animate={{
                  background: done || active ? 'var(--color-forest)' : 'var(--color-cream-dark)',
                  borderColor: done || active ? 'var(--color-forest)' : 'var(--color-cream-border)',
                  scale: active ? 1.15 : 1,
                }}
                whileHover={reachable ? { scale: active ? 1.2 : 1.1 } : {}}
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
