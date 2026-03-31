"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImportModal } from "@/components/ui/ImportModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  tags: string[];
  status: string;
  total_chunks: number;
  persona_profile: PersonaProfile;
  created_at: string;
  updated_at: string;
}

interface PersonaProfile {
  tone?: string;
  expertise?: string[];
  speaking_style?: string;
  key_opinions?: string[];
  topics_to_avoid?: string[];
  catchphrases?: string[];
  tags?: string[];
}

interface Source {
  id: string;
  video_id: string;
  title: string;
  word_count: number;
  status: string;
  caption_type: string;
  created_at: string;
  error?: string;
}

type Tab = "sources" | "profile" | "settings";
type SourceFilter = "all" | "done" | "failed" | "processing";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; textClass: string; bgClass: string }
> = {
  done: { label: "Done", dot: "#10b981", textClass: "text-emerald-600", bgClass: "bg-emerald-50" },
  embedded: { label: "Done", dot: "#10b981", textClass: "text-emerald-600", bgClass: "bg-emerald-50" },
  transcribed: { label: "Transcribed", dot: "#6366f1", textClass: "text-indigo-600", bgClass: "bg-indigo-50" },
  processing: { label: "Processing", dot: "#f59e0b", textClass: "text-amber-600", bgClass: "bg-amber-50" },
  queued: { label: "Queued", dot: "#94a3b8", textClass: "text-slate-500", bgClass: "bg-slate-100" },
  failed: { label: "Failed", dot: "#f43f5e", textClass: "text-rose-600", bgClass: "bg-rose-50" },
};

function avatarInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [persona, setPersona] = useState<Persona | null>(null);
  // Paginated sources state
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesTotal, setSourcesTotal] = useState(0);
  const [sourcesTotalPages, setSourcesTotalPages] = useState(1);
  const [sourcesPage, setSourcesPage] = useState(1);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [filterCounts, setFilterCounts] = useState<Record<SourceFilter, number>>({ all: 0, done: 0, failed: 0, processing: 0 });
  const PAGE_SIZE = 50;

  const [tab, setTab] = useState<Tab>("sources");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  // Selection is global across all pages
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Bulk action state
  const [bulkLoading, setBulkLoading] = useState(false);

  // Confirm dialogs
  const [showDeletePersona, setShowDeletePersona] = useState(false);
  const [showDeleteSources, setShowDeleteSources] = useState(false);
  const [deletingPersona, setDeletingPersona] = useState(false);
  const [cancellingImport, setCancellingImport] = useState(false);

  // Rebuild / regenerate state
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState("");

  // Progress modal
  const [showProgress, setShowProgress] = useState(false);

  // Per-row action loading (source id → loading)
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPersona = async () => {
    try {
      const p = await fetch(`/api/personas/${id}`).then((r) => r.json());
      setPersona(p);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const loadSources = async (page: number, filter: SourceFilter) => {
    setSourcesLoading(true);
    try {
      const data = await fetch(
        `/api/sources?persona_id=${id}&page=${page}&limit=${PAGE_SIZE}&filter=${filter}`
      ).then((r) => r.json());
      setSources(data.items ?? []);
      setSourcesTotal(data.total ?? 0);
      setSourcesTotalPages(data.total_pages ?? 1);
      setFilterCounts(data.counts ?? { all: 0, done: 0, failed: 0, processing: 0 });
    } catch {}
    setSourcesLoading(false);
  };

  // loadData used by poll (refreshes persona + current page sources)
  const loadData = async () => {
    await Promise.all([loadPersona(), loadSources(sourcesPage, sourceFilter)]);
  };

  useEffect(() => {
    loadPersona();
  }, [id]);

  useEffect(() => {
    loadSources(sourcesPage, sourceFilter);
  }, [id, sourcesPage, sourceFilter]);

  // Sync settings form with persona data
  useEffect(() => {
    if (persona) {
      setEditName(persona.name);
      setEditBio(persona.bio ?? "");
      setEditAvatarUrl(persona.avatar_url ?? "");
      setEditTags(persona.tags ?? []);
    }
  }, [persona?.id]);

  // Poll while processing
  useEffect(() => {
    if (!persona) return;
    if (persona.status === "processing") {
      if (!pollRef.current) {
        pollRef.current = setInterval(loadData, 3000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [persona?.status]);

  // ── Sources helpers ───────────────────────────────────────────────────────

  function toggleSource(sourceId: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      next.has(sourceId) ? next.delete(sourceId) : next.add(sourceId);
      return next;
    });
  }

  // "Select all" on current page — deselects current page if all already selected
  function toggleAll() {
    const pageIds = sources.map((s) => s.id);
    const allPageSelected = pageIds.every((id) => selectedSourceIds.has(id));
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function changeFilter(f: SourceFilter) {
    setSourceFilter(f);
    setSourcesPage(1);
    // Don't clear selectedSourceIds — keep global selection
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  async function handleBulkDownload() {
    const ids = Array.from(selectedSourceIds)
    const res = await fetch('/api/sources/download-transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_ids: ids }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcripts.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBulkReprocess() {
    setBulkLoading(true);
    try {
      await fetch("/api/sources/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ids: Array.from(selectedSourceIds) }),
      });
      setSelectedSourceIds(new Set());
      await loadSources(sourcesPage, sourceFilter);
    } catch {}
    finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ids: Array.from(selectedSourceIds) }),
      });
      setSelectedSourceIds(new Set());
      setShowDeleteSources(false);
      await loadSources(sourcesPage, sourceFilter);
    } catch {}
    finally {
      setBulkLoading(false);
    }
  }

  // ── Settings actions ──────────────────────────────────────────────────────

  async function handleSaveSettings() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/personas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          bio: editBio || null,
          avatar_url: editAvatarUrl || null,
          tags: editTags,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setPersona((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveMsg("Saved successfully");
    } catch {
      setSaveMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (clean && !editTags.includes(clean)) {
      setEditTags((prev) => [...prev, clean]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleRowReprocess(sourceId: string) {
    setRowLoading((prev) => ({ ...prev, [sourceId]: true }));
    try {
      await fetch("/api/sources/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ids: [sourceId] }),
      });
      await loadSources(sourcesPage, sourceFilter);
    } catch {}
    setRowLoading((prev) => ({ ...prev, [sourceId]: false }));
  }

  async function handleRowDelete(sourceId: string) {
    setRowLoading((prev) => ({ ...prev, [sourceId]: true }));
    try {
      await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ids: [sourceId] }),
      });
      setSelectedSourceIds((prev) => { const n = new Set(prev); n.delete(sourceId); return n; });
      await loadSources(sourcesPage, sourceFilter);
    } catch {}
    setRowLoading((prev) => ({ ...prev, [sourceId]: false }));
  }

  async function handleRebuildKnowledge() {
    setRebuildLoading(true);
    setRebuildMsg("");
    try {
      const res = await fetch(`/api/sources/rebuild/${id}`, { method: "POST" });
      const data = await res.json();
      setRebuildMsg(`Queued ${data.queued} sources for re-processing.`);
      await Promise.all([loadPersona(), loadSources(sourcesPage, sourceFilter)]);
    } catch {
      setRebuildMsg("Failed to start rebuild.");
    } finally {
      setRebuildLoading(false);
    }
  }

  async function handleRegenerateProfile() {
    setRebuildLoading(true);
    setRebuildMsg("");
    try {
      // Re-queue persona-profile job via a dedicated endpoint
      // We'll re-use rebuild as a simpler approach: trigger profile regeneration
      await fetch(`/api/sources/rebuild/${id}`, { method: "POST" });
      setRebuildMsg("Profile regeneration queued.");
      await loadData();
    } catch {
      setRebuildMsg("Failed to queue regeneration.");
    } finally {
      setRebuildLoading(false);
    }
  }

  async function handleCancelImport() {
    setCancellingImport(true);
    try {
      await fetch(`/api/sources/cancel/${id}`, { method: "POST" });
      await Promise.all([loadPersona(), loadSources(sourcesPage, sourceFilter)]);
    } catch {}
    setCancellingImport(false);
  }

  async function handleDeletePersona() {
    setDeletingPersona(true);
    try {
      // Drain queued jobs before deleting so workers don't process a ghost persona
      await fetch(`/api/sources/cancel/${id}`, { method: "POST" }).catch(() => {});
      await fetch(`/api/personas/${id}`, { method: "DELETE" });
      router.push("/personas");
    } catch {
      setDeletingPersona(false);
      setShowDeletePersona(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading persona...</p>
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#181a2b] font-bold text-lg">Persona not found</p>
          <Link href="/personas" className="text-indigo-600 text-sm mt-2 block">
            ← Back to Personas
          </Link>
        </div>
      </div>
    );
  }

  const profile: PersonaProfile = persona.persona_profile ?? {};
  // processedCount derived from server-provided counts
  const processedCount = filterCounts.done + filterCounts.processing;

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 flex overflow-hidden">
        {/* ── Management Center ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Breadcrumb */}
          <div className="px-8 pt-5 pb-0 shrink-0">
            <Link
              href="/personas"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors w-fit"
            >
              <span className="material-symbols-rounded text-sm">arrow_back</span>
              All Personas
            </Link>
          </div>

          {/* Persona header */}
          <div className="px-8 py-5 flex items-start gap-5 border-b border-slate-100 shrink-0">
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
                {persona.status === "ready" && (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase rounded-full">
                    Ready
                  </span>
                )}
                {persona.status === "processing" && (
                  <>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                      <span className="material-symbols-rounded text-[11px] animate-spin">sync</span>
                      Processing
                    </span>
                    <button
                      onClick={handleCancelImport}
                      disabled={cancellingImport}
                      className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded-full hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-rounded text-[11px]">stop_circle</span>
                      {cancellingImport ? "Stopping..." : "Stop Import"}
                    </button>
                  </>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {profile.tone ?? persona.slug} · {filterCounts.all} videos · {persona.total_chunks.toLocaleString()} chunks
              </p>
              {persona.bio && <p className="text-slate-400 text-xs mt-1 max-w-lg">{persona.bio}</p>}
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
            {(["sources", "profile", "settings"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { sources: "Sources", profile: "Intelligence", settings: "Settings" };
              const icons: Record<Tab, string> = { sources: "video_library", profile: "psychology", settings: "tune" };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{icons[t]}</span>
                  {labels[t]}
                  {t === "sources" && filterCounts.all > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {filterCounts.all}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Sources Tab ── */}
            {tab === "sources" && (
              <div className="p-6">
                {/* Import running banner */}
                {persona.status === "processing" && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                    <span className="material-symbols-rounded text-amber-500 text-base animate-spin" style={{ animationDuration: '2s' }}>sync</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800">Import running on server</p>
                      <p className="text-xs text-amber-600 mt-0.5">Workers continue even if you close or refresh this page.</p>
                    </div>
                    <button
                      onClick={() => setShowProgress(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <span className="material-symbols-rounded text-sm">bar_chart</span>
                      View Progress
                    </button>
                    <button
                      onClick={handleCancelImport}
                      disabled={cancellingImport}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors border border-rose-200 disabled:opacity-50"
                    >
                      <span className="material-symbols-rounded text-sm">stop_circle</span>
                      {cancellingImport ? "Stopping..." : "Stop"}
                    </button>
                  </div>
                )}

                {/* Rechunk alert — transcribed videos but no chunks yet */}
                {persona.total_chunks === 0 && filterCounts.processing > 0 && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4">
                    <span className="material-symbols-rounded text-indigo-500 text-base">hub</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-800">
                        {filterCounts.processing} videos transcribed but not yet embedded
                      </p>
                      <p className="text-xs text-indigo-600 mt-0.5">Click Rechunk to add them to the knowledge base so you can chat with them.</p>
                    </div>
                    <button
                      onClick={handleRebuildKnowledge}
                      disabled={rebuildLoading}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <span className={`material-symbols-rounded text-sm ${rebuildLoading ? "animate-spin" : ""}`}>restart_alt</span>
                      {rebuildLoading ? "Queuing..." : "Rechunk All"}
                    </button>
                  </div>
                )}

                {/* Bulk action bar */}
                {selectedSourceIds.size > 0 && (
                  <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#181a2b] text-white px-4 py-3 rounded-xl mb-4 shadow-lg">
                    <span className="text-sm font-semibold">{selectedSourceIds.size} selected</span>
                    <div className="flex-1" />
                    <Link
                      href={`/chat?persona=${id}&sources=${Array.from(selectedSourceIds).join(',')}`}
                      className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-rounded text-sm">chat</span>
                      Chat with selected
                    </Link>
                    <button
                      onClick={handleBulkDownload}
                      className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-rounded text-sm">download</span>
                      Download
                    </button>
                    <button
                      onClick={handleBulkReprocess}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-rounded text-sm">refresh</span>
                      Re-process
                    </button>
                    <button
                      onClick={() => setShowDeleteSources(true)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-rounded text-sm">delete</span>
                      Delete
                    </button>
                    <button onClick={() => setSelectedSourceIds(new Set())} className="text-slate-400 hover:text-white">
                      <span className="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                )}

                {/* Filter row */}
                <div className="flex items-center gap-2 mb-4">
                  {(["all", "done", "processing", "failed"] as SourceFilter[]).map((f) => {
                    const labels: Record<SourceFilter, string> = { all: "All Videos", done: "Done", processing: "In Progress", failed: "Failed" };
                    return (
                      <button
                        key={f}
                        onClick={() => changeFilter(f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          sourceFilter === f
                            ? "bg-indigo-600 text-white"
                            : "bg-[#f4f2ff] text-indigo-600 hover:bg-[#e0e1f7]"
                        }`}
                      >
                        {labels[f]}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sourceFilter === f ? "bg-white/20" : "bg-indigo-100"}`}>
                          {filterCounts[f]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-4 mb-2">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={sources.length > 0 && sources.every((s) => selectedSourceIds.has(s.id))}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="col-span-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Title</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</div>
                  <div className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Words</div>
                  <div className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Date</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</div>
                </div>

                {/* Source rows */}
                <div className={`space-y-2 relative transition-opacity ${sourcesLoading ? "opacity-50 pointer-events-none" : ""}`}>
                  {sourcesLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {sources.length === 0 && !sourcesLoading ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-rounded text-slate-200 text-4xl block mb-3">video_library</span>
                      <p className="text-slate-400 text-sm">No sources match this filter</p>
                    </div>
                  ) : (
                    sources.map((source) => {
                      const st = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.queued;
                      const isSelected = selectedSourceIds.has(source.id);
                      return (
                        <div
                          key={source.id}
                          className={`grid grid-cols-12 gap-4 items-center bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow border ${isSelected ? "border-indigo-200" : "border-transparent"}`}
                        >
                          <div className="col-span-1">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSource(source.id)} className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" />
                          </div>
                          <div className="col-span-5 flex items-center gap-3 min-w-0">
                            <a
                              href={`https://youtube.com/watch?v=${source.video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-14 h-10 bg-slate-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity"
                              title="Watch on YouTube"
                            >
                              {source.video_id ? (
                                <img src={`https://i.ytimg.com/vi/${source.video_id}/default.jpg`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-rounded text-slate-400 text-base">play_circle</span>
                              )}
                            </a>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#181a2b] truncate">{source.title || `Video ${source.video_id}`}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{source.caption_type ?? "auto-generated"}</p>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bgClass} ${st.textClass}`}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                              {st.label}
                            </span>
                            {source.status === "failed" && source.error && (
                              <p className="text-[10px] text-rose-400 mt-0.5 truncate" title={source.error}>{source.error}</p>
                            )}
                          </div>
                          <div className="col-span-1 text-xs text-slate-500 font-medium text-right">
                            {source.word_count > 0 ? source.word_count.toLocaleString() : "—"}
                          </div>
                          <div className="col-span-1 text-[10px] text-slate-400 text-right">
                            {new Date(source.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            {["transcribed", "done", "embedded"].includes(source.status) && (
                              <a
                                href={`/api/sources/${source.id}/transcript`}
                                download
                                title="Download transcript"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <span className="material-symbols-rounded text-base">download</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleRowReprocess(source.id)}
                              disabled={rowLoading[source.id]}
                              title="Re-process this video"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
                            >
                              <span className={`material-symbols-rounded text-base ${rowLoading[source.id] ? "animate-spin" : ""}`}>
                                {rowLoading[source.id] ? "sync" : "refresh"}
                              </span>
                            </button>
                            <button
                              onClick={() => handleRowDelete(source.id)}
                              disabled={rowLoading[source.id]}
                              title="Delete this video"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40"
                            >
                              <span className="material-symbols-rounded text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {sourcesTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 pb-2">
                    <p className="text-xs text-slate-400">
                      Showing {(sourcesPage - 1) * PAGE_SIZE + 1}–{Math.min(sourcesPage * PAGE_SIZE, sourcesTotal)} of {sourcesTotal}
                      {selectedSourceIds.size > 0 && (
                        <span className="ml-2 text-indigo-600 font-semibold">· {selectedSourceIds.size} selected across all pages</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSourcesPage(1)}
                        disabled={sourcesPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                        title="First page"
                      >
                        <span className="material-symbols-rounded text-base">first_page</span>
                      </button>
                      <button
                        onClick={() => setSourcesPage((p) => Math.max(1, p - 1))}
                        disabled={sourcesPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                      >
                        <span className="material-symbols-rounded text-base">chevron_left</span>
                      </button>
                      {/* Page number pills */}
                      {Array.from({ length: Math.min(5, sourcesTotalPages) }, (_, i) => {
                        const mid = Math.min(Math.max(sourcesPage, 3), sourcesTotalPages - 2);
                        const page = sourcesTotalPages <= 5 ? i + 1 : mid - 2 + i;
                        if (page < 1 || page > sourcesTotalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setSourcesPage(page)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                              page === sourcesPage ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-500"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setSourcesPage((p) => Math.min(sourcesTotalPages, p + 1))}
                        disabled={sourcesPage === sourcesTotalPages}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                      >
                        <span className="material-symbols-rounded text-base">chevron_right</span>
                      </button>
                      <button
                        onClick={() => setSourcesPage(sourcesTotalPages)}
                        disabled={sourcesPage === sourcesTotalPages}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                        title="Last page"
                      >
                        <span className="material-symbols-rounded text-base">last_page</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Profile Tab ── */}
            {tab === "profile" && (
              <div className="p-6 space-y-6 max-w-2xl">
                {!profile.tone && !profile.expertise ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-rounded text-slate-200 text-4xl block mb-3">psychology</span>
                    <p className="text-slate-400 text-sm">Profile not generated yet</p>
                    <p className="text-slate-300 text-xs mt-1">Import videos and wait for processing to complete</p>
                  </div>
                ) : (
                  <>
                    {profile.tone && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Tone Analysis</p>
                        <div className="bg-indigo-50 rounded-xl p-4">
                          <p className="text-sm font-bold text-[#181a2b]">{profile.tone}</p>
                          {profile.speaking_style && <p className="text-xs text-slate-500 mt-1">{profile.speaking_style}</p>}
                        </div>
                      </div>
                    )}
                    {(profile.expertise ?? []).length > 0 && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-500 mb-3">Expertise</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.expertise!.map((e) => (
                            <span key={e} className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 rounded-full text-xs font-semibold">{e}</span>
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
                            <span key={c} className="px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-medium border border-slate-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Settings Tab ── */}
            {tab === "settings" && (
              <div className="p-6 max-w-lg space-y-5">
                {/* Core settings card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-sm font-bold text-[#181a2b]">Persona Details</h3>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Bio / Description</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      placeholder="Brief description of this persona..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#181a2b] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Avatar URL</label>
                    <input
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editTags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="text-indigo-400 hover:text-indigo-700 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                        placeholder="Add tag and press Enter"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <button onClick={() => addTag(tagInput)} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {saveMsg && (
                      <p className={`text-xs font-medium ${saveMsg.includes("Failed") ? "text-rose-500" : "text-emerald-600"}`}>
                        {saveMsg}
                      </p>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 brand-gradient text-white text-sm font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {saving ? (
                          <><span className="material-symbols-rounded text-base animate-spin">sync</span> Saving...</>
                        ) : (
                          <><span className="material-symbols-rounded text-base">save</span> Save Changes</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Knowledge management */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
                  <h3 className="text-sm font-bold text-[#181a2b]">Knowledge Management</h3>

                  {rebuildMsg && (
                    <p className={`text-xs font-medium px-3 py-2 rounded-lg ${rebuildMsg.includes("Failed") ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                      {rebuildMsg}
                    </p>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#181a2b]">Rebuild Knowledge</p>
                      <p className="text-xs text-slate-400 mt-0.5">Re-chunk all transcripts with the latest pipeline. Improves quality on existing data.</p>
                    </div>
                    <button
                      onClick={handleRebuildKnowledge}
                      disabled={rebuildLoading}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      <span className={`material-symbols-rounded text-sm ${rebuildLoading ? "animate-spin" : ""}`}>restart_alt</span>
                      Rebuild
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-4">Danger Zone</p>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#181a2b]">Delete Persona</p>
                      <p className="text-xs text-slate-400 mt-0.5">Permanently deletes this persona, all videos, and all knowledge chunks.</p>
                    </div>
                    <button
                      onClick={() => setShowDeletePersona(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <span className="material-symbols-rounded text-sm">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Intelligence Panel ────────────────────────────────────── */}
        <aside className="w-72 shrink-0 bg-[#f4f2ff] border-l border-indigo-50 flex flex-col overflow-y-auto p-5 gap-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Persona Intelligence
          </p>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Tone</p>
              <p className="text-sm font-bold text-[#181a2b]">{profile.tone ?? "Not analyzed"}</p>
              {profile.tone && (
                <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full brand-gradient rounded-full" style={{ width: "75%" }} />
                </div>
              )}
            </div>
            {(profile.expertise ?? []).length > 0 && (
              <div className="bg-fuchsia-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest mb-1">Top Expertise</p>
                <p className="text-sm font-bold text-[#181a2b]">{profile.expertise![0]}</p>
                <div className="mt-2 h-1.5 bg-fuchsia-100 rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: "60%" }} />
                </div>
              </div>
            )}
          </div>

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

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 mt-auto">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Total sources</span>
              <span className="text-[#181a2b] font-bold">{filterCounts.all}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Processed</span>
              <span className="text-emerald-600 font-bold">{processedCount}</span>
            </div>
            {filterCounts.failed > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Failed</span>
                <span className="text-rose-500 font-bold">{filterCounts.failed}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Knowledge chunks</span>
              <span className="text-[#181a2b] font-bold">{persona.total_chunks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Last updated</span>
              <span className="text-slate-500 font-medium">{new Date(persona.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </aside>
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showProgress && <ImportModal viewPersonaId={id} onClose={() => setShowProgress(false)} />}

      {showDeletePersona && (
        <ConfirmDialog
          title="Delete Persona"
          description={`This will permanently delete "${persona.name}", all ${filterCounts.all} videos, and all ${persona.total_chunks} knowledge chunks. This cannot be undone.`}
          confirmLabel={deletingPersona ? "Deleting..." : "Delete Persona"}
          confirmText={persona.name}
          danger
          onConfirm={handleDeletePersona}
          onCancel={() => setShowDeletePersona(false)}
        />
      )}

      {showDeleteSources && (
        <ConfirmDialog
          title="Delete Sources"
          description={`Delete ${selectedSourceIds.size} selected video${selectedSourceIds.size !== 1 ? "s" : ""} and their knowledge chunks? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteSources(false)}
        />
      )}
    </div>
  );
}
