import { Sidebar } from '@/components/sidebar/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">{children}</main>
    </div>
  )
}
