"use client"

import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, MuscleGroup } from "@/lib/supabase/types"
import { CheckCircle, Target, Info, Save, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ExerciseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === "new"

  const [name, setName] = useState("")
  const [category, setCategory] = useState<MuscleGroup>("chest")
  const [description, setDescription] = useState("")
  const [primaryMuscles, setPrimaryMuscles] = useState("")
  const [secondaryMuscles, setSecondaryMuscles] = useState("")
  const [formPoints, setFormPoints] = useState("")
  const [isCustom, setIsCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const supabase = createClient()

  useEffect(() => {
    if (isNew) return
    const load = async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", id)
        .single()
      if (data) {
        setName(data.name)
        setCategory(data.category as MuscleGroup)
        setDescription(data.description ?? "")
        setPrimaryMuscles((data.primary_muscles as string[] | null)?.join("、") ?? "")
        setSecondaryMuscles((data.secondary_muscles as string[] | null)?.join("、") ?? "")
        setFormPoints((data.form_points as string[] | null)?.join("\n") ?? "")
        setIsCustom(data.is_custom)
      }
      setLoading(false)
    }
    load()
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      primary_muscles: primaryMuscles.split(/[、,]/).map((s) => s.trim()).filter(Boolean),
      secondary_muscles: secondaryMuscles.split(/[、,]/).map((s) => s.trim()).filter(Boolean),
      form_points: formPoints.split("\n").map((s) => s.trim()).filter(Boolean),
      is_custom: true,
      user_id: user.id,
    }

    if (isNew) {
      await supabase.from("exercises").insert(payload)
    } else {
      await supabase.from("exercises").update(payload).eq("id", id)
    }
    setSaving(false)
    router.refresh()
    router.push("/exercises")
  }

  const handleDelete = async () => {
    if (!isCustom || !confirm("この種目を削除しますか？")) return
    await supabase.from("exercises").delete().eq("id", id)
    router.refresh()
    router.push("/exercises")
  }

  if (loading) return <div className="min-h-dvh bg-surface-secondary" />

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title={isNew ? "種目を追加" : name}
        backHref="/exercises"
        rightElement={
          !isNew && isCustom && (
            <button
              onClick={handleDelete}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-danger hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>
          )
        }
      />

      <div className="px-4 py-4 space-y-4 pb-44">
        {!isCustom && !isNew ? (
          // 閲覧モード（共通種目）
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info size={16} className="text-navy-500" />
                  説明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{description || "説明なし"}</p>
                <div className="mt-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-navy-50 text-navy-500 font-medium">
                    {MUSCLE_GROUP_LABELS[category as MuscleGroup] ?? category}
                  </span>
                </div>
              </CardContent>
            </Card>

            {formPoints && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" />
                    フォームポイント
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {formPoints.split("\n").filter(Boolean).map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-success font-bold mt-0.5 flex-shrink-0">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={16} className="text-navy-500" />
                  対象筋肉
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {primaryMuscles && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">メイン</p>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryMuscles.split("、").map((m) => (
                        <span key={m} className="text-xs px-2 py-1 bg-navy-50 text-navy-500 rounded-full font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {secondaryMuscles && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">サブ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {secondaryMuscles.split("、").map((m) => (
                        <span key={m} className="text-xs px-2 py-1 bg-surface-secondary text-gray-600 rounded-full">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          // 編集モード（カスタム種目 or 新規）
          <>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <Input
                  label="種目名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: インクラインダンベルカール"
                />
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">部位</label>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setCategory(g.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          category === g.key
                            ? "bg-navy-500 text-white border-navy-500"
                            : "bg-surface border-border text-gray-600"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">説明</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                    rows={3}
                    placeholder="エクササイズの説明を入力..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">フォームポイント（1行1ポイント）</label>
                  <textarea
                    value={formPoints}
                    onChange={(e) => setFormPoints(e.target.value)}
                    className="w-full rounded-xl border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                    rows={4}
                    placeholder="例: 肩甲骨を引き寄せる&#10;膝をつま先と同じ方向に向ける"
                  />
                </div>
                <Input
                  label="メイン筋肉（読点区切り）"
                  value={primaryMuscles}
                  onChange={(e) => setPrimaryMuscles(e.target.value)}
                  placeholder="例: 大胸筋上部、三角筋前部"
                />
                <Input
                  label="サブ筋肉（読点区切り）"
                  value={secondaryMuscles}
                  onChange={(e) => setSecondaryMuscles(e.target.value)}
                  placeholder="例: 上腕三頭筋外側頭"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {(isNew || isCustom) && (
        <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
          <Button className="w-full" size="lg" loading={saving} onClick={handleSave} disabled={!name.trim()}>
            <Save size={18} />
            保存する
          </Button>
        </div>
      )}
    </div>
  )
}
