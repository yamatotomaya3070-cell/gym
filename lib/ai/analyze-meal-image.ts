// 食事画像 → カロリー/PFC 推定。
// プロバイダ差し替え可能なように、入出力をこのファイル内で完結させる。
// 現在は Google Gemini API (gemini-2.0-flash) を使用。
// サーバー専用：必ず API ルートからのみ呼び出すこと（API キーをクライアントへ漏らさない）。

import "server-only"

export interface DetectedItem {
  name: string
  estimated_amount: string
  calories: number
}

export interface MealAnalysisResult {
  meal_name: string
  estimated_calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  confidence: number              // 0-100
  detected_items: DetectedItem[]
  notes: string
}

export class MealAnalysisError extends Error {
  code:
    | "missing_api_key"
    | "image_too_large"
    | "ai_request_failed"
    | "invalid_json"
    | "invalid_schema"
  constructor(code: MealAnalysisError["code"], message: string) {
    super(message)
    this.code = code
    this.name = "MealAnalysisError"
  }
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8MB

// Gemini モデル: 2.5-flash は無料枠あり・Vision 対応・低レイテンシ
const GEMINI_MODEL = "gemini-2.5-flash"

const PROMPT = `あなたは食事写真からカロリーとPFC（タンパク質/脂質/炭水化物）を概算する栄養士アシスタントです。
出力は必ず以下のJSONスキーマに**厳密に**従い、日本語で記述してください。
{
  "meal_name": string,
  "estimated_calories": number,        // kcal、整数
  "protein_g": number,                  // g
  "fat_g": number,                      // g
  "carbs_g": number,                    // g
  "confidence": number,                 // 0-100、写真から判断できる確実性
  "detected_items": [
    { "name": string, "estimated_amount": string, "calories": number }
  ],
  "notes": string                       // 推定の根拠や量の不確実性に関する短い注釈
}
- 写真からは正確なグラム数を判定できないので、見えるもの・典型的な定食量から概算してください。
- 不確実性が高い場合は confidence を下げ、notes でその旨を明記してください。
- JSON 以外の文字（説明文・コードブロック・マークダウン）は一切出力しないでください。`

// Gemini structured output 用 schema (responseSchema)
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    meal_name: { type: "STRING" },
    estimated_calories: { type: "NUMBER" },
    protein_g: { type: "NUMBER" },
    fat_g: { type: "NUMBER" },
    carbs_g: { type: "NUMBER" },
    confidence: { type: "NUMBER" },
    detected_items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          estimated_amount: { type: "STRING" },
          calories: { type: "NUMBER" },
        },
        required: ["name", "estimated_amount", "calories"],
      },
    },
    notes: { type: "STRING" },
  },
  required: [
    "meal_name",
    "estimated_calories",
    "protein_g",
    "fat_g",
    "carbs_g",
    "confidence",
    "detected_items",
    "notes",
  ],
}

export async function analyzeMealImage(
  imageBase64: string,
  mimeType: string,
  byteLength: number
): Promise<MealAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new MealAnalysisError(
      "missing_api_key",
      "GEMINI_API_KEY が未設定です。Vercel/ローカルの環境変数を設定してください。"
    )
  }

  if (byteLength > MAX_IMAGE_BYTES) {
    throw new MealAnalysisError(
      "image_too_large",
      `画像が大きすぎます（${(byteLength / 1024 / 1024).toFixed(1)}MB）。8MB以下にしてください。`
    )
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })
  } catch (e) {
    throw new MealAnalysisError(
      "ai_request_failed",
      e instanceof Error ? e.message : "AIへのリクエストに失敗しました"
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new MealAnalysisError(
      "ai_request_failed",
      `Gemini API エラー (${res.status}): ${text.slice(0, 300)}`
    )
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    promptFeedback?: { blockReason?: string }
  }

  if (data.promptFeedback?.blockReason) {
    throw new MealAnalysisError(
      "ai_request_failed",
      `セーフティフィルタによりブロックされました: ${data.promptFeedback.blockReason}`
    )
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
  if (!text) {
    throw new MealAnalysisError("invalid_json", "AIの応答が空でした")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new MealAnalysisError(
      "invalid_json",
      "AIがJSON以外を返しました。再試行してください。"
    )
  }

  return validateResult(parsed)
}

function validateResult(raw: unknown): MealAnalysisResult {
  if (!raw || typeof raw !== "object") {
    throw new MealAnalysisError("invalid_schema", "AI出力が想定と異なります")
  }
  const r = raw as Record<string, unknown>

  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : Number(v) || fallback
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback

  const items = Array.isArray(r.detected_items)
    ? r.detected_items.map((it) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          name: str(o.name),
          estimated_amount: str(o.estimated_amount),
          calories: Math.round(num(o.calories)),
        }
      })
    : []

  const result: MealAnalysisResult = {
    meal_name: str(r.meal_name, "不明な料理"),
    estimated_calories: Math.round(num(r.estimated_calories)),
    protein_g: Math.round(num(r.protein_g) * 10) / 10,
    fat_g: Math.round(num(r.fat_g) * 10) / 10,
    carbs_g: Math.round(num(r.carbs_g) * 10) / 10,
    confidence: Math.max(0, Math.min(100, Math.round(num(r.confidence)))),
    detected_items: items,
    notes: str(r.notes),
  }

  if (
    !result.meal_name ||
    !Number.isFinite(result.estimated_calories) ||
    !Number.isFinite(result.protein_g)
  ) {
    throw new MealAnalysisError("invalid_schema", "AI出力の必須項目が不足しています")
  }
  return result
}
