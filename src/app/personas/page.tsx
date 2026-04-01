"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ImportModal } from "@/components/ui/ImportModal";
import { TagSearchInput } from "@/components/ui/TagSearchInput";

const PERSONA_COLORS = [
  "#6366f1", "#10b981", "#ec4899", "#f97316",
  "#0ea5e9", "#d946ef", "#f59e0b", "#f43f5e",
];

interface Persona {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  tags: string[];
  status: string;
  total_chunks: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ready: { label: "Ready", dot: "#10b981", text: "text-emerald-600", bg: "bg-emerald-50" },
  pending: { label: "Queued", dot: "#94a3b8", text: "text-slate-500", bg: "bg-slate-100" },
  processing: { label: "Processing", dot: "#f59e0b", text: "text-amber-600", bg: "bg-amber-50" },
  failed: { label: "Failed", dot: "#f43f5e", text: "text-rose-600", bg: "bg-rose-50" },
};

function avatarInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type SortKey = "newest" | "chunks" | "name";

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/personas")
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => { setPersonas(data); setLoading(false); setError(false); })
        .catch(() => { setLoading(false); setError(true); });
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, []);

  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    personas.forEach((p) => (p.tags ?? []).forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [personas]);

  const filtered = useMemo(() => {
    let list = personas;
    if (activeTags.length > 0) {
      list = list.filter((p) =>
        activeTags.every((t) => (p.tags ?? []).includes(t))
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "chunks") return b.total_chunks - a.total_chunks;
      return a.name.localeCompare(b.name);
    });
  }, [personas, activeTags, sort]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true)
    try {
      const ids = [...selected]
      const url = ids.length > 0
        ? `/api/personas/export?ids=${ids.join(',')}`
        : '/api/personas/export'
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `persona-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const res = await fetch('/api/personas/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await res.json()
        alert(`Imported ${result.personas} personas, ${result.sources} sources, ${result.chunks} chunks`)
        window.location.reload()
      } catch (e: any) {
        alert(`Import failed: ${e.message}`)
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} persona${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      for (const id of selected) {
        await fetch(`/api/personas/${id}`, { method: 'DELETE' })
      }
      setPersonas((prev) => prev.filter((p) => !selected.has(p.id)))
      setSelected(new Set())
      setSelectAll(false)
    } finally {
      setDeleting(false)
    }
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
      setSelectAll(true);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-auto bg-[#f4f2ff]">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#181a2b]">Personas</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {personas.length} persona{personas.length !== 1 ? "s" : ""} in your library
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="px-3 py-2 bg-[#f4f2ff] rounded-xl text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="chunks">Most Chunks</option>
                <option value="name">Name A–Z</option>
              </select>
              <button
                onClick={handleExport}
                disabled={selected.size === 0 || exporting}
                title={selected.size === 0 ? 'Select personas to export' : `Export ${selected.size} selected`}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span className={`material-symbols-rounded text-base ${exporting ? 'animate-spin' : ''}`}>
                  {exporting ? 'sync' : 'download'}
                </span>
                {exporting ? 'Exporting...' : `Export${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                title="Import data from file"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-rounded text-base">{importing ? 'sync' : 'upload'}</span>
                Import
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
              >
                <span className="material-symbols-rounded text-base">add</span>
                New
              </button>
            </div>
          </div>

          {/* Tag search */}
          <div className="mt-3">
            <TagSearchInput
              allTags={allTags}
              selectedTags={activeTags}
              onTagsChange={setActiveTags}
              placeholder="Filter by topic or keyword..."
            />
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-6">
              <span className="material-symbols-rounded text-rose-500 text-base">error</span>
              <p className="text-rose-700 text-sm font-medium flex-1">Failed to load personas.</p>
              <button onClick={() => window.location.reload()} className="text-xs font-bold text-rose-600 hover:text-rose-800 underline">
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 h-32 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-rounded text-indigo-400 text-3xl">
                  {personas.length === 0 ? "person_search" : "search_off"}
                </span>
              </div>
              <h2 className="text-[#181a2b] font-bold text-xl mb-2">
                {personas.length === 0 ? "No personas yet" : "No results found"}
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mb-6">
                {personas.length === 0
                  ? "Import a YouTube channel to create your first AI persona."
                  : "Try different keywords or clear your filters."}
              </p>
              {personas.length === 0 && (
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-rounded text-base">cloud_download</span>
                  Import First Persona
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Select All row */}
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-400">
                    {selected.size > 0
                      ? `${selected.size} selected`
                      : `Select all (${filtered.length})`}
                  </span>
                </label>
                {selected.size > 0 && (
                  <>
                    <button
                      onClick={() => { setSelected(new Set()); setSelectAll(false); }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear selection
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={deleting}
                      className="flex items-center gap-1 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-rounded text-sm">delete</span>
                      {deleting ? 'Deleting...' : `Delete ${selected.size}`}
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((persona, idx) => {
                  const color = PERSONA_COLORS[idx % PERSONA_COLORS.length];
                  const st = STATUS_CONFIG[persona.status] ?? STATUS_CONFIG.pending;
                  const isSelected = selected.has(persona.id);

                  return (
                    <div
                      key={persona.id}
                      className={`bg-white rounded-2xl p-5 shadow-sm transition-shadow group border ${
                        isSelected ? "border-indigo-400 shadow-md" : "border-transparent hover:border-indigo-100 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(persona.id)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer mt-0.5 shrink-0"
                        />
                        <Link href={`/personas/${persona.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: color + "22", color, outline: `2px solid ${color}40`, outlineOffset: 1 }}
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
                              {persona.total_chunks > 0 ? `${persona.total_chunks.toLocaleString()} chunks` : "No chunks yet"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                            {st.label}
                          </span>
                        </Link>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 ml-7">
                        <span className="text-[10px] text-slate-400">
                          Added {new Date(persona.created_at).toLocaleDateString()}
                        </span>
                        <Link href={`/personas/${persona.id}`}>
                          <span className="material-symbols-rounded text-slate-300 text-base group-hover:text-indigo-400 transition-colors">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
