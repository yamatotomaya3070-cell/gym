"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import {
  AlertTriangle,
  Beef,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import {
  MEAL_TYPE_LABELS,
  type Json,
  type MealLog,
  type MealType,
} from "@/lib/supabase/types"
import { MealAiPhoto } from "./meal-ai-photo"
import type { MealAnalysisResult } from "@/lib/ai/analyze-meal-image"

const PROTEIN_GOAL_MIN = 120
const PROTEIN_GOAL_MAX = 150
const PROTEIN_PER_SHAKE_G = 30

const MEAL_TYPE_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "post_workout",
]

interface Props {
  userId: string
  date: string
  initialMeals: MealLog[]
  proteinShakeCount: number   // daily_condition_logs.protein_count
}

type FormState = {
  id: string | null
  meal_type: MealType
  meal_name: string
  calories: string
  protein_g: string
  fat_g: string
  carbs_g: string
  memo: string
  // AI推定経由のときのみセット
  image_url: string | null
  confidence: number | null
  ai_raw_result: Json | null
}

const emptyForm = (): FormState => ({
  id: null,
  meal_type: "lunch",
  meal_name: "",
  calories: "",
  protein_g: "",
  fat_g: "",
  carbs_g: "",
  memo: "",
  image_url: null,
  confidence: null,
  ai_raw_result: null,
})

