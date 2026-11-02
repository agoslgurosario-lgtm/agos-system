// All page links in one place. Change these to match your real folders.
const BASE = "/barangay/barangay-reports"

export const ROUTES = {
  list: BASE,
  view: (id: number | string) => `${BASE}/view?id=${id}`,
  form: (id?: number | string) => (id ? `${BASE}/form?id=${id}` : `${BASE}/form`),
  submit: `${BASE}/submit`,
}
