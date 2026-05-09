import { createClient } from "@/lib/supabase/server"
import { WeeklyRing } from "@/components/dashboard/weekly-ring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Dumbbell,
  FlameIcon,
  HeartPulse,
  TrendingUp,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { calcEstimated1RM } from "@/lib/utils/rm-calculator"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 今週のセッション数
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [
    { data: sessions },
    { data: goal },
    { data: allSets },
    { data: routines },
    { data: bodyMeasurements },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, started_at, ended_at, routine_id")
      .eq("user_id", user.id)
      .gte("started_at", startOfWeek.toISOString())
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false }),
    supabase
      .from("goals")
      .select("gym_days_per_week")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("session_sets")
      .select("session_id, exercise_id, weight_kg, reps, is_completed")
      .in(
        "session_id",
        (
          await supabase
            .from("sessions")
            .select("id")
            .eq("user_id", user.id)
            .not("ended_at", "is", null)
        ).data?.map((s) => s.id) ?? []
      )
      .eq("is_completed", true),
    supabase
      .from("routines")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("body_measurements")
      .select("weight_kg, measured_at")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("measured_at", { ascending: false })
      .limit(7),
  ])

  const gymDaysGoal = goal?.gym_days_per_week ?? 3
  const thisWeekCount = sessions?.length ?? 0

  // 前回トレーニングからの経過日数
  const lastSession = sessions?.[0]
  const daysSinceLast = lastSession
    ? Math.floor(
        (Date.now() - new Date(lastSession.started_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  // 今週の総ボリューム
  const weeklySessionIds = new Set(sessions?.map((s) => s.id) ?? [])
  const weeklyVolume = (allSets ?? [])
    .filter((s) => weeklySessionIds.has(s.session_id))
    .reduce(
      (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
      0
    )

  // PRランキング（TOP3: 推定1RM最大値）
  const prMap: Record<string, { exerciseId: string; rm: number }> = {}
  for (const s of allSets ?? []) {
    if (s.weight_kg && s.reps) {
      const rm = calcEstimated1RM(s.weight_kg, s.reps)
      if (!prMap[s.exercise_id] || prMap[s.exercise_id].rm < rm) {
        prMap[s.exercise_id] = { exerciseId: s.exercise_id, rm }
      }
    }
  }
  const topPRIds = Object.values(prMap)
    .sort((a, b) => b.rm - a.rm)
    .slice(0, 3)
    .map((p) => p.exerciseId)

  let prExercises: { id: string; name: string; rm: number }[] = []
  if (topPRIds.length > 0) {
    const { data: exData } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", topPRIds)
    prExercises = (exData ?? []).map((ex) => ({
      ...ex,
      rm: prMap[ex.id]?.rm ?? 0,
    }))
  }

  const latestWeight = bodyMeasurements?.[0]?.weight_kg

  return (
    <div className="min-h-dvh bg-surface-secondary">
      {/* ヘッダー */}
      <header className="bg-navy-500 pt-safe-top px-5 pt-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-navy-200 text-sm">
              {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
            </p>
            <h1 className="text-white text-2xl font-bold mt-1">GymNote</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            {latestWeight && (
              <span className="text-white text-lg font-semibold">{latestWeight} kg</span>
            )}
            {daysSinceLast !== null && (
              <span className="text-navy-200 text-xs">
                {daysSinceLast === 0 ? "今日トレーニング済み" : `${daysSinceLast}日前`}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 -mt-4 space-y-4 pb-6">
        {/* トレーニング開始ボタン */}
        <Link href="/session">
          <div className="bg-surface rounded-2xl border border-border shadow-card-hover p-5 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-navy-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Dumbbell size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">今日のトレーニングを開始</p>
              <p className="text-xs text-gray-400 mt-0.5">ルーティンを選んで記録を始める</p>
            </div>
          </div>
        </Link>

        {/* コンディション管理 */}
        <Link href="/condition">
          <div className="bg-surface rounded-2xl border border-border shadow-card p-5 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <HeartPulse size={24} className="text-navy-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">コンディション管理</p>
              <p className="text-xs text-gray-400 mt-0.5">睡眠・サプリ・食事・体重・BIG3</p>
            </div>
            <span className="text-navy-500 text-sm font-medium">→</span>
          </div>
        </Link>

        {/* 今週の進捗 */}
        <Card>
          <CardHeader>
            <CardTitle>今週の達成状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <WeeklyRing completed={thisWeekCount} goal={gymDaysGoal} />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-navy-500" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-navy-500">{thisWeekCount}</span> / {gymDaysGoal} 回
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FlameIcon size={16} className="text-warning" />
                  <span className="text-sm text-gray-700">
                    週間ボリューム:{" "}
                    <span className="font-semibold">{weeklyVolume.toLocaleString()} kg</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PRランキング */}
        {prExercises.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy size={16} className="text-warning" />
                  推定1RM ランキング
                </CardTitle>
                <Link href="/progress" className="text-xs text-navy-500 font-medium">
                  詳細 →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {prExercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-700">{ex.name}</span>
                  <span className="text-sm font-semibold text-navy-500">{ex.rm} kg</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ルーティン一覧 */}
        {routines && routines.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-navy-500" />
                  ルーティン
                </CardTitle>
                <Link href="/routines" className="text-xs text-navy-500 font-medium">
                  すべて →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {routines.map((r) => (
                <Link
                  key={r.id}
                  href={`/session?routineId=${r.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary hover:bg-navy-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  <span className="text-xs text-navy-500 font-medium">開始 →</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {routines?.length === 0 && (
          <Card>
            <CardContent className="pt-4 text-center space-y-3">
              <p className="text-sm text-gray-500">まずはルーティンを作成しましょう</p>
              <Link href="/routines">
                <Button variant="secondary" size="sm">
                  ルーティンを作成
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
