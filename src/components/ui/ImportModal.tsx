'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  onClose: () => void
  /** If provided, skip the import form and open directly in progress-view mode */
  viewPersonaId?: string
  /** If provided, adds videos to this existing persona instead of creating new ones */
  addToPersonaId?: string
}

type Tab = 'channel' | 'videos'

interface ImportStatus {
  total_videos: number
  completed: number
  failed: number
  queued: number
  transcribing: number
  chunking: number
  in_progress: string
  current_step: string
  total_words_extracted: number
  percent: number
}

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued — waiting to start',
  'extracting-transcript': 'Extracting transcripts',
  'chunking-and-embedding': 'Chunking & embedding knowledge',
  complete: 'Finalizing persona profile',
}

export function ImportModal({ onClose, viewPersonaId, addToPersonaId }: Props) {
  const [tab, setTab] = useState<Tab>('channel')
  const [urls, setUrls] = useState('')
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [stopping, setStopping] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // If opened in view mode, jump straight to the progress view
  useEffect(() => {
    if (viewPersonaId) {
      setPersonaId(viewPersonaId)
      setImporting(true)
    }
  }, [viewPersonaId])

  // Close on Escape — but block if actively importing a NEW import (not view mode)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (!importing || viewPersonaId)) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, importing, viewPersonaId])

  // Poll status during import
  useEffect(() => {
    if (!importing || !personaId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/sources/status/${personaId}`)
        if (!res.ok) return
        const data: ImportStatus = await res.json()
        setStatus(data)
        // Detect completion: all active sources processed (must have had at least 1 completed)
        if (
          data.total_videos > 0 &&
          data.completed + data.failed > 0 &&
          data.queued === 0 &&
          data.transcribing === 0 &&
          data.chunking === 0
        ) {
          setImporting(false)
          setDone(true)
          if (pollRef.current) clearInterval(pollRef.current)
          // In view mode don't auto-close — user opened this intentionally
          if (!viewPersonaId) setTimeout(onClose, 2000)
        }
      } catch {
        // network error — keep polling
      }
    }
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [importing, personaId])

  async function handleStopImport() {
    if (!personaId) return
    setStopping(true)
    try {
      await fetch(`/api/sources/cancel/${personaId}`, { method: 'POST' })
    } catch {}
    if (pollRef.current) clearInterval(pollRef.current)
    onClose()
  }

  async function handleImport() {
    const lines = urls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    setError(null)
    setImporting(true)

    try {
      if (addToPersonaId) {
        // Adding to an existing persona — process each URL
        for (const url of lines) {
          const res = await fetch('/api/sources/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ persona_id: addToPersonaId, url }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.message || `Server error ${res.status}`)
          }
        }
        setPersonaId(addToPersonaId)
      } else {
        // Creating new personas from channel URLs
        const res = await fetch('/api/sources/channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: lines }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Server error ${res.status}`)
        }

        const data = await res.json()
        const firstId = Array.isArray(data) ? data[0]?.persona_id : data.persona_id
        setPersonaId(firstId ?? null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start import. Please try again.')
      setImporting(false)
    }
  }

  const urlCount = urls.split('\n').map((l) => l.trim()).filter(Boolean).length

  return (
    <div
      className="fixed inset-0 bg-[#181a2b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !importing && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#181a2b]">Import Persona</h2>
            <p className="text-slate-500 text-sm mt-0.5">Train your AI on existing video content</p>
          </div>
          <button
            onClick={() => !importing && onClose()}
            disabled={importing}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-rounded text-slate-400 text-lg">close</span>
          </button>
        </div>

        {/* Tabs — only show before import starts */}
        {!importing && !done && (
          <div className="flex border-b border-slate-100 px-6">
            {(['channel', 'videos'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 pb-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-rounded text-base">
                  {t === 'channel' ? 'subscriptions' : 'smart_display'}
                </span>
                {t === 'channel' ? 'Channel' : 'Videos'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4 flex-1">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
              <span className="material-symbols-rounded text-rose-500 text-lg shrink-0">error</span>
              <div className="flex-1">
                <p className="text-rose-700 font-bold text-sm">Import Failed</p>
                <p className="text-rose-600 text-xs mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                <span className="material-symbols-rounded text-base">close</span>
              </button>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-rounded text-emerald-600 text-2xl">check_circle</span>
              </div>
              <p className="text-[#181a2b] font-bold">Import complete!</p>
              <p className="text-slate-400 text-sm text-center">
                {status?.total_videos} videos processed
                {status?.failed ? `, ${status.failed} failed` : ''}
              </p>
              <p className="text-slate-400 text-xs">Closing automatically...</p>
            </div>
          )}

          {/* Import form */}
          {!importing && !done && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {tab === 'channel' ? 'YouTube Channel URLs' : 'YouTube Video URLs'}
                </label>
                <div className="relative">
                  <textarea
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder={
                      tab === 'channel'
                        ? 'https://youtube.com/@username\nhttps://youtube.com/@another'
                        : 'https://youtube.com/watch?v=...'
                    }
                    className="w-full h-40 bg-[#f4f2ff] border border-slate-200 rounded-xl p-4 text-sm text-[#181a2b] placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {urlCount > 0 && (
                    <div className="absolute bottom-3 right-3 bg-[#e0e1f7] rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <span className="material-symbols-rounded text-indigo-600 text-[11px]">info</span>
                      <span className="text-[10px] font-bold text-indigo-600">
                        {urlCount} URL{urlCount > 1 ? 's' : ''} detected
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-rounded text-indigo-600 text-lg">auto_awesome</span>
                </div>
                <div>
                  <p className="text-indigo-700 font-bold text-sm">Intelligent Extraction</p>
                  <p className="text-indigo-600/70 text-xs mt-0.5 leading-relaxed">
                    We automatically fetch all video transcripts, chunk them by topic, generate embeddings, and build a persona profile — no manual work required.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Progress state */}
          {importing && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center">
                  <span className="material-symbols-rounded text-white text-sm animate-spin" style={{ animationDuration: '1.5s' }}>
                    sync
                  </span>
                </div>
                <div>
                  <p className="text-[#181a2b] font-bold text-sm">Importing</p>
                  <p className="text-slate-400 text-xs">
                    {status ? (STEP_LABELS[status.current_step] || status.current_step) : 'Starting...'}
                  </p>
                </div>
              </div>

              {status && (
                <>
                  {/* Overall progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">
                        {status.completed} / {status.total_videos} complete
                      </span>
                      <span className="text-indigo-600 font-bold">{status.percent}%</span>
                    </div>
                    <div className="h-2 bg-[#e0e1f7] rounded-full overflow-hidden">
                      <div
                        className="h-full brand-gradient rounded-full transition-all duration-700"
                        style={{ width: `${status.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Pipeline stage indicators */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Queued', count: status.queued, color: 'text-slate-500', bg: 'bg-slate-100' },
                      { label: 'Transcribing', count: status.transcribing, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Embed Queue', count: status.chunking, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map(({ label, count, color, bg }) => (
                      <div key={label} className={`rounded-xl p-3 ${bg}`}>
                        <p className={`text-lg font-black ${color}`}>{count}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Current video */}
                  {status.in_progress && (
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Currently processing</p>
                      <p className="text-xs text-[#181a2b] font-medium truncate">{status.in_progress}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{status.total_words_extracted.toLocaleString()} words extracted</span>
                    {status.failed > 0 && (
                      <span className="text-rose-500 font-medium">{status.failed} failed</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="border-t border-slate-100 bg-[#fbf8ff] px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="text-slate-500 font-semibold text-sm hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
            >
              {importing && !viewPersonaId ? 'Minimize' : 'Close'}
            </button>
            {importing && (
              <button
                onClick={handleStopImport}
                disabled={stopping}
                className="flex items-center gap-1.5 text-rose-600 font-semibold text-sm hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-rounded text-base">stop_circle</span>
                {stopping ? 'Stopping...' : 'Stop Import'}
              </button>
            )}
            {!importing && (
              <button
                onClick={handleImport}
                disabled={urlCount === 0}
                className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span className="material-symbols-rounded text-base">cloud_download</span>
                Start Import
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
