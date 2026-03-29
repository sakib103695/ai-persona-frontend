'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ImportModal } from '@/components/ui/ImportModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  tags: string[]
  status: string
  total_chunks: number
  persona_profile: PersonaProfile
  created_at: string
  updated_at: string
}

interface PersonaProfile {
  tone?: string
  expertise?: string[]
  speaking_style?: string
  key_opinions?: string[]
  topics_to_avoid?: string[]
  catchphrases?: string[]
  tags?: string[]
}

interface Source {
  id: string
  video_id: string
  title: string
  word_count: number
  status: string
  caption_type: string
  created_at: string
  error?: string
}

type Tab = 'sources' | 'profile' | 'settings'

const STATUS_CONFIG: Record<string, { label: string; dot: string; textClass: string; bgClass: string }> = {
  done:        { label: 'Done',        dot: '#10b981', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  transcribed: { label: 'Transcribed', dot: '#6366f1', textClass: 'text-indigo-600',  bgClass: 'bg-indigo-50'  },
  processing:  { label: 'Processing',  dot: '#f59e0b', textClass: 'text-amber-600',   bgClass: 'bg-amber-50'   },
  queued:      { label: 'Queued',      dot: '#94a3b8', textClass: 'text-slate-500',   bgClass: 'bg-slate-100'  },
  failed:      { label: 'Failed',      dot: '#f43f5e', textClass: 'text-rose-600',    bgClass: 'bg-rose-50'    },
}

function avatarInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [persona, setPersona] = useState<Persona | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [tab, setTab] = useState<Tab>('sources')
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch(`/api/personas/${id}`).then((r) => r.json()),
      fetch(`/api/sources?persona_id=${id}`).then((r) => r.json()),
    ])
      .then(([p, s]) => {
        setPersona(p)
        setSources(Array.isArray(s) ? s : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function toggleSource(sourceId: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)
      next.has(sourceId) ? next.delete(sourceId) : next.add(sourceId)
      return next
    })
  }

  function toggleAll() {
    setSelectedSourceIds((prev) =>
      prev.size === sources.length ? new Set() : new Set(sources.map((s) => s.id)),
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading persona...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#181a2b] font-bold text-lg">Persona not found</p>
            <Link href="/personas" className="text-indigo-600 text-sm mt-2 block">
              ← Back to Personas
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const profile: PersonaProfile = persona.persona_profile ?? {}
  const doneCount = sources.filter((s) => s.status === 'done').length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-64 flex overflow-hidden">
        {/* ── Management Center ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Breadcrumb */}
          <div className="px-8 pt-5 pb-0 shrink-0">
            <Link href="/personas" className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors w-fit">
              <span className="material-symbols-rounded text-sm">arrow_back</span>
              All Personas
            </Link>
          </div>

          {/* Persona header */}
          <div className="px-8 py-5 flex items-start gap-5 border-b border-slate-100 shrink-0">
            {/* Avatar with gradient border */}
            <div className="p-0.5 rounded-2xl brand-gradient shrink-0">
              <div className="w-16 h-16 rounded-[14px] bg-white flex items-center justify-center">
                {persona.avatar_url ? (
                  <img src={persona.avatar_url} alt={persona.name} className="w-full h-full rounded-[14px] object-cover" />
                ) : (
                  <span className="text-indigo-600 font-black text-xl">{avatarInitials(persona.name)}</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight text-[#181a2b]">{persona.name}</h1>
                {persona.status === 'ready' && (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase rounded-full">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {profile.tone ?? persona.slug} · {doneCount} videos · {persona.total_chunks} chunks
              </p>
              {(persona.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {persona.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-[#f4f2ff] text-indigo-600 rounded-full text-[10px] font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/chat?persona=${persona.id}`}
                className="flex items-center gap-1.5 brand-gradient text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
              >
                <span className="material-symbols-rounded text-base">chat</span>
                Chat
              </Link>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 bg-[#f4f2ff] text-indigo-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#e0e1f7] transition-colors"
              >
                <span className="material-symbols-rounded text-base">add</span>
                Add Videos
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0 px-8 border-b border-slate-100 shrink-0">
            {(['sources', 'profile', 'settings'] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { sources: 'Sources', profile: 'Intelligence', settings: 'Settings' }
              const icons: Record<Tab, string> = { sources: 'video_library', profile: 'psychology', settings: 'tune' }
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{icons[t]}</span>
                  {labels[t]}
                  {t === 'sources' && sources.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sources.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'sources' && (
              <div className="p-6">
                {/* Bulk action bar */}
                {selectedSourceIds.size > 0 && (
                  <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#181a2b] text-white px-4 py-3 rounded-xl mb-4 shadow-lg">
                    <span className="text-sm font-semibold">{selectedSourceIds.size} selected</span>
                    <div className="flex-1" />
                    <button className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-rounded text-sm">refresh</span>
                      Re-process
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-rounded text-sm">delete</span>
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedSourceIds(new Set())}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                )}

                {/* Sub-filter row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    {['All Videos', 'Done', 'Failed'].map((f) => (
                      <button key={f} className="px-3 py-1.5 text-xs font-semibold bg-[#f4f2ff] text-indigo-600 rounded-lg hover:bg-[#e0e1f7] transition-colors">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-4 mb-2">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.size === sources.length && sources.length > 0}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="col-span-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Title</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Words</div>
                  <div className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Date</div>
                </div>

                {/* Source rows */}
                <div className="space-y-2">
                  {sources.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-rounded text-slate-200 text-4xl block mb-3">video_library</span>
                      <p className="text-slate-400 text-sm">No sources yet</p>
                    </div>
                  ) : (
                    sources.map((source) => {
                      const st = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.queued
                      const isSelected = selectedSourceIds.has(source.id)
                      return (
                        <div
                          key={source.id}
                          className={`grid grid-cols-12 gap-4 items-center bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow border ${
                            isSelected ? 'border-indigo-200' : 'border-transparent'
                          }`}
                        >
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSource(source.id)}
                              className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-6 flex items-center gap-3 min-w-0">
                            <a
                              href={`https://youtube.com/watch?v=${source.video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-14 h-10 bg-slate-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity"
                              title="Watch on YouTube"
                            >
                              {source.video_id ? (
                                <img
                                  src={`https://i.ytimg.com/vi/${source.video_id}/default.jpg`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="material-symbols-rounded text-slate-400 text-base">play_circle</span>
                              )}
                            </a>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#181a2b] truncate">
                                {source.title || `Video ${source.video_id}`}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {source.caption_type ?? 'auto-generated'}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bgClass} ${st.textClass}`}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                              {st.label}
                            </span>
                            {source.status === 'failed' && source.error && (
                              <p className="text-[10px] text-rose-400 mt-0.5 truncate" title={source.error}>
                                {source.error}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 text-xs text-slate-500 font-medium text-right">
                            {source.word_count > 0 ? source.word_count.toLocaleString() : '—'}
                          </div>
                          <div className="col-span-1 text-[10px] text-slate-400 text-right">
                            {new Date(source.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {tab === 'profile' && (
              <div className="p-6 space-y-6 max-w-2xl">
                {!profile.tone && !profile.expertise ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-rounded text-slate-200 text-4xl block mb-3">psychology</span>
                    <p className="text-slate-400 text-sm">Profile not generated yet</p>
                    <p className="text-slate-300 text-xs mt-1">Import videos to generate the intelligence profile</p>
                  </div>
                ) : (
                  <>
                    {profile.tone && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Tone Analysis</p>
                        <div className="bg-indigo-50 rounded-xl p-4">
                          <p className="text-sm font-bold text-[#181a2b]">{profile.tone}</p>
                          {profile.speaking_style && (
                            <p className="text-xs text-slate-500 mt-1">{profile.speaking_style}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(profile.expertise ?? []).length > 0 && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-500 mb-3">Expertise</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.expertise!.map((e) => (
                            <span key={e} className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 rounded-full text-xs font-semibold">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(profile.key_opinions ?? []).length > 0 && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Key Opinions</p>
                        <div className="space-y-2">
                          {profile.key_opinions!.map((op, i) => (
                            <div key={i} className="border-l-4 border-indigo-500 bg-white rounded-lg pl-3 py-2 pr-3 shadow-sm">
                              <p className="text-xs text-slate-600 italic">"{op}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(profile.catchphrases ?? []).length > 0 && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Catchphrases</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.catchphrases!.map((c) => (
                            <span key={c} className="px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div className="p-6 max-w-lg">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm font-bold text-[#181a2b] mb-1">Persona Name</p>
                  <input
                    defaultValue={persona.name}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-3">Danger Zone</p>
                  <button className="w-full flex items-center justify-center gap-2 border border-rose-200 text-rose-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-rose-50 transition-colors">
                    <span className="material-symbols-rounded text-base">delete</span>
                    Delete Persona
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Intelligence Panel ────────────────────────────────────── */}
        <aside className="w-80 shrink-0 bg-[#f4f2ff] border-l border-indigo-50 flex flex-col overflow-y-auto p-6 gap-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Persona Intelligence
          </p>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            {/* Tone */}
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Tone</p>
              <p className="text-sm font-bold text-[#181a2b]">
                {profile.tone ?? 'Not analyzed'}
              </p>
              {profile.tone && (
                <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full brand-gradient rounded-full" style={{ width: '75%' }} />
                </div>
              )}
            </div>

            {/* Expertise index */}
            {(profile.expertise ?? []).length > 0 && (
              <div className="bg-fuchsia-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest mb-1">Expertise Index</p>
                <p className="text-sm font-bold text-[#181a2b]">{profile.expertise![0]}</p>
                <div className="mt-2 h-1.5 bg-fuchsia-100 rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </div>

          {/* Catchphrases */}
          {(profile.catchphrases ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Catchphrases</p>
              <div className="space-y-2">
                {profile.catchphrases!.slice(0, 4).map((phrase, i) => (
                  <div key={i} className="bg-white rounded-lg border-l-4 border-indigo-500 pl-3 py-2 pr-3 shadow-sm">
                    <p className="text-xs text-slate-600 italic">"{phrase}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 mt-auto">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Total sources</span>
              <span className="text-[#181a2b] font-bold">{sources.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Processed</span>
              <span className="text-emerald-600 font-bold">{doneCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Knowledge chunks</span>
              <span className="text-[#181a2b] font-bold">{persona.total_chunks}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Last updated</span>
              <span className="text-slate-500 font-medium">
                {new Date(persona.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </aside>
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
