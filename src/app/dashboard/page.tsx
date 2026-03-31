'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImportModal } from '@/components/ui/ImportModal'

interface Persona {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  tags: string[]
  status: string
  total_chunks: number
  created_at: string
}

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

const PERSONA_COLORS = [
  '#6366f1', '#10b981', '#ec4899', '#f97316',
  '#0ea5e9', '#d946ef', '#f59e0b', '#f43f5e',
]

function avatarInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function ProcessingCard({ persona, idx }: { persona: Persona; idx: number }) {
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const color = PERSONA_COLORS[idx % PERSONA_COLORS.length]

  useEffect(() => {
    const fetch_ = () =>
      fetch(`/api/sources/status/${persona.id}`)
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {})
    fetch_()
    const id = setInterval(fetch_, 3000)
    return () => clearInterval(id)
  }, [persona.id])

  if (!status) return null

  const stepLabel: Record<string, string> = {
    queued: 'Queued',
    'extracting-transcript': 'Extracting transcripts',
    'chunking-and-embedding': 'Chunking & embedding',
    complete: 'Finalizing profile',
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: color + '22', color, outline: `2px solid ${color}40`, outlineOffset: 1 }}
        >
          {avatarInitials(persona.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#181a2b] text-sm truncate">{persona.name}</p>
          <p className="text-xs text-amber-600 font-semibold">
            {stepLabel[status.current_step] || 'Processing'}
          </p>
        </div>
        <span className="text-sm font-bold text-amber-600">{status.percent}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${status.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>{status.completed}/{status.total_videos} videos done</span>
        {status.in_progress && (
          <span className="truncate max-w-[180px] ml-2">{status.in_progress}</span>
        )}
      </div>
      {status.failed > 0 && (
        <p className="text-[10px] text-rose-500 mt-1 font-medium">{status.failed} failed</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    const load = () =>
      fetch('/api/personas')
        .then((r) => r.json())
        .then((data) => { setPersonas(data); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const readyPersonas = personas.filter((p) => p.status === 'ready')
  const processingPersonas = personas.filter((p) => p.status === 'processing')
  const totalChunks = personas.reduce((s, p) => s + p.total_chunks, 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-rounded text-indigo-400 text-4xl animate-pulse">hub</span>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Empty state — no personas yet
  if (personas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-rounded text-indigo-400 text-3xl">psychology</span>
          </div>
          <h1 className="text-2xl font-black text-[#181a2b] mb-2">Welcome to Persona AI</h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Import a YouTube channel to create an AI persona that thinks, speaks, and reasons like the creator.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 brand-gradient text-white font-bold text-sm px-6 py-3 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform"
          >
            <span className="material-symbols-rounded text-base">add</span>
            Import Your First Persona
          </button>
          <p className="text-slate-400 text-xs mt-4">Paste a YouTube channel URL to get started</p>
        </div>
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[#f4f2ff]">
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#181a2b]">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Your AI knowledge workspace</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
          >
            <span className="material-symbols-rounded text-base">add</span>
            Import Persona
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Personas', value: personas.length, icon: 'person', color: 'indigo' },
            { label: 'Ready', value: readyPersonas.length, icon: 'check_circle', color: 'emerald' },
            { label: 'Processing', value: processingPersonas.length, icon: 'sync', color: 'amber' },
            { label: 'Knowledge Chunks', value: totalChunks.toLocaleString(), icon: 'hub', color: 'purple' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
                <span className={`material-symbols-rounded text-${color}-500 text-base`}>{icon}</span>
              </div>
              <p className="text-2xl font-black text-[#181a2b]">{value}</p>
              <p className="text-slate-400 text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Active Processing */}
        {processingPersonas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-amber-500 text-base animate-spin" style={{ animationDuration: '2s' }}>sync</span>
              <h2 className="text-sm font-bold text-[#181a2b] uppercase tracking-wider">Active Processing</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processingPersonas.map((p, i) => (
                <ProcessingCard key={p.id} persona={p} idx={i} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="bg-[#181a2b] text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-white text-xl">chat</span>
            </div>
            <div>
              <p className="font-bold text-sm">Start Chatting</p>
              <p className="text-slate-400 text-xs mt-0.5">{readyPersonas.length} persona{readyPersonas.length !== 1 ? 's' : ''} ready</p>
            </div>
            <span className="material-symbols-rounded text-slate-500 text-base ml-auto group-hover:text-slate-300 transition-colors">arrow_forward</span>
          </button>
          <Link
            href="/personas"
            className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left group border border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-indigo-500 text-xl">manage_accounts</span>
            </div>
            <div>
              <p className="font-bold text-sm text-[#181a2b]">Manage Personas</p>
              <p className="text-slate-400 text-xs mt-0.5">Search, filter, configure</p>
            </div>
            <span className="material-symbols-rounded text-slate-300 text-base ml-auto group-hover:text-indigo-400 transition-colors">arrow_forward</span>
          </Link>
        </div>

        {/* Recent Personas */}
        {readyPersonas.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#181a2b] uppercase tracking-wider">Ready Personas</h2>
              <Link href="/personas" className="text-xs text-indigo-500 font-semibold hover:text-indigo-700">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyPersonas.slice(0, 4).map((persona, idx) => {
                const color = PERSONA_COLORS[idx % PERSONA_COLORS.length]
                return (
                  <div key={persona.id} className="bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-indigo-100 transition-colors flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: color + '22', color, outline: `2px solid ${color}40`, outlineOffset: 1 }}
                    >
                      {persona.avatar_url
                        ? <img src={persona.avatar_url} alt={persona.name} className="w-full h-full rounded-xl object-cover" />
                        : avatarInitials(persona.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#181a2b] text-sm truncate">{persona.name}</p>
                      <p className="text-slate-400 text-xs">
                        {persona.total_chunks > 0 ? `${persona.total_chunks.toLocaleString()} chunks` : 'No chunks yet'}
                      </p>
                    </div>
                    <Link
                      href={`/chat?persona=${persona.id}`}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 brand-gradient text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-rounded text-sm">chat</span>
                      Chat
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
