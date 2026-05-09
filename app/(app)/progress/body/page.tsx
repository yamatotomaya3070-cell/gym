"use client"

import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { WeightChart } from "@/components/progress/weight-chart"
import { BodyMeasurement } from "@/lib/supabase/types"
import { Plus, Scale, Ruler } from "lucide-react"
import { useEffect, useState } from "react"

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: "weight_kg", label: "体重", unit: "kg" },
  { key: "body_fat_pct", label: "体脂肪率", unit: "%" },
  { key: "chest_cm", label: "胸囲", unit: "cm" },
  { key: "waist_cm", label: "ウエスト", unit: "cm" },
  { key: "hip_cm", label: "ヒップ", unit: "cm" },
  { key: "thigh_cm", label: "大腿", unit: "cm" },
  { key: "arm_cm", label: "二の腕", unit: "cm" },
]

export default function BodyPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Partial<Record<keyof BodyMeasurement, string>>>({})
  const [saving, setSaving] = useState(false)
  const [selectedField, setSelectedField] = useState<keyof BodyMeasurement>("weight_kg")
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .order("measured_at", { ascending: true })
    if (data) setMeasurements(data as BodyMeasurement[])
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload: Record<string, unknown> = {
      user_id: user.id,
      measured_at: form.measured_at || new Date().toISOString().slice(0, 10),
    }
    for (const field of MEASUREMENT_FIELDS) {
      const val = form[field.key]
      if (val && val !== "") {
        payload[field.key] = parseFloat(val)
      }
    }
    await supabase.from("body_measurements").insert(payload)
    setShowModal(false)
    setForm({})
    await load()
    setSaving(false)
  }

  const chartData = measurements
    .filter((m) => m[selectedField] !== null)
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      value: m[selectedField] as number,
    }))

  const latest = measurements[measurements.length - 1]

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title="身体計測"
        backHref="/progress"
        rightElement={
          <button
            onClick={() => setShowModal(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* 最新値サマリー */}
        {latest && (
          <div className="grid grid-cols-2 gap-3">
            {latest.weight_kg && (
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Scale size={20} className="text-navy-500" />
                  <div>
                    <p className="text-xs text-gray-400">体重</p>
                    <p className="text-xl font-bold text-gray-900">{latest.weight_kg}<span className="text-sm font-normal text-gray-400 ml-1">kg</span></p>
                  </div>
                </CardContent>
              </Card>
            )}
            {latest.body_fat_pct && (
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Ruler size={20} className="text-navy-500" />
                  <div>
                    <p className="text-xs text-gray-400">体脂肪率</p>
                    <p className="text-xl font-bold text-gray-900">{latest.body_fat_pct}<span className="text-sm font-normal text-gray-400 ml-1">%</span></p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* グラフ */}
        <Card>
          <CardHeader>
            <CardTitle>推移グラフ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {MEASUREMENT_FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedField(f.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedField === f.key
                      ? "bg-navy-500 text-white border-navy-500"
                      : "bg-surface border-border text-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <WeightChart
              data={chartData}
              yLabel={MEASUREMENT_FIELDS.find((f) => f.key === selectedField)?.unit ?? ""}
            />
          </CardContent>
        </Card>

        {/* 履歴 */}
        <Card>
          <CardHeader>
            <CardTitle>計測履歴</CardTitle>
          </CardHeader>
          <CardContent>
            {measurements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">データがありません</p>
            )}
            <div className="space-y-3">
              {[...measurements].reverse().slice(0, 10).map((m) => (
                <div key={m.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <p className="text-xs text-gray-400 mb-1.5">
                    {new Date(m.measured_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {MEASUREMENT_FIELDS.filter((f) => m[f.key] !== null).map((f) => (
                      <span key={f.key} className="text-sm">
                        <span className="text-gray-500 text-xs">{f.label}: </span>
                        <span className="font-medium text-gray-900">{m[f.key] as number}{f.unit}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="計測値を記録">
        <div className="space-y-4">
          <Input
            label="計測日"
            type="date"
            value={form.measured_at ?? new Date().toISOString().slice(0, 10)}
            onChange={(e) => setForm((f) => ({ ...f, measured_at: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <Input
                key={f.key}
                label={`${f.label} (${f.unit})`}
                type="number"
                inputMode="decimal"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={`0`}
                suffix={f.unit}
              />
            ))}
          </div>
          <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
            保存する
          </Button>
        </div>
      </Modal>
    </div>
  )
}
