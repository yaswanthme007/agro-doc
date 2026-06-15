import { motion } from 'framer-motion'
import { Leaf } from 'lucide-react'

export default function Header() {
  return (
    <header className="w-full py-6 px-4 mb-2">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="animate-sway origin-bottom"
            style={{ color: 'var(--color-forest-light)' }}
          >
            <Leaf size={32} strokeWidth={1.8} />
          </motion.div>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}
          >
            AgroDoc
          </h1>
        </motion.div>

        <motion.p
          className="text-sm md:text-base font-medium tracking-wide uppercase"
          style={{ color: 'var(--color-brown-mid)', letterSpacing: '0.12em' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          AI Crop Doctor for Farmers
        </motion.p>

        <motion.div
          className="mt-1 h-px w-20 rounded-full"
          style={{ background: 'var(--color-cream-border)' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        />
      </div>
    </header>
  )
}
