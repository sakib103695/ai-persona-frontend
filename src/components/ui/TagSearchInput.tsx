'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  allTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  darkMode?: boolean
}

function normalizeTag(tag: string) {
  return tag.replace(/-/g, ' ').toLowerCase()
}

function tagMatchesQuery(tag: string, query: string) {
  const normalized = normalizeTag(tag)
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.every((w) => normalized.includes(w))
}

export function TagSearchInput({
  allTags,
  selectedTags,
  onTagsChange,
  placeholder = 'Search by topic or keyword...',
  darkMode = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = query.trim()
    ? allTags
        .filter((t) => !selectedTags.includes(t) && tagMatchesQuery(t, query))
        .slice(0, 8)
    : []

  function addTag(tag: string) {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag])
    }
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeTag(tag: string) {
    onTagsChange(selectedTags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !query && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1])
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault()
      addTag(suggestions[0])
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const chip = darkMode
    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'

  const inputBg = darkMode
    ? 'bg-slate-800/50 border-slate-700'
    : 'bg-white border-slate-200'

  const dropdownBg = darkMode
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200'

  const suggestionHover = darkMode
    ? 'hover:bg-slate-700 text-slate-200'
    : 'hover:bg-indigo-50 text-[#181a2b]'

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl border cursor-text transition-colors ${inputBg} ${
          open ? (darkMode ? 'border-indigo-500' : 'border-indigo-400') : ''
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips */}
        {selectedTags.map((tag) => (
          <span key={tag} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${chip}`}>
            {normalizeTag(tag)}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="opacity-60 hover:opacity-100 transition-opacity leading-none"
            >
              ×
            </button>
          </span>
        ))}

        {/* Search icon + input */}
        <span className={`material-symbols-rounded text-base shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          search
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : 'Add more...'}
          className={`flex-1 min-w-[80px] bg-transparent text-sm focus:outline-none ${
            darkMode ? 'text-white placeholder:text-slate-500' : 'text-[#181a2b] placeholder:text-slate-400'
          }`}
        />

        {/* Clear all */}
        {selectedTags.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onTagsChange([]); setQuery('') }}
            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            clear
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden ${dropdownBg}`}>
          {suggestions.map((tag) => (
            <button
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); addTag(tag) }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-2 ${suggestionHover}`}
            >
              <span className={`material-symbols-rounded text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>tag</span>
              {normalizeTag(tag)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
