import { fetchWithAuth } from "@/lib/auth"

export type PdfTable = {
  title: string
  columns: string[]
  rows: (string | number)[][]
  orientation?: "portrait" | "landscape"
}

// Opens the tab first, then fills it with the PDF the server returns.
// The window.open has to run synchronously inside the click handler or iOS blocks it.
async function openPdfTab(load: () => Promise<Response>) {
  const win = window.open("", "_blank")
  if (win) {
    win.document.title = "Preparing PDF"
    win.document.body.style.cssText = "font-family:sans-serif;padding:24px;color:#122A48"
    win.document.body.textContent = "Preparing your PDF..."
  }

  try {
    const res = await load()
    if (!res.ok) throw new Error("Failed to generate PDF")

    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))

    if (win) {
      win.location.href = blobUrl
    } else {
      // popup was blocked: fall back to this tab
      window.location.href = blobUrl
    }

    // keep the URL alive long enough for Save/Share from the viewer
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000)
  } catch (err) {
    win?.close()
    throw err
  }
}

export async function openPdf(
  endpoint: string,
  params: Record<string, string | undefined> = {}
) {
  return openPdfTab(() => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const queryString = query.toString()
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}${queryString ? `?${queryString}` : ""}`
    return fetchWithAuth(url)
  })
}

// PDF of a table (same title/columns/rows as the print view). Pass a function when the
// rows still have to be loaded: the tab opens first, so it still counts as part of the tap.
export async function openTablePdf(table: PdfTable | (() => Promise<PdfTable>)) {
  return openPdfTab(async () => {
    const body = typeof table === "function" ? await table() : table
    return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/export/table-pdf/`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  })
}
