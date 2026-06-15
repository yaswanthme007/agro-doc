import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Camera, Microscope, ImagePlus, Loader2 } from 'lucide-react'

export default function UploadSection({ preview, onFileSelect, onDiagnose, isPredicting, hasPrediction }) {
  const fileRef   = useRef(null)
  const cameraRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onFileSelect(f)
  }, [onFileSelect])

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleFileInput = (e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]) }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl p-5 md:p-6 shadow-sm"
      style={{ background: 'var(--color-cream-dark)', border: '1px solid var(--color-cream-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-4"
         style={{ color: 'var(--color-brown-light)' }}>
        Step 1 — Upload a photo of your crop
      </p>

      {/* Drop zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        animate={{
          borderColor: isDragging ? 'var(--color-forest-light)' : 'var(--color-cream-border)',
          backgroundColor: isDragging ? 'rgba(82,183,136,0.06)' : 'transparent',
        }}
        transition={{ duration: 0.15 }}
        className="relative rounded-2xl border-2 border-dashed cursor-pointer min-h-40 flex flex-col items-center justify-center gap-3 overflow-hidden"
        style={{ borderColor: 'var(--color-cream-border)' }}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.img
              key="preview"
              src={preview}
              alt="Crop preview"
              className="w-full h-56 md:h-64 object-cover rounded-xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <motion.div
              key="placeholder"
              className="flex flex-col items-center gap-3 py-10 px-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(30,77,43,0.08)' }}>
                <ImagePlus size={26} style={{ color: 'var(--color-forest-mid)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-brown)' }}>
                  Drag & drop or tap to choose
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-brown-light)' }}>
                  JPG, PNG, WEBP supported
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hidden inputs */}
      <input ref={fileRef}   type="file" accept="image/*"
             className="hidden" onChange={handleFileInput} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
             className="hidden" onChange={handleFileInput} />

      {/* Action row */}
      <div className="flex gap-3 mt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-colors"
          style={{
            background: 'white',
            color: 'var(--color-brown)',
            border: '1px solid var(--color-cream-border)',
          }}
        >
          <Upload size={16} />
          Gallery
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-colors"
          style={{
            background: 'white',
            color: 'var(--color-brown)',
            border: '1px solid var(--color-cream-border)',
          }}
        >
          <Camera size={16} />
          Camera
        </motion.button>
      </div>

      {/* Diagnose button */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 overflow-hidden"
          >
            <motion.button
              onClick={onDiagnose}
              disabled={isPredicting}
              whileHover={!isPredicting ? { scale: 1.015 } : {}}
              whileTap={!isPredicting ? { scale: 0.985 } : {}}
              className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2.5 text-base transition-all disabled:cursor-not-allowed"
              style={{
                background: isPredicting
                  ? 'var(--color-forest-mid)'
                  : 'linear-gradient(135deg, var(--color-forest) 0%, var(--color-forest-mid) 100%)',
                boxShadow: isPredicting ? 'none' : '0 4px 16px rgba(30,77,43,0.25)',
              }}
              animate={isPredicting ? { boxShadow: ['0 0 0 0 rgba(82,183,136,0.4)', '0 0 0 10px rgba(82,183,136,0)', '0 0 0 0 rgba(82,183,136,0)'] } : {}}
              transition={isPredicting ? { duration: 1.5, repeat: Infinity } : {}}
            >
              {isPredicting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing your crop…
                </>
              ) : (
                <>
                  <Microscope size={18} />
                  {hasPrediction ? 'Diagnose Again' : 'Diagnose Plant'}
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
