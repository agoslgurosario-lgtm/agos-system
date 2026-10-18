const CHUNK_SIZE = 4 * 1024 * 1024 // 4 MB per piece
const MAX_RETRIES = 3
const POLL_EVERY_MS = 3000
const MAX_WAIT_MS = 60 * 60 * 1000 // give up waiting after 1 hour

type Options = {
  directUrl: string
  getToken: () => Promise<string>      // returns a fresh access token
  onProgress?: (message: string) => void
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function readError(res: Response, fallback: string) {
  try {
    const body = await res.json()
    if (body?.error) return body.error as string
  } catch {
    /* response had no JSON body */
  }
  if (res.status === 401 || res.status === 403) {
    return "Your session expired. Please refresh the page and try again."
  }
  return `${fallback} (error ${res.status}).`
}

async function uploadChunk(
  opts: Options, uploadId: string, index: number, total: number, blob: Blob,
) {
  let lastError: Error = new Error("Upload failed.")
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Fresh token every time: the upload can outlast a 30-minute token.
      const token = await opts.getToken()
      const form = new FormData()
      form.append("upload_id", uploadId)
      form.append("chunk_index", String(index))
      form.append("total_chunks", String(total))
      form.append("chunk", blob, "chunk.part")

      const res = await fetch(`${opts.directUrl}/api/backup/restore/chunk/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (res.ok) return
      // 4xx (other than timeouts) won't get better by retrying
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        throw Object.assign(new Error(await readError(res, "Upload failed")), { fatal: true })
      }
      lastError = new Error(await readError(res, "Upload failed"))
    } catch (err: any) {
      if (err?.fatal) throw err
      lastError = err
    }
    await sleep(1000 * attempt)
  }
  throw lastError
}

export async function chunkedRestore(file: File, opts: Options): Promise<void> {
  const total = Math.max(1, Math.ceil(file.size / CHUNK_SIZE))
  const uploadId = crypto.randomUUID()

  // 1. Upload every piece
  for (let i = 0; i < total; i++) {
    const blob = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await uploadChunk(opts, uploadId, i, total, blob)
    opts.onProgress?.(`Uploading backup… ${Math.round(((i + 1) / total) * 100)}%`)
  }

  // 2. Tell the server to start restoring
  opts.onProgress?.("Starting restore…")
  const token = await opts.getToken()
  const finishRes = await fetch(`${opts.directUrl}/api/backup/restore/finish/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId, total_chunks: total, file_name: file.name }),
  })
  if (!finishRes.ok) throw new Error(await readError(finishRes, "Could not start the restore"))

  // 3. Wait until the server says it's finished
    await waitForRestore(opts.directUrl, uploadId, opts.onProgress)
  }

  export async function waitForRestore(
    directUrl: string,
    uploadId: string,
    onProgress?: (message: string) => void,
  ): Promise<void> {
    const startedAt = Date.now()
    let unknownCount = 0
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await sleep(POLL_EVERY_MS)
      try {
        const res = await fetch(`${directUrl}/api/backup/restore/status/${uploadId}/`)
        if (!res.ok) continue
        const { state, error } = await res.json()

        if (state === "done") return
        if (state === "failed") throw Object.assign(new Error(error || "Restore failed."), { fatal: true })

        if (state === "unknown") {
          if (++unknownCount >= 3) {
            throw Object.assign(
              new Error("The server stopped during the restore. Please check the backup log and try again."),
              { fatal: true },
            )
          }
          continue
        }
        unknownCount = 0
        onProgress?.(state === "assembling" ? "Preparing backup file…" : "Restoring system data…")
      } catch (err: any) {
        if (err?.fatal) throw err
        // Network hiccup while the server is busy: keep polling.
      }
    }
    throw new Error("The restore is taking longer than expected. Please check the backup log.")
  }