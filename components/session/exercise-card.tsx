"use client"

import { cn } from "@/lib/utils/cn"
import { ExerciseSessionData, useSessionStore } from "@/lib/store/session-store"
import { SetRow } from "./set-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Minus, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { suggestNextWeight } from "@/lib/utils/rm-calculator"

interface ExerciseCardProps {
  exercise: ExerciseSessionData
  exerciseIndex: number
  isActive: boolean
  onClick: () => void
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  isActive,
  onClick,
}: ExerciseCardProps) {
  const { updateSet, completeSet, addSet, removeSet } = useSessionStore()
  const [collapsed, setCollapsed] = useState(false)

  const completedSets = exercise.sets.filter((s) => s.isCompleted).length
  const totalSets = exercise.sets.length
  const isAllDone = completedSets === totalSets

  const recentWeights = exercise.previousSets
    .map((s) => s.weightKg)
    .filter((w): w is number => w !== null)
  const recentRpes = exercise.previousSets.map((s) => s.rpe ?? null)
  const suggestion = suggestNextWeight(recentWeights, recentRpes)

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-navy-500",
        isAllDone && "opacity-80"
      )}
      onClick={!isActive ? onClick : undefined}
    >
      <CardHeader className="flex-row items-start justify-between gap-2 cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}>
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">{exercise.exerciseName}</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            {completedSets}/{totalSets} セット完了
          </p>
          {suggestion && !isAllDone && (
            <p className="text-xs text-navy-500 mt-1 font-medium">
              前回より +2.5kg 試してみませんか？({suggestion} kg)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isAllDone ? "bg-success/10 text-success" : "bg-navy-50 text-navy-500"
          )}>
            {isAllDone ? "完了" : `${completedSets}/${totalSets}`}
          </span>
          {collapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2">
          {/* ヘッダー行 */}
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-1.5 px-1 mb-1">
            {["#", "重量", "Rep", "RPE", ""].map((label) => (
              <span key={label} className="text-[10px] text-gray-400 text-center font-medium">
                {label}
              </span>
            ))}
          </div>

          {exercise.sets.map((set, setIndex) => (
            <SetRow
              key={set.id}
              setIndex={setIndex}
              data={set}
              previousData={exercise.previousSets[setIndex]}
              isBarbell={exercise.category === "barbell"}
              onUpdate={(data) => updateSet(exerciseIndex, setIndex, data)}
              onComplete={() => completeSet(exerciseIndex, setIndex)}
            />
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => addSet(exerciseIndex)}
            >
              <Plus size={14} />
              セット追加
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeSet(exerciseIndex, exercise.sets.length - 1)}
              disabled={exercise.sets.length <= 1}
            >
              <Minus size={14} />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
