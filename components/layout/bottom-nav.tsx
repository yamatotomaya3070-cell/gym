"use client"

import { cn } from "@/lib/utils/cn"
import {
  BarChart2,
  BookOpen,
  Camera,
  Home,
  ListChecks,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/routines", label: "ルーティン", icon: ListChecks },
  { href: "/exercises", label: "種目", icon: BookOpen },
  { href: "/progress", label: "進捗", icon: BarChart2 },
  { href: "/photos", label: "写真", icon: Camera },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0",
                active ? "text-navy-500" : "text-gray-400"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
        <Link
          href="/settings"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
            pathname === "/settings" ? "text-navy-500" : "text-gray-400"
          )}
        >
          <Settings size={22} strokeWidth={pathname === "/settings" ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">設定</span>
        </Link>
      </div>
    </nav>
  )
}
