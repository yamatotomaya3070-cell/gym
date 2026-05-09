"use client"

import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { ProgressPhoto, PhotoAngle } from "@/lib/supabase/types"
import { Camera, Plus, User, Trash2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: "正面",
  side: "横",
  back: "背面",
}

const SILHOUETTE: Record<PhotoAngle, string> = {
  front: "M 50 5 Q 55 8 58 15 Q 62 22 60 30 Q 70 35 72 50 Q 75 65 65 70 Q 60 80 58 95 L 42 95 Q 40 80 35 70 Q 25 65 28 50 Q 30 35 40 30 Q 38 22 42 15 Q 45 8 50 5 Z",
  side: "M 55 5 Q 60 8 62 15 Q 65 22 63 30 Q 70 35 70 50 Q 70 65 62 70 Q 60 80 58 95 L 48 95 Q 46 80 44 70 Q 38 65 38 50 Q 38 35 45 30 Q 43 22 46 15 Q 49 8 55 5 Z",
  back: "M 50 5 Q 55 8 58 15 Q 62 22 60 30 Q 70 35 72 50 Q 75 65 65 70 Q 60 80 58 95 L 42 95 Q 40 80 35 70 Q 25 65 28 50 Q 30 35 40 30 Q 38 22 42 15 Q 45 8 50 5 Z",
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [showModal, setShowModal] = useState(false)
  const [angle, setAngle] = useState<PhotoAngle>("front")
  const [note, setNote] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [comparing, setComparing] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from("progress_photos")
      .select("*")
      .order("taken_at", { ascending: false })
    if (data) setPhotos(data as ProgressPhoto[])
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 同じファイルを再選択できるように value をクリア
    if (e.target) e.target.value = ""
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError("ログインが必要です")
        return
      }

      // 拡張子: ファイル名 → MIMEタイプ → "jpg" の順で決定
      const nameExt = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : ""
      const mimeExt = file.type.split("/")[1]?.toLowerCase() ?? ""
      const ext = (nameExt || mimeExt || "jpg").replace(/[^a-z0-9]/g, "") || "jpg"
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        })
      if (uploadErr) {
        setUploadError(`アップロード失敗: ${uploadErr.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path)
      const { error: insertErr } = await supabase.from("progress_photos").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
        angle,
        note: note.trim() || null,
        taken_at: new Date().toISOString().slice(0, 10),
      })
      if (insertErr) {
        setUploadError(`保存失敗: ${insertErr.message}`)
        return
      }

      await load()
      setShowModal(false)
      setNote("")
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "不明なエラー")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photo: ProgressPhoto) => {
    if (!confirm("この写真を削除しますか？")) return
    const urlParts = photo.photo_url.split("/")
    const path = urlParts.slice(-2).join("/")
    await supabase.storage.from("progress-photos").remove([path])
    await supabase.from("progress_photos").delete().eq("id", photo.id)
    await load()
  }

  const toggleCompare = (id: string) => {
    setComparing((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 2 ? [...prev, id] : prev
    )
  }

  // 月ごとにグルーピング
  const byMonth: Record<string, ProgressPhoto[]> = {}
  for (const photo of photos) {
    const key = photo.taken_at.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(photo)
  }

  const comparePhotos = photos.filter((p) => comparing.includes(p.id))

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title="フォト記録"
        rightElement={
          <button
            onClick={() => setShowModal(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100"
          >
            <Plus size={20} />
          </button>
        }
      />

      {comparing.length > 0 && (
        <div className="sticky top-14 z-20 bg-navy-50 border-b border-navy-100 px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-navy-500">
            {comparing.length === 2 ? "2枚選択済み" : "もう1枚選択してください"}
          </span>
          <button onClick={() => setComparing([])} className="text-xs text-gray-500 underline">
            キャンセル
          </button>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* 比較ビュー */}
        {comparing.length === 2 && comparePhotos.length === 2 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Before / After 比較</p>
              <div className="grid grid-cols-2 gap-2">
                {comparePhotos.map((p, i) => (
                  <div key={p.id}>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-secondary">
                      <Image src={p.photo_url} alt="" fill className="object-cover" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      {i === 0 ? "Before" : "After"} · {new Date(p.taken_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {photos.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
              <Camera size={40} className="text-gray-300" />
              <div>
                <p className="text-gray-600 font-medium">写真がありません</p>
                <p className="text-sm text-gray-400 mt-1">「+」ボタンから体型写真を追加しましょう</p>
              </div>
            </CardContent>
          </Card>
        )}

        {Object.entries(byMonth)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([month, monthPhotos]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {new Date(month + "-01").toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {monthPhotos.map((photo) => {
                  const isSelected = comparing.includes(photo.id)
                  return (
                    <div key={photo.id} className="relative">
                      <button
                        onClick={() => toggleCompare(photo.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-surface-secondary w-full ${
                          isSelected ? "ring-2 ring-navy-500" : ""
                        }`}
                      >
                        <Image
                          src={photo.photo_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-navy-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-navy-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {comparing.indexOf(photo.id) + 1}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-1.5">
                          <span className="text-white text-[10px]">
                            {ANGLE_LABELS[photo.angle]}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(photo)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="写真を追加">
        <div className="space-y-5">
          {/* 角度選択 */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">撮影角度</label>
            <div className="grid grid-cols-3 gap-2">
              {(["front", "side", "back"] as PhotoAngle[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAngle(a)}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    angle === a ? "border-navy-500 bg-navy-50" : "border-border bg-surface"
                  }`}
                >
                  {/* シルエットガイド */}
                  <svg viewBox="0 0 100 100" className="w-12 h-12 mx-auto mb-1">
                    <path d={SILHOUETTE[a]} fill={angle === a ? "#1B3A6B" : "#E8ECF4"} />
                  </svg>
                  <span className={`text-xs font-medium ${angle === a ? "text-navy-500" : "text-gray-500"}`}>
                    {ANGLE_LABELS[a]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">メモ（任意）</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="体重、コンディションなど..."
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          {uploadError && (
            <p className="text-xs text-danger bg-danger/10 px-3 py-2 rounded-lg">
              {uploadError}
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={18} />
            写真を撮影 / 選択
          </Button>
        </div>
      </Modal>
    </div>
  )
}
