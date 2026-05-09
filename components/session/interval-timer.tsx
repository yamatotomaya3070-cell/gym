"use client"

import { cn } from "@/lib/utils/cn"
import { useSessionStore } from "@/lib/store/session-store"
import { X } from "lucide-react"
import { useEffect, useState } from "react"

export function IntervalTimer() {
  const { timer, stopTimer } = useSessionStore()
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!timer.isActive || !timer.endTime) return
    const update = () => {
      const diff = Math.max(0, Math.ceil((timer.endTime! - Date.now()) / 1000))
      setRemaining(diff)
      if (diff === 0) {
        stopTimer()
        // バイブレーション
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200])
      }
    }
    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  }, [timer.isActive, timer.endTime, stopTimer])

  if (!timer.isActive || remaining === 0) return null

  const progress = remaining / timer.totalSeconds
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference * progress

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const isAlmostDone = remaining <= 10

  return (
    <div
      className={cn(
        "fixed top-[4.5rem] right-4 z-30",
        "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-card-hover border",
        "bg-surface border-border",
        isAlmostDone && "border-warning bg-amber-50"
      )}
    >
      {/* SVG circular progress */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="-rotate-90" width="48" height="48" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="#E8ECF4"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={isAlmostDone ? "#F59E0B" : "#1B3A6B"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-200"
          />
        </svg>
        <span
          className={cn(
            "absolute text-xs font-bold tabular-nums",
            isAlmostDone ? "text-warning" : "text-navy-500"
          )}
        >
          {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : seconds}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-xs text-gray-500">インターバル</span>
        <span className={cn("text-sm font-semibold", isAlmostDone ? "text-warning" : "text-gray-800")}>
          {isAlmostDone ? "もうすぐ終了!" : "休憩中..."}
        </span>
      </div>

      <button
        onClick={stopTimer}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-surface-secondary"
      >
        <X size={16} />
      </button>
    </div>
  )
}
