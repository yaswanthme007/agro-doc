import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine, Legend, LabelList,
  ResponsiveContainer,
} from 'recharts'
import { Activity, ChevronDown, Loader2, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '../App'

// ── Colour helpers ────────────────────────────────────────────────────────────

const f1Color = (f1) => {
  if (f1 >= 0.95) return '#1e4d2b'
  if (f1 >= 0.85) return '#2d6a4f'
  if (f1 >= 0.75) return '#52b788'
  if (f1 >= 0.65) return '#c9962a'
  return '#c4622d'
}

const shortLabel = (cls) => {
  const parts = cls.split(' - ')
  if (parts.length < 2) return cls.length > 20 ? cls.slice(0, 18) + '…' : cls
  const disease = parts.slice(1).join(' - ')
  const crop = parts[0]
  if (disease.toLowerCase() === 'healthy') return `${crop} · healthy`
  const abbrev = disease
    .replace('Haunglongbing (Citrus greening)', 'HLB greening')
    .replace('Cercospora leaf spot Gray leaf spot', 'Gray leaf spot')
    .replace('Two-spotted spider mite', 'Spider mites')
    .replace('Tomato Yellow Leaf Curl Virus', 'Yellow Leaf Curl')
  return abbrev.length > 20 ? abbrev.slice(0, 18) + '…' : abbrev
}

// ── Tooltip components ────────────────────────────────────────────────────────

const TIP_STYLE = {
  contentStyle: {
    background: '#faf6ef',
    border: '1px solid #ddd0bb',
    borderRadius: 10,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 11,
    color: '#2c1a0e',
    boxShadow: '0 4px 12px rgba(44,26,14,0.08)',
  },
  cursor: { fill: 'rgba(30,77,43,0.05)' },
}

const BarTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ ...TIP_STYLE.contentStyle, padding: '8px 12px', minWidth: 190 }}>
      <p style={{ fontWeight: 700, color: '#2c1a0e', marginBottom: 6, fontSize: 11.5 }}>{d.class}</p>
      <p style={{ color: '#6b4c3b' }}>
        F1 <b style={{ color: f1Color(d.f1) }}>{(d.f1 * 100).toFixed(1)}%</b>
      </p>
      <p style={{ color: '#6b4c3b' }}>Precision {(d.precision * 100).toFixed(1)}%</p>
      <p style={{ color: '#6b4c3b' }}>Recall {(d.recall * 100).toFixed(1)}%</p>
    </div>
  )
}

const LineTip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TIP_STYLE.contentStyle, padding: '8px 12px' }}>
      <p style={{ fontWeight: 700, color: '#2c1a0e', marginBottom: 4 }}>{label}</p>
      {payload.map(({ name, value, color }) => (
        <p key={name} style={{ color }}>
          {name}: <b>{typeof value === 'number' ? value.toFixed(unit === '%' ? 1 : 4) : value}{unit}</b>
        </p>
      ))}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
     style={{ color: 'var(--color-brown-light)' }}>
    {children}
  </p>
)

const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{ background: 'var(--color-cream-dark)', border: '1px solid var(--color-cream-border)' }}
  >
    {children}
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────

