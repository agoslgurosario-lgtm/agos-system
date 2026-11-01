export const DEFAULT_PUROK_COUNT = 7
export const MAX_PUROK_COUNT = 30

// [1, 2, ... count]
export const purokOptions = (count?: number | null) =>
  Array.from(
    { length: Math.min(Math.max(count ?? DEFAULT_PUROK_COUNT, 1), MAX_PUROK_COUNT) },
    (_, i) => i + 1
  )