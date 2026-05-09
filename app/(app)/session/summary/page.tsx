"use client"

import { useSessionStore } from "@/lib/store/session-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calcVolume, calcEstimated1RM } from "@/lib/utils/rm-calculator"
import { Trophy, TrendingUp, BarChart2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

export default function SessionSummaryPage() {
  const { exercises, routineName, startedAt, clearSession } = useSessionStore()
  const hasCleared = useRef(false)

  const duration = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : 0

  const totalVolume = exercises.reduce((sum, ex) => {
    return sum + calcVolume(ex.sets.map((s) => ({ weight_kg: s.weightKg, reps: s.reps, is_completed: s.isCompleted })))
  }, 0)

  const completedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length,
    0
  )

  const avgRpe = (() => {
    const rpes = exercises
      .flatMap((ex) => ex.sets)
      .filter((s) => s.isCompleted && s.rpe !== null)
      .map((s) => s.rpe!)
    return rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null
  })()

  // PR（前回比で重量が更新されているセット）
  const prs = exercises.filter((ex) => {
    const bestCurrent = Math.max(...ex.sets.filter((s) => s.isCompleted && s.weightKg).map((s) => s.weightKg!), 0)
    const bestPrev = Math.max(...(ex.previousSets.map((p) => p.weightKg ?? 0)), 0)
    return bestCurrent > bestPrev && bestPrev > 0
  })

  useEffect(() => {
    return () => {
      if (!hasCleared.current) {
        hasCleared.current = true
        clearSession()
      }
    }
  }, [clearSession])

  return (
    <div className="min-h-dvh bg-surface-secondary px-4 py-6 space-y-4">
      {/* ヒーロー */}
      <div className="text-center py-8">
        <div className="text-5xl mb-3">💪</div>
        <h1 className="text-2xl font-bold text-gray-900">お疲れさまでした！</h1>
        <p className="text-gray-500 mt-1">{routineName}</p>
      </div>

      {/* サマリー数値 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "時間", value: `${duration}分`, icon: "⏱️" },
          { label: "総セット", value: `${completedSets}セット`, icon: "🔄" },
          { label: "総ボリューム", value: `${totalVolume.toLocaleString()}kg`, icon: "📊" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-base font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PR */}
      {prs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Trophy size={16} />
              自己ベスト更新！ 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prs.map((ex) => {
              const best = ex.sets.filter((s) => s.isCompleted && s.weightKg).reduce((a, b) => (b.weightKg! > a.weightKg! ? b : a))
              const rm = best.weightKg && best.reps ? calcEstimated1RM(best.weightKg, best.reps) : null
              return (
                <div key={ex.exerciseId} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-sm font-medium text-gray-800">{ex.exerciseName}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-warning">{best.weightKg}kg × {best.reps}rep</span>
                    {rm && <p className="text-xs text-gray-500">推定1RM: {rm}kg</p>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* RPE */}
      {avgRpe !== null && (
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-navy-500" />
              <span className="text-sm text-gray-700">平均RPE</span>
            </div>
            <span className="text-lg font-bold text-navy-500">{avgRpe}</span>
          </CardContent>
        </Card>
      )}

      {/* 種目ごとのボリューム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={16} className="text-navy-500" />
            種目別ボリューム
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exercises.map((ex) => {
            const vol = calcVolume(ex.sets.map((s) => ({ weight_kg: s.weightKg, reps: s.reps, is_completed: s.isCompleted })))
            const completed = ex.sets.filter((s) => s.isCompleted).length
            return (
              <div key={ex.exerciseId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{ex.exerciseName}</p>
                  <p className="text-xs text-gray-400">{completed}セット</p>
                </div>
                <span className="text-sm font-semibold text-navy-500">{vol.toLocaleString()} kg</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Link href="/">
        <Button className="w-full" size="lg">
          ホームへ戻る
        </Button>
      </Link>
    </div>
  )
}
