"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Coffee, Droplet, Minus, Moon, Pill, Plus, Save } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { DailyConditionLog } from "@/lib/supabase/types"

const DEFAULT_CREATINE_G = 5
const DEFAULT_MACA_COUNT = 5

interface Props {
  userId: string
  date: string                     // YYYY-MM-DD
  initial: DailyConditionLog | null
}

export function ConditionForm({ userId, date, initial }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [sleepHours, setSleepHours] = useState<string>(
    initial?.sleep_hours != null ? String(initial.sleep_hours) : ""
  )
  const [conditionScore, setConditionScore] = useState<number | null>(
    initial?.condition_score ?? null
  )
  const [fatigueScore, setFatigueScore] = useState<number | null>(
    initial?.fatigue_score ?? null
  )
  const [appetiteScore, setAppetiteScore] = useState<number | null>(
    initial?.appetite_score ?? null
  )
  const [waterL, setWaterL] = useState<string>(
    initial?.water_l != null ? String(initial.water_l) : ""
  )

  const [creatineTaken, setCreatineTaken] = useState<boolean>(
    initial?.creatine_taken ?? false
  )
  const [creatineG, setCreatineG] = useState<string>(
    initial?.creatine_g != null
      ? String(initial.creatine_g)
      : String(DEFAULT_CREATINE_G)
  )

  const [macaTaken, setMacaTaken] = useState<boolean>(initial?.maca_taken ?? false)
  const [macaCount, setMacaCount] = useState<number>(
    initial?.maca_count ?? DEFAULT_MACA_COUNT
  )

  const [proteinCount, setProteinCount] = useState<number>(
    initial?.protein_count ?? 0
  )
  const [caffeineTaken, setCaffeineTaken] = useState<boolean>(
    initial?.caffeine_taken ?? false
  )

  const [supplementMemo, setSupplementMemo] = useState<string>(
    initial?.supplement_memo ?? ""
  )
  const [memo, setMemo] = useState<string>(initial?.memo ?? "")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const handleCreatineToggle = () => {
    const next = !creatineTaken
    setCreatineTaken(next)
    if (next && !creatineG) setCreatineG(String(DEFAULT_CREATINE_G))
  }

  const handleMacaToggle = () => {
    const next = !macaTaken
    setMacaTaken(next)
    if (next && macaCount === 0) setMacaCount(DEFAULT_MACA_COUNT)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        user_id: userId,
        date,
        sleep_hours: sleepHours === "" ? null : Number(sleepHours),
        condition_score: conditionScore,
        fatigue_score: fatigueScore,
        appetite_score: appetiteScore,
        water_l: waterL === "" ? null : Number(waterL),
        creatine_taken: creatineTaken,
        creatine_g:
          creatineG === "" ? null : Number(creatineG),
        maca_taken: macaTaken,
        maca_count: macaCount,
        protein_count: proteinCount,
        caffeine_taken: caffeineTaken,
        supplement_memo: supplementMemo.trim() || null,
        memo: memo.trim() || null,
      }

      const { error: upsertError } = await supabase
        .from("daily_condition_logs")
        .upsert(payload, { onConflict: "user_id,date" })

      if (upsertError) throw upsertError

      setSavedAt(new Date().toLocaleTimeString("ja-JP"))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* コンディション入力 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon size={16} className="text-navy-500" />
            今日のコンディションを記録
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              label="睡眠時間"
              suffix="h"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="7.5"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              label="水分量"
              suffix="L"
              value={waterL}
              onChange={(e) => setWaterL(e.target.value)}
              placeholder="2.5"
            />
          </div>

          <ScoreRow
            label="体調"
            value={conditionScore}
            onChange={setConditionScore}
          />
          <ScoreRow
            label="疲労感"
            value={fatigueScore}
            onChange={setFatigueScore}
          />
          <ScoreRow
            label="食欲"
            value={appetiteScore}
            onChange={setAppetiteScore}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="今日の体感など"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* サプリ入力 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill size={16} className="text-navy-500" />
            サプリ記録
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* クレアチン */}
          <div className="space-y-2">
            <ToggleRow
              icon={<Droplet size={18} />}
              label="クレアチン"
              hint={creatineTaken ? `${creatineG || 0}g 摂取` : "未摂取"}
              active={creatineTaken}
              activeText="飲んだ"
              inactiveText="飲んだ"
              onToggle={handleCreatineToggle}
            />
            {creatineTaken && (
              <div className="pl-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  label="クレアチン量"
                  suffix="g"
                  value={creatineG}
                  onChange={(e) => setCreatineG(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* THE MACA PRO */}
          <div className="space-y-2">
            <ToggleRow
              icon={<Pill size={18} />}
              label="THE MACA PRO"
              hint={macaTaken ? `${macaCount}粒` : "未摂取（基本5粒/日）"}
              active={macaTaken}
              activeText="飲んだ"
              inactiveText="飲んだ"
              onToggle={handleMacaToggle}
            />
            {macaTaken && (
              <Counter
                label="粒数"
                value={macaCount}
                onChange={setMacaCount}
                min={0}
                max={20}
                unit="粒"
              />
            )}
          </div>

          {/* プロテイン */}
          <Counter
            label="プロテイン"
            value={proteinCount}
            onChange={setProteinCount}
            min={0}
            max={10}
            unit="回"
            highlight
          />

          {/* カフェイン */}
          <ToggleRow
            icon={<Coffee size={18} />}
            label="カフェイン"
            hint={caffeineTaken ? "摂取済み" : "未摂取"}
            active={caffeineTaken}
            activeText="飲んだ"
            inactiveText="飲んだ"
            onToggle={() => setCaffeineTaken((v) => !v)}
          />

          {/* サプリメモ */}
          <div className="flex flex-col gap-1 pt-1">
            <label className="text-xs font-medium text-gray-500">
              サプリメモ
            </label>
            <textarea
              value={supplementMemo}
              onChange={(e) => setSupplementMemo(e.target.value)}
              rows={2}
              placeholder="その他のサプリや量など"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存 */}
      {error && (
        <div className="bg-red-50 border border-danger text-danger text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        loading={saving}
        onClick={handleSave}
      >
        <Save size={18} />
        {initial ? "更新する" : "保存する"}
      </Button>

      {savedAt && !error && (
        <p className="text-center text-xs text-navy-500">
          {savedAt} に保存しました
        </p>
      )}
    </div>
  )
}

// ============================================================
// 子コンポーネント
// ============================================================

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">
          {value != null ? `${value} / 5` : "未選択"}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-11 rounded-xl text-sm font-semibold border transition-colors",
              value === n
                ? "bg-navy-500 text-white border-navy-500"
                : "bg-surface text-gray-700 border-border hover:bg-surface-secondary"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  hint,
  active,
  activeText,
  inactiveText,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  active: boolean
  activeText: string
  inactiveText: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl px-3 py-3 border transition-colors",
        active
          ? "bg-navy-50 border-navy-500"
          : "bg-surface-secondary border-border hover:bg-surface"
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          active ? "bg-navy-500 text-white" : "bg-white text-gray-500 border border-border"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <span
        className={cn(
          "text-xs font-bold px-3 py-1.5 rounded-full",
          active
            ? "bg-navy-500 text-white"
            : "bg-white text-gray-600 border border-border"
        )}
      >
        {active ? "済" : activeText}
      </span>
    </button>
  )
}

function Counter({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  highlight,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  unit: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 border",
        highlight
          ? "bg-navy-50 border-navy-500"
          : "bg-surface-secondary border-border"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {value} {unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl border border-border bg-white text-gray-700 flex items-center justify-center disabled:opacity-40"
        >
          <Minus size={18} />
        </button>
        <span className="w-8 text-center text-base font-bold text-gray-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl bg-navy-500 text-white flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
