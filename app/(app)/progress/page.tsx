import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WeightChart } from "@/components/progress/weight-chart"
import { VolumeChart } from "@/components/progress/volume-chart"
import { calcEstimated1RM } from "@/lib/utils/rm-calculator"
import { TrendingUp, Trophy, Activity } from "lucide-react"
import Link from "next/link"

function getWeekLabel(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  const sunday = new Date(d.setDate(diff))
  return `${sunday.getMonth() + 1}/${sunday.getDate()}〜`
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string }>
}) {
  const { exerciseId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 種目リスト（セッション実績のある種目）
  const { data: usedExercises } = await supabase
    .from("session_sets")
    .select("exercise_id, exercise:exercises(id, name)")
    .eq("is_completed", true)
    .not("exercise_id", "is", null)

  const uniqueExercises = Object.values(
    (usedExercises ?? []).reduce<Record<string, { id: string; name: string }>>((acc, row) => {
      const ex = row.exercise as unknown as { id: string; name: string } | null
      if (ex && !acc[ex.id]) acc[ex.id] = ex
      return acc
    }, {})
  )

  const selectedExercise = exerciseId
    ? uniqueExercises.find((e) => e.id === exerciseId)
    : uniqueExercises[0]

  // 選択種目の重量推移
  let weightData: { date: string; value: number; rm: number }[] = []
  if (selectedExercise) {
    const { data: sets } = await supabase
      .from("session_sets")
      .select("weight_kg, reps, created_at")
      .eq("exercise_id", selectedExercise.id)
      .eq("is_completed", true)
      .not("weight_kg", "is", null)
      .not("reps", "is", null)
      .order("created_at", { ascending: true })
      .limit(50)

    const byDate: Record<string, { max: number; reps: number }> = {}
    for (const s of sets ?? []) {
      const date = new Date(s.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
      if (!byDate[date] || s.weight_kg! > byDate[date].max) {
        byDate[date] = { max: s.weight_kg!, reps: s.reps! }
      }
    }
    weightData = Object.entries(byDate).map(([date, { max, reps }]) => ({
      date,
      value: max,
      rm: calcEstimated1RM(max, reps),
    }))
  }

  // 週次ボリューム
  const { data: allSessions } = await supabase
    .from("sessions")
    .select("id, started_at")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true })
    .limit(30)

  const { data: allSets } = await supabase
    .from("session_sets")
    .select("session_id, weight_kg, reps, is_completed")
    .in("session_id", (allSessions ?? []).map((s) => s.id))
    .eq("is_completed", true)

  const weeklyVolume: Record<string, number> = {}
  for (const session of allSessions ?? []) {
    const week = getWeekLabel(new Date(session.started_at))
    const vol = (allSets ?? [])
      .filter((s) => s.session_id === session.id)
      .reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    weeklyVolume[week] = (weeklyVolume[week] ?? 0) + vol
  }
  const volumeData = Object.entries(weeklyVolume)
    .slice(-8)
    .map(([week, volume]) => ({ week, volume: Math.round(volume) }))

  // PR一覧
  const prMap: Record<string, { exerciseName: string; weight: number; reps: number; rm: number }> = {}
  for (const s of allSets ?? []) {
    if (!s.weight_kg || !s.reps) continue
    const session = (allSessions ?? []).find((sess) => sess.id === s.session_id)
    if (!session) continue
    const exId = (s as { session_id: string; weight_kg: number; reps: number; exercise_id?: string }).exercise_id
    if (!exId) continue
    const rm = calcEstimated1RM(s.weight_kg, s.reps)
    if (!prMap[exId] || rm > prMap[exId].rm) {
      prMap[exId] = {
        exerciseName: uniqueExercises.find((e) => e.id === exId)?.name ?? "",
        weight: s.weight_kg,
        reps: s.reps,
        rm,
      }
    }
  }

  const prs = Object.values(prMap)
    .filter((p) => p.exerciseName)
    .sort((a, b) => b.rm - a.rm)
    .slice(0, 10)

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title="進捗"
        rightElement={
          <Link href="/progress/body" className="text-xs font-medium text-navy-500">
            身体計測 →
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* 種目選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={16} className="text-navy-500" />
              種目別 重量推移
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {uniqueExercises.slice(0, 10).map((ex) => (
                <Link
                  key={ex.id}
                  href={`/progress?exerciseId=${ex.id}`}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedExercise?.id === ex.id
                      ? "bg-navy-500 text-white border-navy-500"
                      : "bg-surface border-border text-gray-600"
                  }`}
                >
                  {ex.name.length > 8 ? ex.name.slice(0, 8) + "…" : ex.name}
                </Link>
              ))}
            </div>
            {selectedExercise && (
              <>
                <p className="text-xs text-gray-500">
                  {selectedExercise.name}　<span className="text-green-500">―</span> 推定1RM　<span className="text-navy-500">―</span> 最大重量
                </p>
                <WeightChart data={weightData} />
              </>
            )}
            {!selectedExercise && (
              <p className="text-sm text-gray-400 py-4 text-center">トレーニングを記録すると表示されます</p>
            )}
          </CardContent>
        </Card>

        {/* 週次ボリューム */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={16} className="text-navy-500" />
              週次 総ボリューム
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeChart data={volumeData} />
          </CardContent>
        </Card>

        {/* PR一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy size={16} className="text-warning" />
              推定1RM ランキング
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">データがありません</p>
            )}
            {prs.map((pr, i) => (
              <div key={pr.exerciseName + i} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-600"
                      : i === 1
                      ? "bg-gray-100 text-gray-500"
                      : i === 2
                      ? "bg-orange-100 text-orange-500"
                      : "bg-surface-secondary text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{pr.exerciseName}</p>
                  <p className="text-xs text-gray-400">
                    {pr.weight}kg × {pr.reps}rep
                  </p>
                </div>
                <span className="text-sm font-bold text-navy-500">{pr.rm} kg</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
