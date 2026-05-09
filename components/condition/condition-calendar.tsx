"use client"

import { cn } from "@/lib/utils/cn"

export interface DayFlags {
  recorded: boolean      // daily_condition_logs に行あり
  trained: boolean       // 当日 ended_at NOT NULL の sessions あり
  supps: boolean         // クレアチン + MACA + プロテイン>=1 すべて
  proteinGoal: boolean   // タンパク質合計 >= 120g
  hasMeal: boolean       // meal_logs 1件以上
}

interface Props {
  // YYYY-MM-DD → flags
  flagsByDate: Record<string, DayFlags>
  days?: number  // default 30
}

export function ConditionCalendar({ flagsByDate, days = 30 }: Props) {
  // 過去 days 日分（今日を含む）の日付配列を生成
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dates: Date[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d)
  }

  // 先頭の曜日に合わせてパディング（日曜=0スタート）
  const leadingPadding = dates[0].getDay()
  const cells: (Date | null)[] = [
    ...Array(leadingPadding).fill(null),
    ...dates,
  ]

  return (
    <div>
      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-gray-500 mb-3">
        <Legend dot="bg-navy-500" label="記録済み" />
        <Legend dot="bg-green-500" label="トレーニング" />
        <Legend dot="bg-yellow-500" label="サプリ達成" />
        <Legend dot="bg-orange-500" label="P目標達成" />
        <Legend dot="bg-gray-400" label="食事記録" />
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-[10px] text-center font-medium",
              i === 0 ? "text-danger" : i === 6 ? "text-navy-500" : "text-gray-400"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (!d) return <div key={`pad-${idx}`} />
          const key = toIsoDate(d)
          const f = flagsByDate[key]
          const isToday = isSameDay(d, today)
          return (
            <div
              key={key}
              className={cn(
                "aspect-square rounded-lg border flex flex-col items-center justify-between p-1",
                isToday
                  ? "border-navy-500 bg-navy-50"
                  : "border-border bg-surface"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  isToday ? "text-navy-500" : "text-gray-700"
                )}
              >
                {d.getDate()}
              </span>
              <div className="flex gap-0.5 flex-wrap justify-center">
                {f?.recorded && <Dot color="bg-navy-500" />}
                {f?.trained && <Dot color="bg-green-500" />}
                {f?.supps && <Dot color="bg-yellow-500" />}
                {f?.proteinGoal && <Dot color="bg-orange-500" />}
                {f?.hasMeal && !f?.proteinGoal && <Dot color="bg-gray-400" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  )
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
