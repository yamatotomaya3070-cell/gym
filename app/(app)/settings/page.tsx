"use client"

import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEFAULT_PLATE_WEIGHTS } from "@/lib/utils/plate-calculator"
import {
  Bell,
  Download,
  LogOut,
  Target,
  Trash2,
  Weight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SettingsPage() {
  const [gymDays, setGymDays] = useState(3)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [plates, setPlates] = useState<number[]>(DEFAULT_PLATE_WEIGHTS)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email ?? "")

      const { data: goal } = await supabase
        .from("goals")
        .select("gym_days_per_week")
        .single()
      if (goal) setGymDays(goal.gym_days_per_week)
    }
    load()
  }, [])

  const handleSaveGoal = async () => {
    setSaving(true)
    setSaveError(null)
    setSavedAt(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSaveError("ログインが必要です")
        return
      }
      const { error } = await supabase
        .from("goals")
        .upsert(
          { user_id: user.id, gym_days_per_week: gymDays },
          { onConflict: "user_id" }
        )
      if (error) {
        setSaveError(error.message)
        return
      }
      setSavedAt(new Date().toLocaleTimeString("ja-JP"))
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, started_at, ended_at, routine:routines(name)")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)

    const { data: sets } = await supabase
      .from("session_sets")
      .select("session_id, exercise:exercises(name), set_number, weight_kg, reps, rpe, is_completed, created_at")
      .in("session_id", (sessions ?? []).map((s) => s.id))

    const rows = [
      ["セッションID", "開始日時", "終了日時", "ルーティン", "種目", "セット", "重量(kg)", "レップ", "RPE", "完了"],
      ...(sets ?? []).map((s) => {
        const session = (sessions ?? []).find((sess) => sess.id === s.session_id)
        const ex = s.exercise as unknown as { name: string } | null
        const routine = session?.routine as unknown as { name: string } | null
        return [
          s.session_id,
          session?.started_at ?? "",
          session?.ended_at ?? "",
          routine?.name ?? "",
          ex?.name ?? "",
          s.set_number,
          s.weight_kg ?? "",
          s.reps ?? "",
          s.rpe ?? "",
          s.is_completed ? "✓" : "",
        ]
      }),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gymnote_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = async () => {
    if (!confirm("アカウントとすべてのデータを削除しますか？この操作は取り消せません。")) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.auth.signOut()
    router.push("/auth")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header title="設定" />

      <div className="px-4 py-4 space-y-4">
        {/* アカウント */}
        <Card>
          <CardHeader>
            <CardTitle>アカウント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">{userEmail}</p>
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut size={16} />
              ログアウト
            </Button>
          </CardContent>
        </Card>

        {/* 週次目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={16} className="text-navy-500" />
              週次目標
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">
                週のジム回数目標
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGymDays(n)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium border transition-colors ${
                      gymDays === n
                        ? "bg-navy-500 text-white border-navy-500"
                        : "border-border text-gray-600 hover:bg-surface-secondary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" loading={saving} onClick={handleSaveGoal}>
                保存
              </Button>
              {savedAt && !saveError && (
                <span className="text-xs text-navy-500">
                  {savedAt} に保存
                </span>
              )}
            </div>
            {saveError && (
              <p className="text-xs text-danger bg-red-50 px-3 py-2 rounded-lg">
                {saveError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* プレート設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight size={16} className="text-navy-500" />
              使用プレート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-400 mb-3">プレート計算機で使用するプレートを選択</p>
            <div className="flex flex-wrap gap-2">
              {[20, 15, 10, 5, 2.5, 1.25].map((w) => {
                const active = plates.includes(w)
                return (
                  <button
                    key={w}
                    onClick={() =>
                      setPlates((prev) =>
                        active ? prev.filter((p) => p !== w) : [...prev, w].sort((a, b) => b - a)
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      active
                        ? "bg-navy-500 text-white border-navy-500"
                        : "border-border text-gray-400"
                    }`}
                  >
                    {w}kg
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 通知 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={16} className="text-navy-500" />
              通知
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              インターバルタイマー終了時にバイブレーション通知が届きます。
              ブラウザの通知許可が必要です。
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => Notification.requestPermission()}
            >
              通知を許可する
            </Button>
          </CardContent>
        </Card>

        {/* データ */}
        <Card>
          <CardHeader>
            <CardTitle>データ管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={handleExport}
            >
              <Download size={16} />
              CSVエクスポート
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={handleDeleteAccount}
            >
              <Trash2 size={16} />
              アカウントを削除
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 pb-2">
          GymNote v0.1.0
        </p>
      </div>
    </div>
  )
}
