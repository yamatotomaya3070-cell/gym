"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Sparkles, X, AlertTriangle } from "lucide-react"

import type { MealAnalysisResult } from "@/lib/ai/analyze-meal-image"

const MAX_BYTES = 8 * 1024 * 1024

interface Props {
  onAccept: (result: MealAnalysisResult, file: File) => void
  onClose: () => void
}

export function MealAiPhoto({ onAccept, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MealAnalysisResult | null>(null)

  const pickFile = () => fileInputRef.current?.click()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (e.target) e.target.value = ""
    if (!f) return
    if (f.size > MAX_BYTES) {
      setError(
        `画像が大きすぎます（${(f.size / 1024 / 1024).toFixed(1)}MB）。8MB以下にしてください。`
      )
      return
    }
    setError(null)
    setResult(null)
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const analyze = async () => {
    if (!file) return
    setAnalyzing(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/analyze-meal-image", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? `解析に失敗しました (${res.status})`)
        return
      }
      setResult(json as MealAnalysisResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー")
    } finally {
      setAnalyzing(false)
    }
  }

  const accept = () => {
    if (result && file) onAccept(result, file)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-navy-500" />
            写真でAI推定
          </CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-surface-secondary"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 概算注意 */}
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            写真からのカロリー推定は概算です。正確に記録したい場合は、量を手動で修正してください。
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        {/* プレビュー or 撮影ボタン */}
        {previewUrl ? (
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-secondary">
            <Image
              src={previewUrl}
              alt="食事プレビュー"
              fill
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={pickFile}
              className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-3 py-1.5"
            >
              撮り直し
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={pickFile}
          >
            <Camera size={18} />
            食事写真を撮影 / 選択
          </Button>
        )}

        {/* AI推定ボタン */}
        {file && !result && (
          <Button
            size="lg"
            className="w-full"
            loading={analyzing}
            onClick={analyze}
          >
            <Sparkles size={18} />
            AIでカロリー推定
          </Button>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-danger text-danger text-sm rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {/* 推定結果プレビュー */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-navy-500 bg-navy-50 px-3 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">
                  {result.meal_name}
                </span>
                <span className="text-[11px] font-semibold text-navy-500 bg-white border border-navy-500 px-2 py-0.5 rounded-full">
                  確度 {result.confidence}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="kcal" value={result.estimated_calories} />
                <Stat label="P" value={result.protein_g} unit="g" />
                <Stat label="F" value={result.fat_g} unit="g" />
                <Stat label="C" value={result.carbs_g} unit="g" />
              </div>
              {result.detected_items.length > 0 && (
                <ul className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-white">
                  {result.detected_items.map((it, i) => (
                    <li key={i}>
                      ・{it.name}（{it.estimated_amount}） {it.calories} kcal
                    </li>
                  ))}
                </ul>
              )}
              {result.notes && (
                <p className="text-[11px] text-gray-500 pt-1 border-t border-white">
                  {result.notes}
                </p>
              )}
            </div>

            <Button size="lg" className="w-full" onClick={accept}>
              この内容で編集して保存へ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit?: string
}) {
  return (
    <div className="bg-white rounded-lg px-1 py-1.5">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {Number(value).toFixed(unit ? 1 : 0)}
        {unit && <span className="text-[9px] font-medium text-gray-400 ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}
