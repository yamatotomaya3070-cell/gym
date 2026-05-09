"use client"

import { cn } from "@/lib/utils/cn"
import { SetData } from "@/lib/store/session-store"
import { Check, Calculator } from "lucide-react"
import { useState } from "react"
import { PlateCalculatorModal } from "./plate-calculator-modal"

interface SetRowProps {
  setIndex: number
  data: SetData
  previousData?: { weightKg: number | null; reps: number | null; rpe: number | null }
  isBarbell?: boolean
  onUpdate: (data: Partial<Omit<SetData, "id">>) => void
  onComplete: () => void
}

export function SetRow({
  setIndex,
  data,
  previousData,
  isBarbell,
  onUpdate,
  onComplete,
}: SetRowProps) {
  const [showPlateCalc, setShowPlateCalc] = useState(false)

  const weightIncreased =
    data.weightKg !== null &&
    previousData?.weightKg !== null &&
    previousData?.weightKg !== undefined &&
    data.weightKg > previousData.weightKg

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-1.5 items-center py-1.5 px-1",
          "rounded-xl transition-colors",
          data.isCompleted && "bg-navy-50"
        )}
      >
        {/* セット番号 */}
        <span className="text-xs font-medium text-gray-400 text-center">
          {setIndex + 1}
        </span>

        {/* 重量 */}
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={data.weightKg ?? ""}
            onChange={(e) =>
              onUpdate({ weightKg: e.target.value === "" ? null : parseFloat(e.target.value) })
            }
            placeholder={previousData?.weightKg != null ? String(previousData.weightKg) : "kg"}
            className={cn(
              "w-full h-9 rounded-lg border px-2 text-center text-sm font-medium",
              "focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent",
              "transition-colors",
              weightIncreased
                ? "border-success bg-green-50 text-success"
                : "border-border bg-surface"
            )}
            disabled={data.isCompleted}
          />
          {isBarbell && !data.isCompleted && (
            <button
              onClick={() => setShowPlateCalc(true)}
              className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-navy-50 flex items-center justify-center text-navy-500"
            >
              <Calculator size={10} />
            </button>
          )}
        </div>

        {/* レップ */}
        <input
          type="number"
          inputMode="numeric"
          value={data.reps ?? ""}
          onChange={(e) =>
            onUpdate({ reps: e.target.value === "" ? null : parseInt(e.target.value) })
          }
          placeholder={previousData?.reps != null ? String(previousData.reps) : "rep"}
          className={cn(
            "w-full h-9 rounded-lg border px-2 text-center text-sm font-medium",
            "focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent",
            "border-border bg-surface"
          )}
          disabled={data.isCompleted}
        />

        {/* RPE */}
        <input
          type="number"
          inputMode="decimal"
          value={data.rpe ?? ""}
          onChange={(e) =>
            onUpdate({
              rpe: e.target.value === "" ? null : parseFloat(e.target.value),
            })
          }
          placeholder="RPE"
          min="1"
          max="10"
          step="0.5"
          className={cn(
            "w-full h-9 rounded-lg border px-2 text-center text-sm font-medium",
            "focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent",
            "border-border bg-surface"
          )}
          disabled={data.isCompleted}
        />

        {/* 完了ボタン */}
        <button
          onClick={onComplete}
          disabled={data.isCompleted || (data.weightKg === null && data.reps === null)}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            data.isCompleted
              ? "bg-success text-white"
              : "bg-navy-50 text-navy-500 hover:bg-navy-100 active:bg-navy-200 disabled:opacity-40"
          )}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      </div>

      {showPlateCalc && (
        <PlateCalculatorModal
          isOpen={showPlateCalc}
          onClose={() => setShowPlateCalc(false)}
          initialWeight={data.weightKg ?? undefined}
        />
      )}
    </>
  )
}