export default function ModelPerformance() {
  const [data, setData]             = useState(null)
  const [fetching, setFetching]     = useState(false)
  const [err, setErr]               = useState(null)
  const [showMatrix, setShowMatrix] = useState(false)

  // Auto-fetch on mount — no toggle needed
  useEffect(() => {
    setFetching(true)
    fetch(`${API_BASE_URL}/model-stats`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => setData(d))
      .catch(e => setErr(e.name === 'TypeError'
        ? "Couldn't load model stats — is the backend running?"
        : `Failed to load: ${e.message}`))
      .finally(() => setFetching(false))
  }, [])

  // ── Derived chart data ──────────────────────────────────────────────────────

  const top10 = (data?.per_class_f1 ?? []).slice(0, 10).map(d => ({
    ...d, label: shortLabel(d.class),
  }))
  const bottom10 = (data?.per_class_f1 ?? []).slice(-10).reverse().map(d => ({
    ...d, label: shortLabel(d.class),
  }))

  const hist     = data?.training_history
  const accData  = hist ? hist.epochs.map((ep, i) => ({
    epoch: `Ep ${ep}`, Train: hist.train_acc[i], Val: hist.val_acc[i],
  })) : []
  const lossData = hist ? hist.epochs.map((ep, i) => ({
    epoch: `Ep ${ep}`, Train: hist.train_loss[i], Val: hist.val_loss[i],
  })) : []

  const s = data?.summary

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Panel header */}
      <div className="flex items-center gap-2.5 px-1">
        <Activity size={15} style={{ color: 'var(--color-forest-mid)' }} />
        <h2
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-brown)' }}
        >
          Model Performance
        </h2>
      </div>

      {/* Loading */}
      {fetching && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-forest-mid)' }} />
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>Loading model stats…</p>
        </div>
      )}

      {/* Error */}
      {err && !fetching && (
        <div className="rounded-2xl px-4 py-3 flex gap-2 items-start"
             style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={14} style={{ color: '#b91c1c', marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#b91c1c' }}>{err}</p>
        </div>
      )}

      {s && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          {/* ── 1. Stat cards (2×2) ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { val: `${s.val_accuracy.toFixed(1)}%`, label: 'Val Accuracy',    sub: 'best checkpoint' },
              { val: s.macro_f1.toFixed(3),            label: 'Macro F1',        sub: `P ${(s.macro_precision*100).toFixed(1)}% · R ${(s.macro_recall*100).toFixed(1)}%` },
              { val: `${s.num_classes}`,               label: 'Disease Classes', sub: '+ healthy states' },
              { val: `${s.num_crops}`,                 label: 'Crops Covered',   sub: 'Apple → Tomato' },
            ].map(({ val, label, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <Card className="p-3.5 text-center">
                  <div
                    className="text-xl font-bold mb-0.5 leading-none"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}
                  >
                    {val}
                  </div>
                  <div className="text-[11px] font-semibold mt-1 mb-0.5" style={{ color: 'var(--color-brown)' }}>
                    {label}
                  </div>
                  <div className="text-[10px] leading-tight" style={{ color: 'var(--color-brown-light)' }}>
                    {sub}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* ── 2. Training curves ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="space-y-3"
          >
            {/* Accuracy */}
            <Card className="p-3.5">
              <SectionLabel>Accuracy over 3 epochs</SectionLabel>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={accData} margin={{ top: 4, right: 20, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0bb" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 9.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  <YAxis
                    domain={[75, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 9.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }}
                  />
                  <Tooltip content={<LineTip unit="%" />} {...TIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#6b4c3b', fontFamily: 'DM Sans, sans-serif', paddingTop: 6 }} />
                  <ReferenceLine
                    x={`Ep ${hist.best_epoch}`} stroke="#c9962a" strokeDasharray="5 3"
                    label={{ value: '★', fill: '#c9962a', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Line type="monotone" dataKey="Train" name="Train" stroke="#2d6a4f" strokeWidth={2}
                    dot={{ r: 3.5, fill: '#2d6a4f', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Val" name="Val" stroke="#c4622d" strokeWidth={2}
                    dot={{ r: 3.5, fill: '#c4622d', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Loss */}
            <Card className="p-3.5">
              <SectionLabel>Loss over 3 epochs</SectionLabel>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={lossData} margin={{ top: 4, right: 20, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0bb" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 9.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  <YAxis
                    tickFormatter={v => v.toFixed(2)}
                    tick={{ fontSize: 9.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }}
                  />
                  <Tooltip content={<LineTip unit="" />} {...TIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#6b4c3b', fontFamily: 'DM Sans, sans-serif', paddingTop: 6 }} />
                  <ReferenceLine x={`Ep ${hist.best_epoch}`} stroke="#c9962a" strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="Train" name="Train" stroke="#2d6a4f" strokeWidth={2}
                    dot={{ r: 3.5, fill: '#2d6a4f', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Val" name="Val" stroke="#c4622d" strokeWidth={2}
                    dot={{ r: 3.5, fill: '#c4622d', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* ── 3. Per-class F1 bar charts ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="space-y-3"
          >
            <Card className="p-3.5">
              <SectionLabel>Top 10 classes — F1</SectionLabel>
              <ResponsiveContainer width="100%" height={top10.length * 30 + 32}>
                <BarChart layout="vertical" data={top10} margin={{ top: 2, right: 32, left: 2, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ddd0bb" />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`}
                    tick={{ fontSize: 8.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  <YAxis type="category" dataKey="label" width={118}
                    tick={{ fontSize: 9, fill: '#2c1a0e', fontFamily: 'DM Sans, sans-serif' }} />
                  <Tooltip content={<BarTip />} cursor={TIP_STYLE.cursor} />
                  <Bar dataKey="f1" radius={[0, 4, 4, 0]} isAnimationActive>
                    {top10.map((entry, i) => <Cell key={i} fill={f1Color(entry.f1)} />)}
                    <LabelList dataKey="f1" position="right"
                      formatter={v => `${(v * 100).toFixed(0)}%`}
                      style={{ fontSize: 8.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-3.5">
              <SectionLabel>10 Most challenging — F1</SectionLabel>
              <p className="text-[10px] mb-2.5 leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                Visually similar diseases drive most confusion.
              </p>
              <ResponsiveContainer width="100%" height={bottom10.length * 30 + 32}>
                <BarChart layout="vertical" data={bottom10} margin={{ top: 2, right: 32, left: 2, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ddd0bb" />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`}
                    tick={{ fontSize: 8.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  <YAxis type="category" dataKey="label" width={118}
                    tick={{ fontSize: 9, fill: '#2c1a0e', fontFamily: 'DM Sans, sans-serif' }} />
                  <Tooltip content={<BarTip />} cursor={TIP_STYLE.cursor} />
                  <Bar dataKey="f1" radius={[0, 4, 4, 0]} isAnimationActive>
                    {bottom10.map((entry, i) => <Cell key={i} fill={f1Color(entry.f1)} />)}
                    <LabelList dataKey="f1" position="right"
                      formatter={v => `${(v * 100).toFixed(0)}%`}
                      style={{ fontSize: 8.5, fill: '#6b4c3b', fontFamily: 'DM Sans, sans-serif' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* ── 4. Confusion matrix (collapsible — image is large) ────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24 }}
          >
            <button
              onClick={() => setShowMatrix(m => !m)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              style={{
                background: showMatrix ? 'rgba(30,77,43,0.06)' : 'transparent',
                border: '1px solid var(--color-cream-border)',
                color: 'var(--color-brown-mid)',
              }}
            >
              <span>Confusion Matrix (38 × 38)</span>
              <motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={13} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showMatrix && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden mt-2"
                >
                  <img
                    src={`${API_BASE_URL}/model-stats/confusion-matrix`}
                    alt="38-class confusion matrix on the validation set"
                    className="w-full rounded-2xl"
                    style={{ border: '1px solid var(--color-cream-border)' }}
                  />
                  <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--color-brown-light)' }}>
                    Validation set · 1,140 images
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Dataset credit */}
          <p className="text-[10px] text-center pb-1" style={{ color: 'var(--color-brown-light)' }}>
            MobileNetV2 · PlantVillage · {s.train_images.toLocaleString()} train / {s.val_images.toLocaleString()} val
          </p>
        </motion.div>
      )}
    </div>
  )
}
