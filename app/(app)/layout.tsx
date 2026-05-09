import { BottomNav } from "@/components/layout/bottom-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-nav">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
