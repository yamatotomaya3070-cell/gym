export const DEFAULT_PLATE_WEIGHTS = [20, 15, 10, 5, 2.5, 1.25]
export const DEFAULT_BAR_WEIGHT = 20

export interface PlateResult {
  plates: { weight: number; count: number }[]
  perSide: number
  isValid: boolean
  remainder: number
}

export function calculatePlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_WEIGHT,
  availablePlates: number[] = DEFAULT_PLATE_WEIGHTS
): PlateResult {
  const plates = [...availablePlates].sort((a, b) => b - a)
  const totalLoadNeeded = targetKg - barKg

  if (totalLoadNeeded < 0) {
    return { plates: [], perSide: 0, isValid: false, remainder: totalLoadNeeded }
  }

  const perSide = totalLoadNeeded / 2
  let remaining = perSide
  const result: { weight: number; count: number }[] = []

  for (const plate of plates) {
    if (remaining <= 0) break
    const count = Math.floor(remaining / plate)
    if (count > 0) {
      result.push({ weight: plate, count })
      remaining = Math.round((remaining - plate * count) * 100) / 100
    }
  }

  return {
    plates: result,
    perSide,
    isValid: remaining === 0,
    remainder: remaining,
  }
}

export function formatPlates(result: PlateResult): string {
  if (!result.isValid || result.plates.length === 0) return "プレートなし"
  return result.plates
    .map((p) => `${p.weight}kg × ${p.count}`)
    .join(" + ")
}
