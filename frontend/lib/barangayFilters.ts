export type BarangayLike = {
  barangay_id: number
  barangay_name: string
  is_registered?: boolean
  is_active?: boolean
}

// history filters: operating barangays plus retired ones, so their old records stay findable
export const forHistory = <T extends BarangayLike>(list: T[]): T[] =>
  list.filter(b => b.is_registered || b.is_active === false)

export const barangayLabel = (b: BarangayLike) =>
  b.is_active === false ? `${b.barangay_name} (Inactive)` : b.barangay_name