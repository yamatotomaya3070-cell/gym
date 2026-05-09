import { createClient } from "@/lib/supabase/server"
import { calcEstimated1RM } from "@/lib/utils/rm-calculator"
import { matchBig3, type Big3Key } from "@/lib/utils/big3"
import type { TrendPoint } from "@/components/condition/trend-line"
import type { DayFlags } from "@/components/condition/condition-calendar"
import { TrendsClient, type AllSeries } from "./trends-client"

const PROTEIN_GOAL_MIN = 120

// グラフ用に取得する最大期間（日）。「全期間」もこの範囲で表示。
const FETCH_DAYS = 365

interface Props {
  userId: string
}

export async function TrendsSection({ userId }: Props) {
  const supabase = await createClient()
  const since = isoDate(daysAgo(FETCH_DAYS))

  const [
    { data: bm },
    { data: meals },
    { data: cond },
    { data: trainingSessions },
    { data: exercises },
  ] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("weight_kg, measured_at")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .not("weight_kg", "is", null)
      .order("measured_at", { ascending: true }),
    supabase
      .from("meal_logs")
      .select("date, calories, protein_g")
      .eq("user_id", userId)
      .gte("date", since),
    supabase
      .from("daily_condition_logs")
      .select(
        "date, sleep_hours, creatine_taken, maca_taken, protein_count, caffeine_taken"
      )
      .eq("user_id", userId)
      .gte("date", since),
    supabase
      .from("sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", since)
      .not("ended_at", "is", null),
    supabase.from("exercises").select("id, name"),
  ])

  // BIG3 set 取得
  const exIdToKey: Record<string, Big3Key> = {}
  for (const e of exercises ?? []) {
    const key = matchBig3(e.name)
    if (key) exIdToKey[e.id] = key
  }
  const ids = Object.keys(exIdToKey)
  const bigSets: {
    key: Big3Key
    date: string
    rm: number
  }[] = []
  if (ids.length > 0) {
    const { data: sets } = await supabase
      .from("session_sets")
      .select(
        "exercise_id, weight_kg, reps, sessions!inner(user_id, started_at)"
      )
      .in("exercise_id", ids)
      .eq("is_completed", true)
      .eq("sessions.user_id", userId)
      .not("weight_kg", "is", null)
      .not("reps", "is", null)
      .gte("sessions.started_at", since)
    for (const s of sets ?? []) {
      const w = Number(s.weight_kg)
      const r = Number(s.reps)
      const startedAt = (s as unknown as { sessions: { started_at: string } })
        .sessions.started_at
      if (!w || !r) continue
      bigSets.push({
        key: exIdToKey[s.exercise_id],
        date: startedAt.slice(0, 10),
        rm: calcEstimated1RM(w, r),
      })
    }
  }

  // ===== 系列データ構築 =====
  const weightSeries: TrendPoint[] = (bm ?? []).map((r) => ({
    date: r.measured_at,
    value: Number(r.weight_kg),
  }))

  // 食事は date で集計
  const calMap: Record<string, number> = {}
  const proMap: Record<string, number> = {}
  for (const m of meals ?? []) {
    calMap[m.date] = (calMap[m.date] ?? 0) + (m.calories ?? 0)
    proMap[m.date] = (proMap[m.date] ?? 0) + Number(m.protein_g ?? 0)
  }
  const calSeries: TrendPoint[] = sortDateSeries(calMap)
  const proSeries: TrendPoint[] = sortDateSeries(proMap)

  // 睡眠
  const sleepSeries: TrendPoint[] = (cond ?? [])
    .filter((c) => c.sleep_hours != null)
    .map((c) => ({ date: c.date, value: Number(c.sleep_hours) }))
    .sort(byDateAsc)

  // BIG3 e1RM 推移：日付ごとに最大 e1RM を取る
  const big3Series: Record<Big3Key, TrendPoint[]> = {
    bench: maxByDate(bigSets.filter((s) => s.key === "bench")),
    squat: maxByDate(bigSets.filter((s) => s.key === "squat")),
    deadlift: maxByDate(bigSets.filter((s) => s.key === "deadlift")),
  }

  // サプリ継続率：daily_condition_logs から、各行ごとに 0–100% を計算
  const suppSeries: TrendPoint[] = (cond ?? [])
    .map((c) => {
      const total =
        (c.creatine_taken ? 1 : 0) +
        (c.maca_taken ? 1 : 0) +
        ((c.protein_count ?? 0) > 0 ? 1 : 0) +
        (c.caffeine_taken ? 1 : 0)
      return { date: c.date, value: (total / 4) * 100 }
    })
    .sort(byDateAsc)

  // ===== カレンダー用フラグ =====
  const flagsByDate: Record<string, DayFlags> = {}
  const ensure = (date: string): DayFlags => {
    if (!flagsByDate[date]) {
      flagsByDate[date] = {
        recorded: false,
        trained: false,
        supps: false,
        proteinGoal: false,
        hasMeal: false,
      }
    }
    return flagsByDate[date]
  }

  for (const c of cond ?? []) {
    const f = ensure(c.date)
    f.recorded = true
    if (
      c.creatine_taken &&
      c.maca_taken &&
      (c.protein_count ?? 0) > 0
    ) {
      f.supps = true
    }
  }
  for (const s of trainingSessions ?? []) {
    const date = s.started_at.slice(0, 10)
    ensure(date).trained = true
  }
  for (const date of Object.keys(proMap)) {
    const f = ensure(date)
    f.hasMeal = true
    if (proMap[date] >= PROTEIN_GOAL_MIN) f.proteinGoal = true
  }

  const series: AllSeries = {
    weight: weightSeries,
    calories: calSeries,
    protein: proSeries,
    sleep: sleepSeries,
    bench: big3Series.bench,
    squat: big3Series.squat,
    deadlift: big3Series.deadlift,
    supplements: suppSeries,
  }

  return <TrendsClient series={series} flagsByDate={flagsByDate} />
}

// ============================================================
// helpers
// ============================================================

function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function byDateAsc(a: { date: string }, b: { date: string }) {
  return a.date.localeCompare(b.date)
}

function sortDateSeries(map: Record<string, number>): TrendPoint[] {
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort(byDateAsc)
}

function maxByDate(arr: { date: string; rm: number }[]): TrendPoint[] {
  const m: Record<string, number> = {}
  for (const r of arr) {
    if (!m[r.date] || r.rm > m[r.date]) m[r.date] = r.rm
  }
  return sortDateSeries(m)
}
