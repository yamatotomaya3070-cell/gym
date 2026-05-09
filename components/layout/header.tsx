import { cn } from "@/lib/utils/cn"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  title: string
  backHref?: string
  rightElement?: React.ReactNode
  className?: string
}

export function Header({ title, backHref, rightElement, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-surface border-b border-border",
        "flex items-center h-14 px-4 gap-2",
        className
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-surface-secondary -ml-1"
        >
          <ChevronLeft size={22} />
        </Link>
      )}
      <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
        {title}
      </h1>
      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </header>
  )
}
