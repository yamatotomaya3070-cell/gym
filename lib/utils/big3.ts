// BIG3 (ベンチプレス / スクワット / デッドリフト) のマッチング & 目標値
// exercises.name のゆらぎ（日本語/英語/略称）を吸収する。
// 計算ロジックは calcEstimated1RM (rm-calculator.ts) を再利用すること。

export type Big3Key = "bench" | "squat" | "deadlift"

export const BIG3_KEYS: Big3Key[] = ["bench", "squat", "deadlift"]

export const BIG3_LABELS: Record<Big3Key, string> = {
  bench:    "ベンチプレス",
  squat:    "スクワット",
  deadlift: "デッドリフト",
}

// kg
export const BIG3_GOALS: Record<Big3Key, number> = {
  bench:    100,
  squat:    100,
  deadlift: 140,
}

// マッチング：exercises.name に対して大文字小文字無視の部分一致で判定。
// 「ベンチプレス」「ベンチ」「bench press」「bench」などを bench にまとめる。
const BIG3_PATTERNS: Record<Big3Key, RegExp[]> = {
  bench:    [/ベンチ/i, /\bbench\b/i],
  squat:    [/スクワット/i, /\bsquat\b/i],
  deadlift: [/デッドリフト/i, /デッド/i, /\bdeadlift\b/i],
}

export function matchBig3(name: string): Big3Key | null {
  for (const key of BIG3_KEYS) {
    if (BIG3_PATTERNS[key].some((re) => re.test(name))) return key
  }
  return null
}
