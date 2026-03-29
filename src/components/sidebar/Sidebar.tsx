'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/chat', label: 'Research', icon: 'search' },
  { href: '/personas', label: 'Personas', icon: 'psychology' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 sidebar-bg flex flex-col z-40">
      {/* Brand header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
          <span className="material-symbols-rounded text-white text-lg font-black">psychology</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Persona AI</p>
          <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
            Pro Workspace
          </p>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full brand-gradient text-white font-bold text-sm py-2.5 rounded-xl shadow-[0_4px_14px_rgba(70,72,212,0.4)] active:scale-95 transition-transform"
        >
          <span className="material-symbols-rounded text-base">add</span>
          New Chat
        </Link>
      </div>

      {/* Nav rail */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-rounded text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom user section */}
      <div className="p-3 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-indigo-400 text-sm">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">User</p>
            <p className="text-slate-500 text-[10px]">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
