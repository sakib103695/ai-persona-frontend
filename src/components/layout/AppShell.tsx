'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChatPage = pathname.startsWith('/chat')

  if (isChatPage) {
    return <div className="h-screen">{children}</div>
  }

  return (
    <>
      <Sidebar />
      <div className="ml-64 h-screen flex flex-col bg-[#f4f2ff]">{children}</div>
    </>
  )
}
