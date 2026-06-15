import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, MessageSquare, Bot, User } from 'lucide-react'

export default function ChatBox({ messages, onSend, isChatting }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatting])

  const submit = () => {
    if (!input.trim() || isChatting) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <section
      className="rounded-3xl overflow-hidden shadow-sm"
      style={{ border: '1px solid var(--color-cream-border)' }}
    >
      {/* Header */}
      <div className="px-5 md:px-6 py-4 flex items-center gap-2"
           style={{ background: 'var(--color-cream-dark)', borderBottom: '1px solid var(--color-cream-border)' }}>
        <MessageSquare size={16} style={{ color: 'var(--color-forest-mid)' }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest"
             style={{ color: 'var(--color-brown-light)' }}>Ask a Follow-up Question</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 md:px-5 py-4 space-y-3 min-h-24 max-h-80 overflow-y-auto"
           style={{ background: 'white' }}>
        {messages.length === 0 && !isChatting && (
          <p className="text-center text-sm py-4" style={{ color: 'var(--color-brown-light)' }}>
            Ask anything about your plant's condition…
          </p>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, x: msg.role === 'user' ? 10 : -10 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: msg.role === 'user' ? 'var(--color-terracotta)' : 'var(--color-forest-pale)',
                }}
              >
                {msg.role === 'user'
                  ? <User size={13} color="white" />
                  : <Bot size={13} style={{ color: 'var(--color-forest)' }} />
                }
              </div>
              {/* Bubble */}
              <div
                className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? { background: 'var(--color-terracotta)', color: 'white', borderBottomRightRadius: '6px' }
                    : { background: 'var(--color-cream-dark)', color: 'var(--color-brown)', borderBottomLeftRadius: '6px' }
                }
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isChatting && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5 items-center"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: 'var(--color-forest-pale)' }}>
                <Bot size={13} style={{ color: 'var(--color-forest)' }} />
              </div>
              <div className="px-4 py-2.5 rounded-2xl flex gap-1 items-center"
                   style={{ background: 'var(--color-cream-dark)', borderBottomLeftRadius: '6px' }}>
                {[0, 1, 2].map(i => (
                  <motion.span key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-brown-light)' }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-5 py-3 flex gap-2"
           style={{ background: 'var(--color-cream-dark)', borderTop: '1px solid var(--color-cream-border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Can I still eat the fruit?"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'white',
            border: '1px solid var(--color-cream-border)',
            color: 'var(--color-brown)',
            fontFamily: 'var(--font-body)',
          }}
          disabled={isChatting}
        />
        <motion.button
          onClick={submit}
          disabled={isChatting || !input.trim()}
          whileHover={!isChatting && input.trim() ? { scale: 1.06 } : {}}
          whileTap={!isChatting && input.trim() ? { scale: 0.94 } : {}}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, var(--color-forest) 0%, var(--color-forest-mid) 100%)',
            color: 'white',
          }}
        >
          {isChatting
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />
          }
        </motion.button>
      </div>
    </section>
  )
}
