"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  calculatePlates,
  DEFAULT_BAR_WEIGHT,
  DEFAULT_PLATE_WEIGHTS,
} from "@/lib/utils/plate-calculator"
import { useState } from "react"

interface PlateCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  initialWeight?: number
}

export function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight,
}: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState(
    initialWeight ? String(initialWeight) : ""
  )
  const [barWeight, setBarWeight] = useState(String(DEFAULT_BAR_WEIGHT))

  const target = parseFloat(targetWeight) || 0
  const bar = parseFloat(barWeight) || DEFAULT_BAR_WEIGHT
  const result = calculatePlates(target, bar, DEFAULT_PLATE_WEIGHTS)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="プレート計算機">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="目標重量 (kg)"
            type="number"
            inputMode="decimal"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="80"
            suffix="kg"
          />
          <Input
            label="バー重量 (kg)"
            type="number"
            inputMode="decimal"
            value={barWeight}
            onChange={(e) => setBarWeight(e.target.value)}
            placeholder="20"
            suffix="kg"
          />
        </div>

        {target > 0 && (
          <div className="rounded-2xl bg-surface-secondary border border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">目標重量</span>
              <span className="font-semibold">{target} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">バー重量</span>
              <span className="font-semibold">{bar} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">片側の重量</span>
              <span className="font-semibold">{result.perSide} kg</span>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-gray-500 mb-2">片側に載せるプレート</p>
              {result.plates.length === 0 && (
                <p className="text-sm text-gray-400">プレート不要</p>
              )}
              {result.plates.map((p) => (
                <div
                  key={p.weight}
                  className="flex justify-between items-center py-1"
                >
                  <span className="font-medium text-navy-500">{p.weight} kg</span>
                  <span className="text-sm text-gray-600">× {p.count} 枚</span>
                </div>
              ))}
              {!result.isValid && result.remainder > 0 && (
                <p className="text-xs text-warning mt-2">
                  ※ {result.remainder}kg 分のプレートが不足しています
                </p>
              )}
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Modal>
  )
}
