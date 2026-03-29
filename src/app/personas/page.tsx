'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ImportModal } from '@/components/ui/ImportModal'

const PERSONA_COLORS = [
  '#6366f1', '#10b981', '#ec4899', '#f97316',
  '#0ea5e9', '#d946ef', '#f59e0b', '#f43f5e',
]

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ready:      { label: 'Ready',      dot: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending:    { label: 'Queued',     dot: '#94a3b8', text: 'text-slate-500',   bg: 'bg-slate-100'  },
  processing: { label: 'Processing', dot: '#f59e0b', text: 'text-amber-600',   bg: 'bg-amber-50'   },
  failed:     { label: 'Failed',     dot: '#f43f5e', text: 'text-rose-600',    bg: 'bg-rose-50'    },
}

function avatarInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then((data) => { setPersonas(data); setLoading(false) })
      .catch(() => setLoading(false))

    const poll = setInterval(() => {
      fetch('/api/personas')
        .then((r) => r.json())
        .then(setPersonas)
        .catch(() => {})
    }, 5000)
    return () => clearInterval(poll)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto bg-[#f4f2ff]">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#181a2b]">Personas</h1>
            <p className="text-slate-400 text-sm mt-0.5">{personas.length} persona{personas.length !== 1 ? 's' : ''} in your library</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
          >
            <span className="material-symbols-rounded text-base">add</span>
            Import Persona
          </button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 h-40 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((j) => <div key={j} className="h-5 w-16 bg-slate-100 rounded-full" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : personas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-rounded text-indigo-400 text-3xl">person_search</span>
              </div>
              <h2 className="text-[#181a2b] font-bold text-xl mb-2">No personas yet</h2>
              <p className="text-slate-400 text-sm max-w-sm mb-6">
                Import a YouTube channel to create your first AI persona.
              </p>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform"
              >
                <span className="material-symbols-rounded text-base">cloud_download</span>
                Import First Persona
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {personas.map((persona, idx) => {
                const color = PERSONA_COLORS[idx % PERSONA_COLORS.length]
                const st = STATUS_CONFIG[persona.status] ?? STATUS_CONFIG.pending

                return (
                  <Link
                    key={persona.id}
                    href={`/personas/${persona.id}`}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group border border-transparent hover:border-indigo-100 block"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: color + '22', color, outline: `2px solid ${color}40`, outlineOffset: 1 }}
                      >
                        {persona.avatar_url ? (
                          <img src={persona.avatar_url} alt={persona.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          avatarInitials(persona.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#181a2b] text-sm truncate group-hover:text-indigo-600 transition-colors">
                          {persona.name}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {persona.total_chunks > 0 ? `${persona.total_chunks} chunks` : 'No chunks yet'}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                        {st.label}
                      </span>
                    </div>

                    {/* Tags */}
                    {(persona.tags ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {persona.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#f4f2ff] text-indigo-600 rounded-full text-[10px] font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                        {persona.tags.length > 4 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-semibold">
                            +{persona.tags.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-300 text-xs italic">No tags yet</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400">
                        Added {new Date(persona.created_at).toLocaleDateString()}
                      </span>
                      <span className="material-symbols-rounded text-slate-300 text-base group-hover:text-indigo-400 transition-colors">
                        arrow_forward
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