export function MealsSection({
  userId,
  date,
  initialMeals,
  proteinShakeCount,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [meals, setMeals] = useState<MealLog[]>(initialMeals)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    return meals.reduce(
      (a, m) => ({
        kcal: a.kcal + (m.calories ?? 0),
        p: a.p + Number(m.protein_g ?? 0),
        f: a.f + Number(m.fat_g ?? 0),
        c: a.c + Number(m.carbs_g ?? 0),
      }),
      { kcal: 0, p: 0, f: 0, c: 0 }
    )
  }, [meals])

  const shakeProtein = proteinShakeCount * PROTEIN_PER_SHAKE_G
  const totalProteinAll = totals.p + shakeProtein
  const proteinRemainingMin = Math.max(0, PROTEIN_GOAL_MIN - totalProteinAll)
  const proteinRemainingMax = Math.max(0, PROTEIN_GOAL_MAX - totalProteinAll)

  const sortedMeals = useMemo(() => {
    return [...meals].sort((a, b) => {
      const ai = MEAL_TYPE_ORDER.indexOf(a.meal_type ?? "snack")
      const bi = MEAL_TYPE_ORDER.indexOf(b.meal_type ?? "snack")
      if (ai !== bi) return ai - bi
      return a.created_at.localeCompare(b.created_at)
    })
  }, [meals])

  const startAdd = () => {
    setForm(emptyForm())
    setShowForm(true)
    setShowAi(false)
    setError(null)
  }

  const startAiPhoto = () => {
    setShowAi(true)
    setShowForm(false)
    setError(null)
  }

  const startEdit = (m: MealLog) => {
    setForm({
      id: m.id,
      meal_type: (m.meal_type ?? "lunch") as MealType,
      meal_name: m.meal_name ?? "",
      calories: m.calories != null ? String(m.calories) : "",
      protein_g: m.protein_g != null ? String(m.protein_g) : "",
      fat_g: m.fat_g != null ? String(m.fat_g) : "",
      carbs_g: m.carbs_g != null ? String(m.carbs_g) : "",
      memo: m.memo ?? "",
      image_url: m.image_url ?? null,
      confidence: m.confidence ?? null,
      ai_raw_result: m.ai_raw_result ?? null,
    })
    setShowForm(true)
    setShowAi(false)
    setError(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setForm(emptyForm())
    setError(null)
  }

  // AI推定 → 写真をStorageへアップロード → フォームを推定値で初期化
  const handleAiAccept = async (
    result: MealAnalysisResult,
    file: File
  ) => {
    setError(null)
    let imageUrl: string | null = null
    try {
      const nameExt = file.name.includes(".")
        ? file.name.split(".").pop()!.toLowerCase()
        : ""
      const mimeExt = file.type.split("/")[1]?.toLowerCase() ?? ""
      const ext =
        (nameExt || mimeExt || "jpg").replace(/[^a-z0-9]/g, "") || "jpg"
      const path = `${userId}/meals/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        })
      if (upErr) {
        setError(`画像アップロード失敗: ${upErr.message}`)
        // アップロード失敗でも編集画面には進む（image_url なしで保存可能）
      } else {
        const { data: urlData } = supabase.storage
          .from("progress-photos")
          .getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像アップロード失敗")
    }

    setForm({
      id: null,
      meal_type: "lunch",
      meal_name: result.meal_name,
      calories: String(result.estimated_calories),
      protein_g: String(result.protein_g),
      fat_g: String(result.fat_g),
      carbs_g: String(result.carbs_g),
      memo: result.notes,
      image_url: imageUrl,
      confidence: result.confidence,
      ai_raw_result: result as unknown as Json,
    })
    setShowAi(false)
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        user_id: userId,
        date,
        meal_type: form.meal_type,
        meal_name: form.meal_name.trim() || null,
        calories: form.calories === "" ? null : Math.round(Number(form.calories)),
        protein_g: form.protein_g === "" ? null : Number(form.protein_g),
        fat_g: form.fat_g === "" ? null : Number(form.fat_g),
        carbs_g: form.carbs_g === "" ? null : Number(form.carbs_g),
        memo: form.memo.trim() || null,
        image_url: form.image_url,
        confidence: form.confidence,
        ai_raw_result: form.ai_raw_result,
      }

      if (form.id) {
        const { data, error: e } = await supabase
          .from("meal_logs")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", userId)
          .select()
          .single()
        if (e) throw e
        setMeals((cur) => cur.map((m) => (m.id === form.id ? (data as MealLog) : m)))
      } else {
        const { data, error: e } = await supabase
          .from("meal_logs")
          .insert(payload)
          .select()
          .single()
        if (e) throw e
        setMeals((cur) => [...cur, data as MealLog])
      }

      setShowForm(false)
      setForm(emptyForm())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この食事ログを削除しますか？")) return
    setError(null)
    const prev = meals
    setMeals((cur) => cur.filter((m) => m.id !== id))
    const { error: e } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
    if (e) {
      setMeals(prev)
      setError(e.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 合計カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils size={16} className="text-navy-500" />
            今日の食事
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">摂取カロリー</span>
            <span className="text-2xl font-bold text-navy-500">
              {totals.kcal.toLocaleString()}
              <span className="text-sm font-medium text-gray-500 ml-1">kcal</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Macro label="P" value={totals.p} />
            <Macro label="F" value={totals.f} />
            <Macro label="C" value={totals.c} />
          </div>
          <div className="pt-2 border-t border-border space-y-1.5">
            <div className="flex items-start gap-2">
              <Beef size={14} className="text-warning mt-0.5" />
              <div className="text-xs text-gray-600 leading-relaxed flex-1">
                目標タンパク質
                <span className="font-semibold text-gray-900 mx-1">
                  {PROTEIN_GOAL_MIN}〜{PROTEIN_GOAL_MAX}g
                </span>
                まであと
                <span className="font-semibold text-gray-900 mx-1">
                  {proteinRemainingMin === 0 && proteinRemainingMax === 0
                    ? "達成 ✓"
                    : `${proteinRemainingMin}〜${proteinRemainingMax}g`}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 pl-5 leading-relaxed">
              現在合計{" "}
              <span className="font-semibold text-gray-900">
                {totalProteinAll.toFixed(1)}g
              </span>
              <span className="text-gray-400">
                {" "}
                = 食事 {totals.p.toFixed(1)}g + プロテイン{" "}
                {shakeProtein.toFixed(0)}g
                {proteinShakeCount > 0
                  ? ` (${proteinShakeCount}回×${PROTEIN_PER_SHAKE_G}g)`
                  : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 食事ログ一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>食事ログ</CardTitle>
            {!showForm && !showAi && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={startAiPhoto}>
                  <Sparkles size={14} />
                  写真AI
                </Button>
                <Button size="sm" onClick={startAdd}>
                  <Plus size={16} />
                  追加
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedMeals.length === 0 && !showForm && (
            <p className="text-xs text-gray-400 text-center py-4">
              まだ記録がありません
            </p>
          )}
          {sortedMeals.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-secondary px-3 py-3"
            >
              <span className="text-[10px] font-bold text-navy-500 bg-navy-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                {MEAL_TYPE_LABELS[(m.meal_type ?? "snack") as MealType]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {m.meal_name || "（無題）"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {m.calories ?? 0} kcal · P{Number(m.protein_g ?? 0).toFixed(0)}{" "}
                  / F{Number(m.fat_g ?? 0).toFixed(0)} / C
                  {Number(m.carbs_g ?? 0).toFixed(0)}
                </p>
                {m.memo && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {m.memo}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white"
                  aria-label="編集"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-danger hover:bg-white"
                  aria-label="削除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI写真パネル */}
      {showAi && (
        <MealAiPhoto
          onAccept={handleAiAccept}
          onClose={() => setShowAi(false)}
        />
      )}

      {/* 入力フォーム */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{form.id ? "食事ログを編集" : "食事を追加"}</CardTitle>
              <button
                type="button"
                onClick={cancelForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-surface-secondary"
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI推定経由のときの注意 + 写真プレビュー */}
            {(form.image_url || form.confidence != null) && (
              <div className="space-y-2">
                {form.image_url && (
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-secondary">
                    <Image
                      src={form.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {form.confidence != null && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-navy-500 text-white px-2 py-0.5 rounded-full">
                        AI 確度 {form.confidence}%
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                  <AlertTriangle
                    size={14}
                    className="text-warning mt-0.5 flex-shrink-0"
                  />
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    写真からのカロリー推定は概算です。正確に記録したい場合は、量を手動で修正してください。
                  </p>
                </div>
              </div>
            )}

            {/* 食事タイプ */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">食事タイプ</p>
              <div className="grid grid-cols-3 gap-2">
                {MEAL_TYPE_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, meal_type: t }))}
                    className={cn(
                      "h-11 rounded-xl text-xs font-semibold border transition-colors",
                      form.meal_type === t
                        ? "bg-navy-500 text-white border-navy-500"
                        : "bg-surface text-gray-700 border-border hover:bg-surface-secondary"
                    )}
                  >
                    {MEAL_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="食事名"
              placeholder="例: 鶏むね肉と玄米"
              value={form.meal_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, meal_name: e.target.value }))
              }
            />

            <Input
              type="number"
              inputMode="numeric"
              step="1"
              label="カロリー"
              suffix="kcal"
              placeholder="500"
              value={form.calories}
              onChange={(e) =>
                setForm((f) => ({ ...f, calories: e.target.value }))
              }
            />

            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                label="P"
                suffix="g"
                value={form.protein_g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, protein_g: e.target.value }))
                }
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                label="F"
                suffix="g"
                value={form.fat_g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fat_g: e.target.value }))
                }
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                label="C"
                suffix="g"
                value={form.carbs_g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carbs_g: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">メモ</label>
              <textarea
                value={form.memo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, memo: e.target.value }))
                }
                rows={2}
                placeholder="任意"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-danger text-danger text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={cancelForm}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                size="lg"
                className="flex-1"
                loading={saving}
                onClick={handleSave}
              >
                <Save size={18} />
                {form.id ? "更新" : "保存"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-secondary rounded-xl px-2 py-2 text-center">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {Number(value).toFixed(1)}
        <span className="text-[10px] font-medium text-gray-400 ml-0.5">g</span>
      </p>
    </div>
  )
}
