"use client"

import { cn } from "@/lib/utils/cn"
import {
  BarChart2,
  Camera,
  HeartPulse,
  Home,
  ListChecks,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/routines", label: "ルーティン", icon: ListChecks },
  { href: "/condition", label: "管理", icon: HeartPulse },
  { href: "/progress", label: "進捗", icon: BarChart2 },
  { href: "/photos", label: "写真", icon: Camera },
  { href: "/settings", label: "設定", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-bottom">
      <div className="flex items-stretch justify-around h-[72px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 px-1 transition-colors active:bg-surface-secondary",
                active ? "text-navy-500" : "text-gray-400"
              )}
            >
              <Icon size={26} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium leading-none">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
