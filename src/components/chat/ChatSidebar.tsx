'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { Persona } from '@/app/chat/page'
import { TagSearchInput } from '@/components/ui/TagSearchInput'

const PERSONA_COLORS = [
  '#6366f1', '#10b981', '#ec4899', '#f97316',
  '#0ea5e9', '#d946ef', '#f59e0b', '#f43f5e',
]

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home',     icon: 'home' },
  { href: '/chat',      label: 'Chat',     icon: 'chat' },
  { href: '/personas',  label: 'Personas', icon: 'psychology' },
  { href: '/settings',  label: 'Settings', icon: 'settings' },
]

function getAllTags(personas: Persona[]) {
  const counts: Record<string, number> = {}
  for (const p of personas) {
    for (const tag of p.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
}

function normalizeTag(tag: string) {
  return tag.replace(/-/g, ' ').toLowerCase()
}

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  personas: Persona[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onImport: () => void
  activeTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function ChatSidebar({ personas, selectedIds, onToggle, onImport, activeTags, onTagsChange }: Props) {
  const allTags = useMemo(() => getAllTags(personas), [personas])

  const filtered = useMemo(() => {
    if (activeTags.length === 0) return personas
    return personas.filter((p) =>
      activeTags.every((t) => (p.tags ?? []).includes(t)),
    )
  }, [personas, activeTags])

  return (
    <aside className="w-72 h-full sidebar-bg flex flex-col shrink-0">
      {/* Brand */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
          <span
            className="material-symbols-rounded text-white text-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            psychology
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Persona AI</p>
          <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
            Pro Workspace
          </p>
        </div>
      </div>

      {/* Nav rail */}
      <nav className="px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              item.href === '/chat'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-slate-800/60" />

      {/* Tag search */}
      <div className="px-3 mb-3">
        <TagSearchInput
          allTags={allTags}
          selectedTags={activeTags}
          onTagsChange={onTagsChange}
          placeholder="Search by topic..."
          darkMode
        />
      </div>

      {/* Section label */}
      <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        {activeTags.length > 0
          ? `${filtered.length} matching persona${filtered.length !== 1 ? 's' : ''}`
          : 'My Personas'}
      </p>

      {/* Persona list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-slate-500 text-xs">
              {personas.length === 0
                ? 'No personas yet — import one!'
                : 'No results'}
            </p>
          </div>
        )}

        {filtered.map((persona, idx) => {
          const color = PERSONA_COLORS[idx % PERSONA_COLORS.length]
          const selected = selectedIds.includes(persona.id)
          const isReady = persona.status === 'ready'

          return (
            <button
              key={persona.id}
              onClick={() => isReady && onToggle(persona.id)}
              disabled={!isReady}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                selected
                  ? 'bg-indigo-600/10'
                  : 'hover:bg-slate-800/50'
              } ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={selected ? { borderRight: `2px solid ${color}` } : {}}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    background: color + '33',
                    outline: `2px solid ${color}80`,
                    outlineOffset: 1,
                  }}
                >
                  {persona.avatar_url ? (
                    <img
                      src={persona.avatar_url}
                      alt={persona.name}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    avatarInitials(persona.name)
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181a2b]"
                  style={{
                    backgroundColor: isReady ? color : persona.status === 'pending' ? '#94a3b8' : '#f59e0b',
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{persona.name}</p>
                <p className="text-slate-500 text-[10px] truncate mt-0.5">
                  {isReady
                    ? `${persona.total_chunks ?? 0} chunks`
                    : persona.status === 'pending'
                    ? 'Queued...'
                    : 'Processing...'}
                </p>
              </div>

              {/* Checkbox */}
              <span
                className="material-symbols-rounded text-lg shrink-0"
                style={{
                  color: selected ? color : '#334155',
                  fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {selected ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Footer buttons */}
      <div className="p-3 border-t border-slate-800/50 flex gap-2">
        <Link
          href="/personas"
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-300 text-xs font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-rounded text-sm">settings</span>
          Manage
        </Link>
        <button
          onClick={onImport}
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <span className="material-symbols-rounded text-sm">input</span>
          Import
        </button>
      </div>
    </aside>
  )
}
