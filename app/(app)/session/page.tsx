"use client"

import { createClient } from "@/lib/supabase/client"
import { useSessionStore, ExerciseSessionData } from "@/lib/store/session-store"
import { ExerciseCard } from "@/components/session/exercise-card"
import { IntervalTimer } from "@/components/session/interval-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, X, Dumbbell } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"

interface RoutineOption {
  id: string
  name: string
  note: string | null
  routine_exercises: {
    id: string
    order_index: number
    default_sets: number
    default_rest_seconds: number
    exercise: {
      id: string
      name: string
      category: string
    }
  }[]
}

function SessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedRoutineId = searchParams.get("routineId")

  const { isActive, exercises, currentExerciseIndex, startSession, setCurrentExercise, endSession } =
    useSessionStore()

  const [routines, setRoutines] = useState<RoutineOption[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchRoutines = async () => {
      const { data } = await supabase
        .from("routines")
        .select(`
          id, name, note,
          routine_exercises (
            id, order_index, default_sets, default_rest_seconds,
            exercise:exercises (id, name, category)
          )
        `)
        .order("created_at", { ascending: false })
      if (data) setRoutines(data as unknown as RoutineOption[])
    }
    fetchRoutines()
  }, [])

  useEffect(() => {
    if (preselectedRoutineId && routines.length > 0) {
      const found = routines.find((r) => r.id === preselectedRoutineId)
      if (found) setSelectedRoutine(found)
    }
  }, [preselectedRoutineId, routines])

  const handleStartSession = useCallback(async () => {
    if (!selectedRoutine) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 前回のセット履歴を取得
    const exerciseIds = selectedRoutine.routine_exercises.map((re) => re.exercise.id)
    const { data: lastSessionSets } = await supabase
      .from("session_sets")
      .select("exercise_id, set_number, weight_kg, reps, rpe, session_id")
      .in("exercise_id", exerciseIds)
      .eq("is_completed", true)
      .order("created_at", { ascending: false })

    // セッション作成
    const { data: sessionData } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, routine_id: selectedRoutine.id })
      .select("id")
      .single()

    if (!sessionData) { setLoading(false); return }

    // 種目ごとに前回セットをまとめる
    const lastByExercise: Record<string, typeof lastSessionSets> = {}
    for (const set of lastSessionSets ?? []) {
      if (!lastByExercise[set.exercise_id]) lastByExercise[set.exercise_id] = []
      lastByExercise[set.exercise_id]!.push(set)
    }

    const sortedRE = [...selectedRoutine.routine_exercises].sort(
      (a, b) => a.order_index - b.order_index
    )

    const sessionExercises: ExerciseSessionData[] = sortedRE.map((re) => {
      const prev = lastByExercise[re.exercise.id] ?? []
      const uniquePrev = prev
        .filter((v, i, arr) => arr.findIndex((x) => x.set_number === v.set_number) === i)
        .sort((a, b) => a.set_number - b.set_number)
        .slice(0, re.default_sets)

      return {
        exerciseId: re.exercise.id,
        exerciseName: re.exercise.name,
        category: re.exercise.category,
        defaultRestSeconds: re.default_rest_seconds,
        sets: Array.from({ length: re.default_sets }, (_, i) => ({
          id: crypto.randomUUID(),
          weightKg: uniquePrev[i]?.weight_kg ?? null,
          reps: uniquePrev[i]?.reps ?? null,
          rpe: null,
          isCompleted: false,
        })),
        previousSets: uniquePrev.map((p) => ({
          weightKg: p.weight_kg,
          reps: p.reps,
          rpe: p.rpe,
        })),
      }
    })

    startSession({
      sessionId: sessionData.id,
      routineId: selectedRoutine.id,
      routineName: selectedRoutine.name,
      exercises: sessionExercises,
    })
    setLoading(false)
  }, [selectedRoutine, supabase, startSession])

  const handleFinish = useCallback(async () => {
    setIsSaving(true)
    const store = useSessionStore.getState()
    const { sessionId, exercises: storeExercises } = store

    if (sessionId) {
      const sets = storeExercises.flatMap((ex) =>
        ex.sets.map((s, i) => ({
          session_id: sessionId,
          exercise_id: ex.exerciseId,
          set_number: i + 1,
          weight_kg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe,
          is_completed: s.isCompleted,
        }))
      )
      await Promise.all([
        supabase.from("session_sets").insert(sets),
        supabase
          .from("sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", sessionId),
      ])
    }
    endSession()
    router.push("/session/summary")
    setIsSaving(false)
  }, [supabase, endSession, router])

  // ルーティン選択画面
  if (!isActive) {
    return (
      <div className="min-h-dvh bg-surface-secondary">
        <header className="bg-surface border-b border-border flex items-center h-14 px-4 gap-2">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-surface-secondary">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-base font-semibold text-gray-900">トレーニング開始</h1>
        </header>

        <div className="px-4 py-6 space-y-4">
          <p className="text-sm text-gray-500">ルーティンを選択してください</p>
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoutine(selectedRoutine?.id === r.id ? null : r)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selectedRoutine?.id === r.id
                  ? "border-navy-500 bg-navy-50 ring-2 ring-navy-500"
                  : "border-border bg-surface shadow-card"
              }`}
            >
              <p className="font-semibold text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {r.routine_exercises.length} 種目
              </p>
              {r.note && (
                <p className="text-xs text-gray-500 mt-1">{r.note}</p>
              )}
            </button>
          ))}

          {routines.length === 0 && (
            <Card>
              <CardContent className="pt-4 text-center space-y-3">
                <Dumbbell size={32} className="text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500">ルーティンがまだありません</p>
                <Link href="/routines">
                  <Button variant="secondary" size="sm">ルーティンを作成</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {selectedRoutine && (
            <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
              <Button
                className="w-full"
                size="lg"
                loading={loading}
                onClick={handleStartSession}
              >
                <Dumbbell size={18} />
                {selectedRoutine.name} を開始
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // セッション中画面
  return (
    <div className="min-h-dvh bg-surface-secondary">
      <header className="bg-surface border-b border-border flex items-center h-14 px-4 gap-2 sticky top-0 z-30">
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
          {useSessionStore.getState().routineName}
        </h1>
        <Button
          variant="danger"
          size="sm"
          loading={isSaving}
          onClick={handleFinish}
        >
          終了
        </Button>
      </header>

      <IntervalTimer />

      {/* 種目タブ */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border bg-surface">
        {exercises.map((ex, i) => {
          const done = ex.sets.every((s) => s.isCompleted)
          return (
            <button
              key={ex.exerciseId}
              onClick={() => setCurrentExercise(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === currentExerciseIndex
                  ? "bg-navy-500 text-white"
                  : done
                  ? "bg-success/10 text-success"
                  : "bg-surface-secondary text-gray-600"
              }`}
            >
              {ex.exerciseName.length > 8 ? ex.exerciseName.slice(0, 8) + "…" : ex.exerciseName}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-4 space-y-4">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.exerciseId}
            exercise={ex}
            exerciseIndex={i}
            isActive={i === currentExerciseIndex}
            onClick={() => setCurrentExercise(i)}
          />
        ))}
      </div>

      <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
        <Button
          className="w-full"
          size="lg"
          loading={isSaving}
          onClick={handleFinish}
        >
          トレーニング終了 & 保存
        </Button>
      </div>
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense>
      <SessionContent />
    </Suspense>
  )
}
