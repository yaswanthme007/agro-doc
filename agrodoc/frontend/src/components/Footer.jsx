import { motion } from 'framer-motion'
import { Leaf } from 'lucide-react'

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="w-full max-w-3xl mx-auto px-4 pb-10 mt-4"
    >
      <div className="pt-6" style={{ borderTop: '1px solid var(--color-cream-border)' }}>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="flex items-center gap-1.5">
            <Leaf size={11} style={{ color: 'var(--color-forest-light)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>
              Powered by{' '}
              <span style={{ color: 'var(--color-forest-mid)' }}>Featherless.ai</span>
              {' '}· MobileNetV2 on PlantVillage
            </span>
          </div>
          <p className="text-[11px] leading-relaxed max-w-xs" style={{ color: 'var(--color-brown-light)' }}>
            AgroDoc provides AI-assisted guidance and is not a substitute for
            professional agricultural advice. Always consult a qualified agronomist
            for critical crop management decisions.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}
