'use client'

import { useEffect, useState } from 'react'

interface Stats {
  total_personas: number
  total_chunks: number
}

interface Persona {
  id: string
  total_chunks: number
  status: string
}

interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  price_per_1k: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-[#181a2b] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-[#181a2b]">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <span className="text-sm text-slate-500 font-medium">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildMsg, setRebuildMsg] = useState('')

  // Model settings
  const [currentModel, setCurrentModel] = useState<string>('')
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [savingModel, setSavingModel] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Chunk model
  const [chunkModel, setChunkModel] = useState<string>('mistralai/mistral-7b-instruct')
  const [savingChunkModel, setSavingChunkModel] = useState(false)
  const [chunkModelMsg, setChunkModelMsg] = useState('')

  // Import settings
  const [videoLimit, setVideoLimit] = useState<string>('0')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')

  useEffect(() => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then((personas: Persona[]) => {
        setStats({
          total_personas: personas.length,
          total_chunks: personas.reduce((s, p) => s + p.total_chunks, 0),
        })
      })
      .catch(() => {})

    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        setCurrentModel(s.chat_model ?? 'anthropic/claude-sonnet-4-6')
        setVideoLimit(s.channel_video_limit ?? '0')
        setChunkModel(s.chunk_model ?? 'mistralai/mistral-7b-instruct')
      })
      .catch(() => {})
  }, [])

  async function saveChunkModel(modelId: string) {
    setChunkModel(modelId)
    setSavingChunkModel(true)
    setChunkModelMsg('')
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunk_model: modelId }),
      })
      setChunkModelMsg('Saved')
    } catch {
      setChunkModelMsg('Failed to save')
    } finally {
      setSavingChunkModel(false)
      setTimeout(() => setChunkModelMsg(''), 3000)
    }
  }

  async function saveVideoLimit() {
    const n = parseInt(videoLimit, 10)
    if (isNaN(n) || n < 0) return
    setSavingLimit(true)
    setLimitMsg('')
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_video_limit: String(n) }),
      })
      setLimitMsg('Saved')
    } catch {
      setLimitMsg('Failed to save')
    } finally {
      setSavingLimit(false)
      setTimeout(() => setLimitMsg(''), 3000)
    }
  }

  function loadModels() {
    if (models.length > 0) return
    setModelsLoading(true)
    fetch('/api/settings/models')
      .then((r) => r.json())
      .then((data) => { setModels(data); setModelsLoading(false) })
      .catch(() => setModelsLoading(false))
  }

  async function saveModel(modelId: string) {
    setCurrentModel(modelId)
    setSavingModel(true)
    setSaveMsg('')
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_model: modelId }),
      })
      setSaveMsg('Saved')
    } catch {
      setSaveMsg('Failed to save')
    } finally {
      setSavingModel(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function handleRebuildAll() {
    if (!confirm('This will delete all knowledge chunks and re-process every persona from their transcripts. Continue?')) return
    setRebuilding(true)
    setRebuildMsg('')
    try {
      const personas: Persona[] = await fetch('/api/personas').then((r) => r.json())
      let total = 0
      for (const p of personas) {
        const res = await fetch(`/api/sources/rebuild/${p.id}`, { method: 'POST' })
        const data = await res.json()
        total += data.queued ?? 0
      }
      setRebuildMsg(`Queued ${total} sources for re-processing across ${personas.length} personas.`)
    } catch {
      setRebuildMsg('Something went wrong. Please try again.')
    } finally {
      setRebuilding(false)
    }
  }

  const filteredModels = models.filter((m) =>
    !modelSearch || m.id.toLowerCase().includes(modelSearch.toLowerCase()) || m.name.toLowerCase().includes(modelSearch.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-auto bg-[#f4f2ff]">
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-black text-[#181a2b]">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform configuration and data overview</p>
        </div>

        {/* Import Settings */}
        <Section title="Import Settings">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#181a2b] mb-0.5">Videos per channel limit</p>
              <p className="text-xs text-slate-400 mb-3">
                Cap the number of videos imported per channel. Useful for testing.
                Set to <span className="font-bold text-slate-500">0</span> for no limit.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={videoLimit}
                  onChange={(e) => setVideoLimit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveVideoLimit()}
                  placeholder="0 = unlimited"
                  className="w-36 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={saveVideoLimit}
                  disabled={savingLimit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingLimit ? (
                    <span className="material-symbols-rounded text-base animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-rounded text-base">save</span>
                  )}
                  Save
                </button>
                {limitMsg && (
                  <span className={`text-xs font-bold ${limitMsg === 'Saved' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {limitMsg}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mt-1">
              <span className="material-symbols-rounded text-amber-500 text-xl">video_settings</span>
            </div>
          </div>
          {parseInt(videoLimit) > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <span className="material-symbols-rounded text-amber-500 text-base">warning</span>
              <p className="text-xs text-amber-700 font-medium">
                Next channel import will only fetch the first <span className="font-bold">{videoLimit} videos</span>. Existing imports are not affected.
              </p>
            </div>
          )}
        </Section>

        {/* Chunking Model */}
        <Section title="Chunking Model">
          <p className="text-xs text-slate-400 mb-4">Used to split video transcripts into topic chunks during import. Cheapest model recommended — quality difference is minimal for this task.</p>
          <div className="space-y-2">
            {[
              { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B', note: '~$0.055 / 1M tokens — cheapest' },
              { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', note: '~$0.06 / 1M tokens' },
              { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5', note: '~$0.075 / 1M tokens — most reliable JSON' },
              { id: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5', note: '~$0.80 / 1M tokens — original' },
            ].map(({ id, label, note }) => (
              <button
                key={id}
                onClick={() => saveChunkModel(id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                  chunkModel === id
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${chunkModel === id ? 'text-indigo-700' : 'text-[#181a2b]'}`}>{label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className={`text-[11px] font-medium ${chunkModel === id ? 'text-indigo-500' : 'text-slate-400'}`}>{note}</span>
                  {chunkModel === id && (
                    savingChunkModel
                      ? <span className="material-symbols-rounded text-indigo-400 text-base animate-spin">sync</span>
                      : <span className="material-symbols-rounded text-indigo-500 text-base">check_circle</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {chunkModelMsg && (
            <p className={`text-xs font-bold mt-3 ${chunkModelMsg === 'Saved' ? 'text-emerald-600' : 'text-rose-500'}`}>{chunkModelMsg}</p>
          )}
        </Section>

        {/* Chat Model */}
        <Section title="Chat Model">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#181a2b] mb-0.5">Language Model</p>
            <p className="text-xs text-slate-400 mb-3">Used for all chat responses via OpenRouter</p>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
              <span className="material-symbols-rounded text-indigo-500 text-base">smart_toy</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-indigo-700 truncate">{currentModel || '—'}</p>
                <p className="text-[10px] text-indigo-400 font-medium">Current model</p>
              </div>
              {saveMsg && (
                <span className={`text-xs font-bold ${saveMsg === 'Saved' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {saveMsg}
                </span>
              )}
              {savingModel && (
                <span className="material-symbols-rounded text-indigo-400 text-base animate-spin">sync</span>
              )}
            </div>

            {models.length === 0 ? (
              <button
                onClick={loadModels}
                disabled={modelsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {modelsLoading ? (
                  <>
                    <span className="material-symbols-rounded text-base animate-spin">sync</span>
                    Loading models...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-base">refresh</span>
                    Browse available models
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search models (e.g. claude, gpt, gemini)..."
                  className="w-full px-3 py-2 bg-[#f4f2ff] rounded-xl text-sm text-[#181a2b] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 border border-transparent focus:border-indigo-200"
                />
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {filteredModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => saveModel(m.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        m.id === currentModel
                          ? 'bg-indigo-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${m.id === currentModel ? 'text-indigo-600' : 'text-[#181a2b]'}`}>
                          {m.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{m.id}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-slate-400">${m.price_per_1k}/1K tokens</p>
                        <p className="text-[10px] text-slate-300">{(m.context_length / 1000).toFixed(0)}K ctx</p>
                      </div>
                      {m.id === currentModel && (
                        <span className="material-symbols-rounded text-indigo-500 text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">No models match your search</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} available
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-50 pt-4 space-y-0">
            <Row
              label="Embedding Model"
              value="text-embedding-3-small"
              sub="Used for semantic search via OpenAI"
            />
            <Row
              label="Chunking Model"
              value="Claude Haiku 4.5"
              sub="Used for splitting transcripts into topic chunks"
            />
            <Row
              label="Retrieval Strategy"
              value="Hybrid (Vector + BM25)"
              sub="70% semantic, 30% keyword — top 12 chunks"
            />
          </div>
        </Section>

        {/* Knowledge Base Stats */}
        <Section title="Knowledge Base">
          {stats ? (
            <>
              <Row label="Total Personas" value={stats.total_personas.toString()} />
              <Row label="Knowledge Chunks" value={stats.total_chunks.toLocaleString()} sub="Embedded text segments across all personas" />
            </>
          ) : (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
        </Section>

        {/* Chat Defaults */}
        <Section title="Chat Defaults">
          <Row label="Default Mode" value="Learn" sub="Can be changed per session in the chat interface" />
          <Row label="Max History" value="20 messages" sub="Prior messages included for conversation context" />
          <Row label="Streaming" value="Enabled" sub="Responses stream token by token" />
        </Section>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-rose-100">
          <div className="px-6 py-4 border-b border-rose-100 bg-rose-50">
            <h2 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#181a2b]">Rebuild All Knowledge</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Deletes all knowledge chunks and re-processes every persona from their existing transcripts.
                </p>
                {rebuildMsg && (
                  <p className={`text-xs mt-2 font-medium ${rebuildMsg.includes('wrong') ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {rebuildMsg}
                  </p>
                )}
              </div>
              <button
                onClick={handleRebuildAll}
                disabled={rebuilding}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rebuilding ? (
                  <>
                    <span className="material-symbols-rounded text-base animate-spin">sync</span>
                    Rebuilding...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-base">restart_alt</span>
                    Rebuild All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
