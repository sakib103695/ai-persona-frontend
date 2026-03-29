'use client'

import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

type Tab = 'channel' | 'videos'

interface ImportStatus {
  total_videos: number
  completed: number
  failed: number
  in_progress: string
  current_step: string
  total_words_extracted: number
  percent: number
}

export function ImportModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('channel')
  const [urls, setUrls] = useState('')
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Poll status during import
  useEffect(() => {
    if (!importing || !personaId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/sources/status/${personaId}`)
      if (!res.ok) return
      const data: ImportStatus = await res.json()
      setStatus(data)
      if (data.completed + data.failed >= data.total_videos && data.total_videos > 0) {
        setImporting(false)
        clearInterval(interval)
        setTimeout(onClose, 1500)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [importing, personaId, onClose])

  async function handleImport() {
    const lines = urls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    setImporting(true)
    const res = await fetch('/api/sources/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: lines }),
    })
    if (res.ok) {
      const data = await res.json()
      // importChannels returns an array — poll the first persona_id
      const firstId = Array.isArray(data) ? data[0]?.persona_id : data.persona_id
      setPersonaId(firstId ?? null)
    }
  }

  const urlCount = urls
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length

  return (
    <div
      className="fixed inset-0 bg-[#181a2b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#181a2b]">Import Persona</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Train your AI on existing video content
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-slate-400 text-lg">close</span>
          </button>
        </div>

        {/* Tabs */}
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

        {/* Body */}
        <div className="p-6 space-y-4 flex-1">
          {!importing ? (
            <>
              {/* URL input */}
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
                      <span className="material-symbols-rounded text-indigo-600 text-[11px]">
                        info
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">
                        {urlCount} URL{urlCount > 1 ? 's' : ''} detected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info card */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-rounded text-indigo-600 text-lg">
                    auto_awesome
                  </span>
                </div>
                <div>
                  <p className="text-indigo-700 font-bold text-sm">Intelligent Extraction</p>
                  <p className="text-indigo-600/70 text-xs mt-0.5 leading-relaxed">
                    We automatically fetch all video transcripts, chunk them by topic, generate
                    embeddings, and build a persona profile — no manual work required.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Progress state */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center animate-pulse">
                  <span className="material-symbols-rounded text-white text-sm">
                    cloud_download
                  </span>
                </div>
                <div>
                  <p className="text-[#181a2b] font-bold text-sm">Ongoing Import</p>
                  {status && (
                    <p className="text-slate-400 text-xs">
                      {status.in_progress
                        ? `Processing: ${status.in_progress}`
                        : status.current_step}
                    </p>
                  )}
                </div>
              </div>

              {status && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Extracting transcripts:{' '}
                      <span className="font-mono text-indigo-600 font-bold">
                        {status.completed} / {status.total_videos}
                      </span>{' '}
                      videos
                    </span>
                    <span className="text-indigo-600 font-bold">{status.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-[#e0e1f7] rounded-full overflow-hidden">
                    <div
                      className="h-full brand-gradient rounded-full transition-all duration-500"
                      style={{ width: `${status.percent}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs">
                    {status.total_words_extracted.toLocaleString()} words extracted so far
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-[#fbf8ff] px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-slate-500 font-semibold text-sm hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || urlCount === 0}
            className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span className="material-symbols-rounded text-base">cloud_download</span>
            {importing ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
