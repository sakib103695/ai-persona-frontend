export const dynamic = 'force-dynamic'

// Chat page owns its full 3-panel layout — no shared sidebar wrapper here
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full overflow-hidden bg-white">{children}</div>
}
