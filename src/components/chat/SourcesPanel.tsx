'use client'

import { useEffect, useRef, useState } from 'react'
import type { SourceCard } from '@/app/chat/page'

interface Props {
  sources: SourceCard[]
  activeCitationIdx: number | null
  onCitationClick: (idx: number) => void
}

function timeAgo(date?: string) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function SourcesPanel({ sources, activeCitationIdx, onCitationClick }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Scroll to active card when citation is clicked
  useEffect(() => {
    if (activeCitationIdx !== null && cardRefs.current[activeCitationIdx]) {
      cardRefs.current[activeCitationIdx]!.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [activeCitationIdx])

  function toggleCollapse(idx: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <aside className="w-80 h-full bg-[#f4f2ff] border-l border-indigo-50 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#e0e1f7] shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#181a2b] text-sm">Sources</h2>
          <span className="material-symbols-rounded text-slate-400 text-lg cursor-pointer hover:text-slate-600">
            more_horiz
          </span>
        </div>
        {sources.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-tight text-slate-400 mt-0.5">
            {sources.length} chunk{sources.length > 1 ? 's' : ''} used
          </p>
        )}
      </div>

      {/* Source cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <span className="material-symbols-rounded text-slate-300 text-4xl mb-3">
              collections_bookmark
            </span>
            <p className="text-slate-400 text-xs font-medium">
              Sources will appear here
            </p>
            <p className="text-slate-300 text-xs mt-1">
              Send a message to see which chunks were used
            </p>
          </div>
        ) : (
          sources.map((src, idx) => {
            const isActive = activeCitationIdx === idx
            const isCollapsed = collapsed.has(idx)
            const wordCount = src.chunk_preview
              ? src.chunk_preview.split(/\s+/).length
              : 0

            return (
              <div
                key={src.chunk_id ?? idx}
                ref={(el) => { cardRefs.current[idx] = el }}
                onClick={() => onCitationClick(idx)}
                className="bg-white rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  border: isActive
                    ? `2px solid ${src.persona_color}80`
                    : '1px solid #e0e1f7',
                  boxShadow: isActive
                    ? `0 2px 8px ${src.persona_color}20`
                    : undefined,
                }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: src.persona_color }}
                    />
                    <span className="text-[11px] font-bold text-slate-600 truncate">
                      {src.persona_name}
                    </span>
                    <span
                      className="text-[11px] font-bold shrink-0"
                      style={{ color: src.persona_color }}
                    >
                      [{src.citation_index}]
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(idx) }}
                    className="shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-rounded text-sm">
                      {isCollapsed ? 'expand_more' : 'expand_less'}
                    </span>
                  </button>
                </div>

                {/* Video title */}
                <p className="text-xs font-bold text-[#181a2b] truncate mb-1.5">
                  {src.video_title || 'Untitled Video'}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                    <span className="material-symbols-rounded text-[11px]">description</span>
                    {wordCount} words
                  </span>
                  {src.video_id && (
                    <a
                      href={`https://youtube.com/watch?v=${src.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase hover:text-indigo-500 transition-colors"
                    >
                      <span className="material-symbols-rounded text-[11px]">play_circle</span>
                      Watch
                    </a>
                  )}
                </div>

                {/* Chunk preview */}
                {!isCollapsed && src.chunk_preview && (
                  <div className="bg-[#f4f2ff] rounded-lg p-3">
                    <p className="text-[11px] italic text-slate-500 leading-relaxed line-clamp-4">
                      "{src.chunk_preview}"
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Stats footer */}
      {sources.length > 0 && (
        <div className="shrink-0 px-4 py-3 bg-[#f4f2ff]/50 border-t border-[#e0e1f7]">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      sources[0]?.confidence > 0.8
                        ? '#10b981'
                        : sources[0]?.confidence > 0.5
                        ? '#f59e0b'
                        : '#f43f5e',
                  }}
                />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {sources[0]?.confidence?.toFixed(2) ?? '—'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Confidence
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {sources[0]?.confidence > 0.8 ? 'L1' : 'L2'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Layer
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {sources.length}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Chunks
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
