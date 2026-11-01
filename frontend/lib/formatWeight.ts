export type WeightUnit = 'g' | 'kg'

// If the biggest value in a group is under 1 kg, the whole group shows grams
export function pickWeightUnit(valuesKg: number[]): WeightUnit {
  const max = Math.max(0, ...valuesKg.map(v => Number(v) || 0))
  return max < 1 ? 'g' : 'kg'
}

export function weightParts(
  kg: number | null | undefined,
  unit: WeightUnit
): { value: string; unit: WeightUnit | '' } {
  const v = Number(kg)
  if (kg == null || isNaN(v)) return { value: '—', unit: '' }
  if (unit === 'g') {
    const g = v * 1000
    if (g === 0) return { value: '0', unit: 'g' }
    if (g < 0.1) return { value: '<0.1', unit: 'g' }
    return { value: g >= 100 ? String(Math.round(g)) : g.toFixed(1), unit: 'g' }
  }
  return { value: v.toFixed(2), unit: 'kg' }
}

export function formatWeightIn(kg: number | null | undefined, unit: WeightUnit): string {
  const p = weightParts(kg, unit)
  return p.unit ? `${p.value} ${p.unit}` : p.value
}

// Single value: grams if under 1 kg, otherwise kg
export function formatWeight(kg: number | null | undefined): string {
  return formatWeightIn(kg, pickWeightUnit([Number(kg) || 0]))
}