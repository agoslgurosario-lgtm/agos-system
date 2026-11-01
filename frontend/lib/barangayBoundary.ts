import { api } from "@/lib/api"

let boundaryDataCache: any | null = null
let boundaryDataPromise: Promise<any | null> | null = null

async function loadBoundaryData(): Promise<any | null> {
  if (boundaryDataCache) return boundaryDataCache
  if (boundaryDataPromise) return boundaryDataPromise

  boundaryDataPromise = fetch("/data/rosario-barangays.json")
    .then(res => {
      if (!res.ok) throw new Error()
      return res.json()
    })
    .then(data => {
      boundaryDataCache = data
      return data
    })
    .catch(() => null)

  return boundaryDataPromise
}

export async function fetchBarangayBoundary(barangayName: string): Promise<any | null> {
  const data = await loadBoundaryData()
  if (!data) return null
  return data.features.find((f: any) => f.properties.adm4_en === barangayName) ?? null
}

// DB outline first (works for new/renamed barangays), static file as fallback (rosario-barangays.json inside public/data)
export async function fetchBarangayBoundaryById(barangayId: number, barangayName?: string): Promise<any | null> {
  try {
    const res = await api.get(`/api/barangays/${barangayId}/boundary/`)
    if (res?.boundary) return res.boundary
  } catch {}
  return barangayName ? fetchBarangayBoundary(barangayName) : null
}