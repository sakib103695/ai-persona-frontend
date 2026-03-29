'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { SourcesPanel } from '@/components/chat/SourcesPanel'
import { ImportModal } from '@/components/ui/ImportModal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Persona {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  tags: string[]
  status: string
  total_chunks: number
}

export interface SourceCard {
  chunk_id: string
  citation_index: number
  persona_name: string
  persona_color: string
  video_title: string
  video_id: string
  topic_summary: string
  chunk_preview: string
  word_count: number
  confidence: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCard[]
}

type Mode = 'learn' | 'advisor' | 'research'

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSONA_COLORS = [
  '#6366f1', '#10b981', '#ec4899', '#f97316', '#0ea5e9', '#d946ef', '#f59e0b', '#f43f5e',
]

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'learn',    label: 'Learn',    icon: 'auto_stories' },
  { key: 'advisor',  label: 'Advisor',  icon: 'track_changes' },
  { key: 'research', label: 'Research', icon: 'search' },
]

// ─── Citation renderer ────────────────────────────────────────────────────────

function renderCitations(
  text: string,
  sources: SourceCard[],
  onCitationClick: (idx: number) => void,
) {
  const parts = text.split(/(\[\d+\])/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/)
    if (m) {
      const idx = parseInt(m[1]) - 1
      const src = sources[idx]
      const color = src?.persona_color || '#6366f1'
      return (
        <button
          key={i}
          onClick={() => onCitationClick(idx)}
          tabIndex={0}
          title={src?.video_title || `Source ${idx + 1}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: 3,
            backgroundColor: color + '1a',
            color,
            fontSize: 9,
            fontWeight: 900,
            margin: '0 2px',
            cursor: 'help',
            verticalAlign: 'middle',
            flexShrink: 0,
          }}
        >
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('learn')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeSources, setActiveSources] = useState<SourceCard[]>([])
  const [activeCitationIdx, setActiveCitationIdx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [showImport, setShowImport] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch personas on mount
  useEffect(() => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then(setPersonas)
      .catch(() => {})
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Reset session when selected personas or mode changes
  useEffect(() => {
    setSessionId(null)
    setMessages([])
    setActiveSources([])
  }, [selectedIds, mode])

  const togglePersona = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }, [])

  const canChat = selectedIds.length > 0 && !isStreaming

  async function sendMessage() {
    const text = input.trim()
    if (!text || !canChat) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)
    setStreamingContent('')
    setActiveSources([])

    try {
      // Create session lazily
      let sid = sessionId
      if (!sid) {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona_ids: selectedIds, mode }),
        })
        const session = await res.json()
        sid = session.id
        setSessionId(sid)
      }

      // Stream response
      const res = await fetch(`/api/chat/sessions/${sid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let finalSources: SourceCard[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue

          try {
            const parsed = JSON.parse(raw)
            if (parsed.token !== undefined) {
              fullContent += parsed.token
              setStreamingContent(fullContent)
            }
            if (parsed.sources) {
              finalSources = parsed.sources
              setActiveSources(parsed.sources)
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullContent, sources: finalSources },
      ])
      setStreamingContent('')
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Left: Chat Sidebar ─────────────────────────────────────── */}
      <ChatSidebar
        personas={personas}
        selectedIds={selectedIds}
        onToggle={togglePersona}
        onImport={() => setShowImport(true)}
      />

      {/* ── Center: Chat Canvas ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Mode toggle */}
        <div className="flex justify-center pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#f4f2ff] rounded-full p-1">
            {MODES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  mode === key
                    ? 'bg-[#181a2b] text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-rounded text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-[600px] mx-auto space-y-10">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <span className="material-symbols-rounded text-indigo-400 text-2xl">psychology</span>
                </div>
                <p className="text-[#181a2b] font-semibold text-base">
                  {selectedIds.length === 0
                    ? 'Select a persona to start'
                    : `Chat with ${selectedIds.length} persona${selectedIds.length > 1 ? 's' : ''}`}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedIds.length === 0
                    ? 'Choose one or more personas from the left panel'
                    : 'Ask anything — responses are grounded in real content'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[#181a2b] text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-md text-sm font-medium leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">AI</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Persona Synthesis
                      </span>
                    </div>
                    <div className="text-[15px] leading-[1.85] text-[#3d3a50] space-y-4">
                      {msg.content.split('\n\n').map((para, j) => (
                        <p key={j}>
                          {renderCitations(para, msg.sources ?? [], (idx) => {
                            setActiveSources(msg.sources ?? [])
                            setActiveCitationIdx(idx)
                          })}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">AI</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Persona Synthesis
                  </span>
                  <span className="flex gap-0.5 ml-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
                <div className="text-[15px] leading-[1.85] text-[#3d3a50]">
                  {streamingContent}
                  <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
                </div>
              </div>
            )}

            {/* Skeleton while waiting for first token */}
            {isStreaming && !streamingContent && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">AI</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Persona Synthesis
                  </span>
                </div>
                <div className="space-y-2">
                  {[80, 65, 90, 50].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 bg-slate-100 rounded-full animate-pulse"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 px-8 pb-6 pt-2">
          <div className="max-w-[700px] mx-auto">
            <div className="relative group">
              {/* Ambient glow on focus */}
              <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-2 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedIds.length === 0
                      ? 'Select a persona to start chatting...'
                      : 'Ask anything...'
                  }
                  disabled={selectedIds.length === 0 || isStreaming}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-[#181a2b] placeholder:text-slate-400 resize-none focus:outline-none px-2 py-2 max-h-32 overflow-y-auto disabled:cursor-not-allowed"
                  style={{ lineHeight: '1.5' }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                />
                {selectedIds.length > 0 && (
                  <div className="shrink-0 px-2.5 py-1 bg-[#f4f2ff] rounded-full text-xs font-semibold text-indigo-600 border border-indigo-100 self-end mb-1">
                    {selectedIds.length} active
                  </div>
                )}
                <button
                  onClick={sendMessage}
                  disabled={!canChat || !input.trim()}
                  className="shrink-0 w-10 h-10 brand-gradient rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 self-end"
                >
                  <span className="material-symbols-rounded text-white text-lg">north</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Claude Sonnet
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                End-to-end Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Sources Panel ───────────────────────────────────── */}
      <SourcesPanel
        sources={activeSources}
        activeCitationIdx={activeCitationIdx}
        onCitationClick={setActiveCitationIdx}
      />

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}
