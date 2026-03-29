import { ImportModalTrigger } from '@/components/ui/ImportModalTrigger'

export default function DashboardPage() {
  return (
    <div className="flex h-full">
      {/* Center canvas */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Text section — 7 cols */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 bg-[#e0e1f7] text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1">
                <span className="material-symbols-rounded text-[11px]">bolt</span>
                Initial Setup
              </span>

              {/* Headline */}
              <h1 className="text-[2.75rem] font-black leading-[1.1] text-[#181a2b]">
                Train AI on your{' '}
                <em className="text-indigo-600 not-italic">favorite experts.</em>
              </h1>

              {/* Subhead */}
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Paste YouTube channel URLs and instantly create AI personas that think,
                speak, and reason like the people you follow.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f4f2ff] rounded-xl p-4 border-l-4 border-indigo-500">
                  <span className="material-symbols-rounded text-indigo-500 text-xl">
                    person_add
                  </span>
                  <p className="text-[#181a2b] font-bold text-sm mt-2">Select Personas</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Pick one or more experts as your knowledge source
                  </p>
                </div>
                <div className="bg-[#f4f2ff] rounded-xl p-4 border-l-4 border-purple-500">
                  <span className="material-symbols-rounded text-purple-500 text-xl">
                    cloud_upload
                  </span>
                  <p className="text-[#181a2b] font-bold text-sm mt-2">Import Data</p>
                  <p className="text-slate-500 text-xs mt-1">
                    We extract every transcript automatically
                  </p>
                </div>
              </div>

              {/* CTA row */}
              <div className="flex items-center gap-3">
                <ImportModalTrigger />
                <button className="text-indigo-600 font-semibold text-sm hover:bg-indigo-50 px-4 py-2.5 rounded-xl transition-colors">
                  View Tutorials
                </button>
              </div>
            </div>

            {/* Visual bento — 5 cols */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Spanning top card */}
              <div className="col-span-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 h-32 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <span className="material-symbols-rounded text-indigo-600 text-xl">
                      hub
                    </span>
                  </div>
                  <p className="text-[#181a2b] font-bold text-sm">Knowledge Core</p>
                </div>
              </div>

              {/* Square cards */}
              <div className="bg-emerald-50 rounded-2xl p-4 h-28 flex flex-col justify-between">
                <span className="material-symbols-rounded text-emerald-500 text-xl">
                  science
                </span>
                <p className="text-[#181a2b] font-bold text-xs">Research AI</p>
              </div>
              <div className="bg-pink-50 rounded-2xl p-4 h-28 flex flex-col justify-between">
                <span className="material-symbols-rounded text-pink-500 text-xl">
                  edit_note
                </span>
                <p className="text-[#181a2b] font-bold text-xs">Editorial AI</p>
              </div>
            </div>
          </div>

          {/* Disabled chat input */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 opacity-50 cursor-not-allowed">
              <span className="material-symbols-rounded text-slate-400 text-xl">lock</span>
              <p className="text-slate-400 text-sm flex-1">
                Select a persona to start chatting...
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Claude Sonnet
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                End-to-end Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="w-72 bg-[#f4f2ff] border-l border-indigo-50 p-5 hidden xl:flex flex-col gap-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Persona Library
        </p>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-3xl p-6 text-center">
          <span className="material-symbols-rounded text-indigo-300 text-4xl mb-3">
            person_search
          </span>
          <p className="text-slate-500 text-sm font-medium">No personas yet</p>
          <p className="text-slate-400 text-xs mt-1">
            Import a YouTube channel to get started
          </p>
          <ImportModalTrigger variant="ghost" className="mt-4" />
        </div>

        {/* User card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="material-symbols-rounded text-indigo-600 text-base">
                person
              </span>
            </div>
            <div>
              <p className="text-[#181a2b] font-semibold text-sm">User</p>
              <p className="text-indigo-500 text-[10px] font-bold uppercase">
                Pro Plan Active
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
