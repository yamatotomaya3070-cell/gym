"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Scale } from "lucide-react"

interface Props {
  userId: string
  date: string  // YYYY-MM-DD
  latestWeight: number | null
  latestDate: string | null
}

export function WeightCard({ userId, date, latestWeight, latestDate }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [value, setValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (value === "") return
    const weight = Number(value)
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("正しい体重を入力してください")
      return
    }

    setSaving(true)
    setError(null)
    try {
      // 同日の既存行があれば更新、なければ新規作成
      const { data: existing } = await supabase
        .from("body_measurements")
        .select("id")
        .eq("user_id", userId)
        .eq("measured_at", date)
        .maybeSingle()

      if (existing) {
        const { error: e } = await supabase
          .from("body_measurements")
          .update({ weight_kg: weight })
          .eq("id", existing.id)
          .eq("user_id", userId)
        if (e) throw e
      } else {
        const { error: e } = await supabase
          .from("body_measurements")
          .insert({ user_id: userId, measured_at: date, weight_kg: weight })
        if (e) throw e
      }

      setValue("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const isToday = latestDate === date

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale size={16} className="text-navy-500" />
          体重
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 最新値表示 */}
        {latestWeight != null ? (
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">
              {latestWeight}
              <span className="text-base font-medium text-gray-500 ml-1">kg</span>
            </span>
            {latestDate && (
              <span className="text-xs text-gray-400">
                {isToday
                  ? "今日記録"
                  : `${new Date(latestDate).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                    })} 記録`}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">未記録</p>
        )}

        {/* クイック入力 */}
        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <div className="flex-1">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              suffix="kg"
              label={isToday ? "今日の体重を更新" : "今日の体重を記録"}
              placeholder={latestWeight ? String(latestWeight) : "70.0"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            onClick={handleSave}
            loading={saving}
            disabled={value === ""}
          >
            <Save size={16} />
            保存
          </Button>
        </div>

        {error && (
          <p className="text-xs text-danger bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <p className="text-[11px] text-gray-400">
          採寸など他の項目は{" "}
          <a href="/progress/body" className="text-navy-500 underline">
            身体計測ページ
          </a>{" "}
          で記録できます
        </p>
      </CardContent>
    </Card>
  )
}
