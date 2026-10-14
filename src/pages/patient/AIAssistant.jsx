import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, ChevronDown, ChevronUp, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { assistantApi } from '../../services'

function ChatBubble({ msg, isUser }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary' : 'bg-slate-800'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {msg.urgent && (
          <div className="flex items-center gap-1.5 mb-1 text-xs text-red-600 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> Emergency guidance
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
            isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : msg.urgent
                ? 'bg-red-50 border border-red-200 text-slate-800 rounded-tl-sm'
                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
          }`}
        >
          {msg.content}
        </div>

        {msg.sources?.length > 0 && (
          <button
            onClick={() => setSourcesOpen((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {sourcesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {sourcesOpen ? 'Hide' : 'Show'} sources ({msg.sources.length})
          </button>
        )}
        {sourcesOpen && msg.sources && (
          <div className="mt-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            {msg.sources.map((s) => (
              <p key={s} className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-slate-400 rounded-full" />{s}
              </p>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {!isUser && ' · Not medical advice'}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <div className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
        <div className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
        <div className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  /** True when the RAG service is unreachable and the backend fell back. */
  const [degraded, setDegraded] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // The greeting and starter prompts come from the backend, so the assistant's
  // voice stays in one place rather than being duplicated in the UI.
  useEffect(() => {
    let cancelled = false
    assistantApi
      .welcome()
      .then(({ message, suggestions: starters }) => {
        if (cancelled) return
        setMessages([message])
        setSuggestions(starters)
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the health assistant. Try again shortly.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = async (text) => {
    const userMsg = {
      id: `me-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setError('')
    setTyping(true)

    try {
      const { data: reply, meta } = await assistantApi.chat(text)
      setMessages((prev) => [...prev, reply])
      // Either the RAG service is not configured, or it was and failed — both
      // mean the answer came from the small offline set, so say so.
      setDegraded(meta?.engine === 'offline-fallback')
    } catch (err) {
      setError(err.message || 'Unable to get a response. Please try again.')
    } finally {
      setTyping(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || typing) return
    sendMessage(input.trim())
  }

  const starterPrompts = messages[0]?.suggestions || suggestions

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      {/* Chat header */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>MediAssist AI</h2>
          <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-pulse" />
            Online · Always available
          </p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-slate-400 text-right">Not a substitute<br />for medical advice</p>
        </div>
      </div>

      {degraded && (
        <div className="mx-5 mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            The knowledge service is unavailable — answers are coming from a limited offline set.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} isUser={msg.role === 'user'} />
        ))}
        {typing && <TypingIndicator />}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />{error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && starterPrompts?.length > 0 && (
        <div className="px-5 pb-2">
          <p className="text-xs text-slate-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {starterPrompts.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-primary hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medical disclaimer */}
      <div className="mx-5 mb-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          This AI provides general health information only. Always consult a qualified healthcare provider for medical decisions.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-100 px-5 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a health question..."
            disabled={typing}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
          >
            {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
