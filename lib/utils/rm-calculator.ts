// Epley式: 1RM = weight × (1 + reps / 30)
export function calcEstimated1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

// 指定%での挙上可能重量
export function calcWeightFromRM(rm: number, percent: number): number {
  return Math.round((rm * percent) / 100 / 2.5) * 2.5
}

// 総ボリューム（重量 × レップ × セット数）
export function calcVolume(sets: { weight_kg: number | null; reps: number | null; is_completed: boolean }[]): number {
  return sets
    .filter((s) => s.is_completed && s.weight_kg !== null && s.reps !== null)
    .reduce((sum, s) => sum + (s.weight_kg! * s.reps!), 0)
}

// 前回比AI提案
export function suggestNextWeight(
  recentWeights: number[],
  recentRpes: (number | null)[]
): number | null {
  if (recentWeights.length < 2) return null
  const lastWeight = recentWeights[recentWeights.length - 1]
  const lastRpe = recentRpes[recentRpes.length - 1]
  if (lastRpe !== null && lastRpe > 8.5) return null // RPE高すぎ
  const trend = recentWeights[recentWeights.length - 1] - recentWeights[0]
  if (trend >= 0) {
    return Math.round((lastWeight + 2.5) * 10) / 10
  }
  return null
}
