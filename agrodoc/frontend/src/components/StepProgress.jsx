import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Diagnosis' },
  { n: 3, label: 'Treatment' },
  { n: 4, label: 'Ask AgroDoc' },
]

// Circle diameter in px — must match the w-7/h-7 class (28px).
// Lines use left/right = HALF_CIRCLE so they connect circle centers exactly.
const CIRCLE_PX = 28
const HALF = CIRCLE_PX / 2  // 14px

// currentStep: 1-4 = active step, 5 = all done (step 4 shows green checkmark).
// onStepClick(n) — called when user clicks a completed or active circle.
export default function StepProgress({ currentStep, onStepClick }) {
  const fillFraction = Math.min((currentStep - 1) / (STEPS.length - 1), 1)

  return (
    <div className="py-4 select-none">

      {/*
        ── Circle row ──────────────────────────────────────────────────────
        Height is EXACTLY CIRCLE_PX (h-7 = 28px).
        Because the row height == circle height, top-1/2 == 14px == circle
        center, so the track line bisects every circle perfectly.
        Labels live in a separate row below so they can't pull the container
        height and shift the center reference.
      */}
      <div
        className="relative flex items-center justify-between"
        style={{ height: CIRCLE_PX }}
      >
        {/* Gray base track — runs from center of first circle to last */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px"
          style={{
            left: HALF,
            right: HALF,
            background: 'var(--color-cream-border)',
            zIndex: 0,
          }}
        />

        {/* Colored fill — grows left-to-right as steps complete */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-px"
          style={{
            left: HALF,
            right: HALF,
            background: 'var(--color-forest-light)',
            zIndex: 1,
            transformOrigin: '0% 50%',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: fillFraction }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Step circles */}
        {STEPS.map((step) => {
          const done      = currentStep > step.n
          const active    = currentStep === step.n
          const reachable = done || active

          return (
            <button
              key={step.n}
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick?.(step.n)}
              aria-label={
                done   ? `Completed: step ${step.n} ${step.label}` :
                active ? `Current: step ${step.n} ${step.label}` :
                         `Upcoming: step ${step.n} ${step.label}`
              }
              className="relative z-10 bg-transparent border-0 p-0 focus-visible:outline-none"
              style={{ cursor: reachable ? 'pointer' : 'default' }}
            >
              {/* Pulse ring — renders only while step is active */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="pulse"
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={{ boxShadow: '0 0 0 0px rgba(30,77,43,0.4)' }}
                    animate={{
                      boxShadow: [
                        '0 0 0 0px rgba(30,77,43,0.4)',
                        '0 0 0 7px rgba(30,77,43,0)',
                        '0 0 0 0px rgba(30,77,43,0.4)',
                      ],
                    }}
                    exit={{ boxShadow: '0 0 0 0px rgba(30,77,43,0)', transition: { duration: 0.2 } }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.5 }}
                  />
                )}
              </AnimatePresence>

              {/* Circle — color fills on completion, scales up while active */}
              <motion.div
                animate={{
                  background: done || active ? 'var(--color-forest)' : 'var(--color-cream-dark)',
                  borderColor: done || active ? 'var(--color-forest)' : 'var(--color-cream-border)',
                  scale: active ? 1.12 : 1,
                }}
                whileHover={reachable ? { scale: active ? 1.2 : 1.1 } : {}}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: CIRCLE_PX, height: CIRCLE_PX }}
                className="rounded-full border-2 flex items-center justify-center overflow-hidden"
              >
                {/* Swap between number and checkmark with spring pop */}
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <motion.path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.22, delay: 0.06 }}
                        />
                      </svg>
                    </motion.span>
                  ) : (
                    <motion.span
                      key={`num-${step.n}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.18 }}
                      className="text-[10px] font-bold leading-none"
                      style={{ color: active ? 'white' : 'var(--color-brown-light)' }}
                    >
                      {step.n}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </button>
          )
        })}
      </div>

      {/*
        ── Label row ───────────────────────────────────────────────────────
        Each label wrapper is exactly CIRCLE_PX wide and uses flex justify-center
        so the label text is centered on the same x-position as its circle.
        Labels overflow their 28px box via whitespace-nowrap — that's fine
        because they're in a justify-between flex row and won't collide.
      */}
      <div className="hidden sm:flex justify-between mt-2">
        {STEPS.map((step) => {
          const done   = currentStep > step.n
          const active = currentStep === step.n
          return (
            <div
              key={step.n}
              className="flex justify-center overflow-visible"
              style={{ width: CIRCLE_PX }}
            >
              <motion.span
                className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                animate={{
                  color: active
                    ? 'var(--color-forest)'
                    : done
                    ? 'var(--color-forest-mid)'
                    : 'var(--color-brown-light)',
                }}
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
