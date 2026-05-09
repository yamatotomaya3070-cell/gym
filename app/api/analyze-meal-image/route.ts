import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  analyzeMealImage,
  MealAnalysisError,
} from "@/lib/ai/analyze-meal-image"

export const runtime = "nodejs"
export const maxDuration = 60

const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

const MAX_BYTES = 8 * 1024 * 1024 // 8MB

export async function POST(req: Request) {
  // 認証必須（食事推定は本人のみ）
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    )
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file フィールドに画像を添付してください" },
      { status: 400 }
    )
  }

  const mime = file.type || "image/jpeg"
  if (!ACCEPTED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: `対応していない画像形式です: ${mime}` },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `画像が大きすぎます（${(file.size / 1024 / 1024).toFixed(
          1
        )}MB）。8MB以下にしてください。`,
      },
      { status: 413 }
    )
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const base64 = buf.toString("base64")

  try {
    const result = await analyzeMealImage(base64, mime, buf.byteLength)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof MealAnalysisError) {
      const status =
        e.code === "missing_api_key"
          ? 500
          : e.code === "image_too_large"
            ? 413
            : e.code === "invalid_json" || e.code === "invalid_schema"
              ? 502
              : 500
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "解析に失敗しました" },
      { status: 500 }
    )
  }
}
