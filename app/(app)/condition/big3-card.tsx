import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Target, Trophy } from "lucide-react"
import { calcEstimated1RM } from "@/lib/utils/rm-calculator"
import {
  BIG3_GOALS,
  BIG3_KEYS,
  BIG3_LABELS,
  matchBig3,
  type Big3Key,
} from "@/lib/utils/big3"

interface Big3Stat {
  best: { weight: number; reps: number; rm: number; date: string } | null
  latest: { weight: number; reps: number; rm: number; date: string } | null
}

interface Props {
  userId: string
  bodyWeight: number | null
}

export async function Big3Card({ userId, bodyWeight }: Props) {
  const supabase = await createClient()

  // 1) 全 exercises を取得（プリセット + 自分のカスタム = 数十件）し BIG3 をパターンマッチ
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")

  const exIdToKey: Record<string, Big3Key> = {}
  for (const ex of exercises ?? []) {
    const key = matchBig3(ex.name)
    if (key) exIdToKey[ex.id] = key
  }
  const targetIds = Object.keys(exIdToKey)

  // 2) BIG3 種目の completed set のみ取得（自分の sessions に限定）
  const stats: Record<Big3Key, Big3Stat> = {
    bench:    { best: null, latest: null },
    squat:    { best: null, latest: null },
    deadlift: { best: null, latest: null },
  }

  if (targetIds.length > 0) {
    const { data: sets } = await supabase
      .from("session_sets")
      .select(
        "exercise_id, weight_kg, reps, created_at, sessions!inner(user_id, started_at)"
      )
      .in("exercise_id", targetIds)
      .eq("is_completed", true)
      .eq("sessions.user_id", userId)
      .not("weight_kg", "is", null)
      .not("reps", "is", null)

    for (const s of sets ?? []) {
      const key = exIdToKey[s.exercise_id]
      if (!key) continue
      const w = Number(s.weight_kg)
      const r = Number(s.reps)
      if (!w || !r) continue
      const rm = calcEstimated1RM(w, r)
      const date = (s as unknown as { sessions: { started_at: string } }).sessions
        .started_at

      const stat = stats[key]
      if (!stat.best || rm > stat.best.rm) {
        stat.best = { weight: w, reps: r, rm, date }
      }
      if (!stat.latest || date > stat.latest.date) {
        stat.latest = { weight: w, reps: r, rm, date }
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell size={16} className="text-navy-500" />
          BIG3 推定1RM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {BIG3_KEYS.map((key) => (
          <Big3Row
            key={key}
            label={BIG3_LABELS[key]}
            goal={BIG3_GOALS[key]}
            bodyWeight={bodyWeight}
            stat={stats[key]}
          />
        ))}
        <p className="text-[11px] text-gray-400 pt-1">
          既存の sessions / session_sets から自動計算（Epley 式）
        </p>
      </CardContent>
    </Card>
  )
}

function Big3Row({
  label,
  goal,
  bodyWeight,
  stat,
}: {
  label: string
  goal: number
  bodyWeight: number | null
  stat: Big3Stat
}) {
  const pr = stat.best?.rm ?? null
  const remaining = pr != null ? Math.max(0, goal - pr) : null
  const ratio = pr != null && bodyWeight ? pr / bodyWeight : null
  const progressPct =
    pr != null ? Math.min(100, Math.round((pr / goal) * 100)) : 0

  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <Target size={11} />
          目標 {goal}kg
        </span>
      </div>

      {/* プログレスバー */}
      <div className="h-1.5 rounded-full bg-white border border-border overflow-hidden">
        <div
          className="h-full bg-navy-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {pr == null ? (
        <p className="text-xs text-gray-400">未記録</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Mini
            icon={<Trophy size={11} className="text-warning" />}
            label="PR (推定1RM)"
            primary={`${pr.toFixed(1)} kg`}
            secondary={
              stat.best
                ? `${stat.best.weight}kg × ${stat.best.reps}回 / ${fmtDate(stat.best.date)}`
                : ""
            }
          />
          <Mini
            label="最新"
            primary={
              stat.latest
                ? `${stat.latest.weight}kg × ${stat.latest.reps}`
                : "—"
            }
            secondary={
              stat.latest
                ? `e1RM ${stat.latest.rm}kg / ${fmtDate(stat.latest.date)}`
                : ""
            }
          />
          <Mini
            label="目標まで"
            primary={remaining === 0 ? "達成 ✓" : `あと ${remaining!.toFixed(1)} kg`}
            primaryClass={remaining === 0 ? "text-navy-500" : "text-gray-900"}
          />
          <Mini
            label="体重比"
            primary={ratio != null ? `${ratio.toFixed(2)} ×` : "—"}
            secondary={
              bodyWeight ? `体重 ${bodyWeight}kg 基準` : "体重未記録"
            }
          />
        </div>
      )}
    </div>
  )
}

function Mini({
  icon,
  label,
  primary,
  primaryClass,
  secondary,
}: {
  icon?: React.ReactNode
  label: string
  primary: string
  primaryClass?: string
  secondary?: string
}) {
  return (
    <div className="bg-white rounded-lg px-2.5 py-2 border border-border">
      <p className="text-[10px] text-gray-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p
        className={`text-sm font-semibold mt-0.5 ${
          primaryClass ?? "text-gray-900"
        }`}
      >
        {primary}
      </p>
      {secondary && (
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{secondary}</p>
      )}
    </div>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
