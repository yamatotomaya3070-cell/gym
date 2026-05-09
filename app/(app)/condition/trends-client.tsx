"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendLine, type TrendPoint } from "@/components/condition/trend-line"
import {
  ConditionCalendar,
  type DayFlags,
} from "@/components/condition/condition-calendar"
import { cn } from "@/lib/utils/cn"
import { CalendarDays, LineChart as LineIcon } from "lucide-react"

export interface AllSeries {
  weight: TrendPoint[]
  calories: TrendPoint[]
  protein: TrendPoint[]
  sleep: TrendPoint[]
  bench: TrendPoint[]
  squat: TrendPoint[]
  deadlift: TrendPoint[]
  supplements: TrendPoint[]
}

type Period = 7 | 30 | 90 | 0  // 0 = 全期間

const PERIODS: { key: Period; label: string }[] = [
  { key: 7, label: "7日" },
  { key: 30, label: "30日" },
  { key: 90, label: "90日" },
  { key: 0, label: "全期間" },
]

interface Props {
  series: AllSeries
  flagsByDate: Record<string, DayFlags>
}

export function TrendsClient({ series, flagsByDate }: Props) {
  const [period, setPeriod] = useState<Period>(30)

  const since = useMemo(() => {
    if (period === 0) return ""
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - period + 1)
    return toIso(d)
  }, [period])

  const filter = (s: TrendPoint[]) =>
    period === 0 ? s : s.filter((p) => p.date >= since)

  const sliced = {
    weight: filter(series.weight),
    calories: filter(series.calories),
    protein: filter(series.protein),
    sleep: filter(series.sleep),
    bench: filter(series.bench),
    squat: filter(series.squat),
    deadlift: filter(series.deadlift),
    supplements: filter(series.supplements),
  }

  return (
    <div className="space-y-4">
      {/* 期間切替 */}
      <div className="grid grid-cols-4 gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={cn(
              "h-10 rounded-xl text-xs font-semibold border transition-colors",
              period === p.key
                ? "bg-navy-500 text-white border-navy-500"
                : "bg-surface text-gray-700 border-border hover:bg-surface-secondary"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ChartCard title="体重 (kg)" data={sliced.weight} unit="kg" />
      <ChartCard
        title="摂取カロリー (kcal)"
        data={sliced.calories}
        unit="kcal"
        decimals={0}
      />
      <ChartCard
        title="タンパク質 (g)"
        data={sliced.protein}
        unit="g"
        color="#F97316"
      />
      <ChartCard
        title="睡眠時間 (h)"
        data={sliced.sleep}
        unit="h"
        color="#6366F1"
      />
      <ChartCard
        title="ベンチプレス 推定1RM"
        data={sliced.bench}
        unit="kg"
        color="#1B3A6B"
      />
      <ChartCard
        title="スクワット 推定1RM"
        data={sliced.squat}
        unit="kg"
        color="#1B3A6B"
      />
      <ChartCard
        title="デッドリフト 推定1RM"
        data={sliced.deadlift}
        unit="kg"
        color="#1B3A6B"
      />
      <ChartCard
        title="サプリ継続率 (%)"
        data={sliced.supplements}
        unit="%"
        color="#EAB308"
        decimals={0}
      />

      {/* カレンダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={16} className="text-navy-500" />
            日別カレンダー（直近30日）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConditionCalendar flagsByDate={flagsByDate} days={30} />
        </CardContent>
      </Card>
    </div>
  )
}

function ChartCard({
  title,
  data,
  unit,
  color,
  decimals,
}: {
  title: string
  data: TrendPoint[]
  unit: string
  color?: string
  decimals?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineIcon size={14} className="text-gray-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TrendLine
          data={data}
          unit={unit}
          color={color}
          label={title}
          decimals={decimals}
        />
      </CardContent>
    </Card>
  )
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
