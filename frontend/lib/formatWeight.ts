export type WeightUnit = 'g' | 'kg'

// If the biggest value in a group is under 1 kg, the whole group shows grams
export function pickWeightUnit(valuesKg: number[]): WeightUnit {
  const max = Math.max(0, ...valuesKg.map(v => Number(v) || 0))
  return max < 1 ? 'g' : 'kg'
}

export function formatWeightIn(kg: number | null | undefined, unit: WeightUnit): string {
  const v = Number(kg)
  if (kg == null || isNaN(v)) return '—'
  if (unit === 'g') {
    const g = v * 1000
    if (g === 0) return '0 g'
    if (g < 0.1) return '<0.1 g'
    return `${g >= 100 ? Math.round(g) : g.toFixed(1)} g`
  }
  return `${v.toFixed(2)} kg`
}

// Single value: grams if under 1 kg, otherwise kg
export function formatWeight(kg: number | null | undefined): string {
  return formatWeightIn(kg, pickWeightUnit([Number(kg) || 0]))
}