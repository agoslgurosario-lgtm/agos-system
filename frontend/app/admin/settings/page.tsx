"use client"

// react
import { useEffect, useRef, useState } from "react"

// icons
import { DatabaseBackup, Download, Upload, TriangleAlert, ShieldAlert, Bell, Trash2, CheckCircle, X } from "lucide-react"

// lib
import { api } from "@/lib/api"
import { resolveSoundUrl} from '@/lib/soundUtils'
import { DIALOG_COLOR } from "@/lib/constant"

// shadcn components
import { Button } from "@/components/ui/button"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { DialogModal } from "@/components/DialogModal"

// components 
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";


type BackupConfig = {
  config_id: number
  auto_backup_enabled: boolean
  frequency: "daily" | "weekly" | "monthly"
  server_backup_path: string | null
  updated_at: string
}

type BackupLog = {
  log_id: number
  backup_type: "manual" | "scheduled" | "restore"
  status: "success" | "failed"
  triggered_by_name: string
  file_name: string | null
  error_message: string | null
  created_at: string
}

type RestorePoint = {
  file_name: string
  size_bytes: number
  modified_at: string
}

type UploadedSound = { 
  sound_id: number; 
  original_filename: string; 
  file: string; 
  duration_seconds: number 
}


const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function Page() {
  const { toasts, addToast, removeToast } = useToast()

  // us
  const [deleteSoundDialog, setDeleteSoundDialog] = useState<{ open: boolean; sound: UploadedSound | null; tier: "critical" | "warning" | "info" | null }>({ open: false, sound: null, tier: null })
  const [deleteLoadingDialog, setDeleteLoadingDialog] = useState(false)
  const [deleteSuccessDialog, setDeleteSuccessDialog] = useState<{ open: boolean; filename: string }>({ open: false, filename: "" })

  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [logs, setLogs] = useState<BackupLog[]>([])

  const [savingConfig, setSavingConfig] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const [frequencyInput, setFrequencyInput] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [autoEnabled, setAutoEnabled] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([])
  const [selectedRestorePoint, setSelectedRestorePoint] = useState<RestorePoint | null>(null)
  const [confirmServerRestoreOpen, setConfirmServerRestoreOpen] = useState(false)
  const [restoringFromServer, setRestoringFromServer] = useState(false)

  const [manualBackupConfirmOpen, setManualBackupConfirmOpen] = useState(false)
  const [saveSoundConfirmOpen, setSaveSoundConfirmOpen] = useState(false)
  const [saveBackupConfirmOpen, setSaveBackupConfirmOpen] = useState(false)

  const [actionLoadingDialog, setActionLoadingDialog] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" })
  const [actionSuccessDialog, setActionSuccessDialog] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" })
  const [actionErrorDialog, setActionErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: "" })

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [tierValues, setTierValues] = useState({
    critical: "preset:critical",
    warning: "preset:warning",
    info: "preset:info",
  })
  const [uploadedSounds, setUploadedSounds] = useState<UploadedSound[]>([])
  const [uploadingSound, setUploadingSound] = useState(false)
  const [savingSoundConfig, setSavingSoundConfig] = useState(false)
  const soundFileInputRef = useRef<HTMLInputElement>(null)

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(logs, 8)

  const lastManual = logs.find(l => l.backup_type === "manual" && l.status === "success")
  const lastScheduled = logs
    .filter(l => l.backup_type === "scheduled")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  async function loadData() {
    try {
      const [configRes, logsRes, restorePointsRes, soundConfigRes, uploadedSoundsRes] = await Promise.all([
        api.get("/api/backup/config/"),
        api.get("/api/backup/logs/"),
        api.get("/api/backup/restore-points/"),
        api.get("/api/alert-sounds/config/"),
        api.get("/api/alert-sounds/"),
      ])
      setConfig(configRes)
      setFrequencyInput(configRes.frequency)
      setAutoEnabled(configRes.auto_backup_enabled)
      setLogs(logsRes)
      setRestorePoints(restorePointsRes)
      setSoundEnabled(soundConfigRes.sound_enabled)
      setTierValues({
        critical: soundConfigRes.critical_sound,
        warning: soundConfigRes.warning_sound,
        info: soundConfigRes.info_sound,
      })
      setUploadedSounds(uploadedSoundsRes)
    } catch {
      addToast("Failed to load backup settings.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSaveConfig() {
    setSaveBackupConfirmOpen(false)
    setActionLoadingDialog({ open: true, title: "Saving Settings", description: "Please wait while your backup schedule is being saved..." })
    try {
      await api.patch("/api/backup/config/", {
        auto_backup_enabled: autoEnabled,
        frequency: frequencyInput,
      })
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionSuccessDialog({ open: true, title: "Settings Saved", description: "Your backup schedule has been saved successfully." })
      loadData()
    } catch (err: any) {
      console.error(err)
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionErrorDialog({ open: true, message: err?.error || "Failed to save backup settings." })
    }
  }

  async function handleManualBackup() {
    setManualBackupConfirmOpen(false)
    setBackingUp(true)
        setActionLoadingDialog({ open: true, title: "Creating Backup", description: "Please wait while your backup is being created. This might take a minute..." })
    let handle: any = null
    if ('showSaveFilePicker' in window) {
      try {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: `agos_backup_${Date.now()}.zip`,
          types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
        })
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // user cancelled the save dialog — bail out before hitting the backend at all
          setActionLoadingDialog({ open: false, title: "", description: "" })
          setBackingUp(false)
          return
        }
        // picker failed for some other reason — fall back to the classic download below
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/api/backup/manual/`, {
        method: "GET",
        credentials: "include",
      })

      if (!res.ok) throw new Error("Backup failed")

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `agos_backup_${Date.now()}.zip`

      if (handle) {
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }

      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionSuccessDialog({ open: true, title: "Backup Created", description: "Your backup has been created successfully." })
      loadData()
    } catch (err) {
      console.error(err)
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionErrorDialog({ open: true, message: "Failed to create backup." })
    } finally {
      setBackingUp(false)
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".zip")) {
      addToast("Please select a valid .zip backup file.", "error")
      return
    }
    setSelectedFile(file)
  }

  async function handleConfirmRestore() {
    if (!selectedFile) return
    setConfirmRestoreOpen(false)
    setRestoring(true)
    setActionLoadingDialog({ open: true, title: "Restoring System", description: "Please wait while your system is being restored. This might take a minute — you'll be logged out automatically once it's done." })
    try {
      const formData = new FormData()
      formData.append("backup_file", selectedFile)

      const tokenRes = await fetch(`${BASE_URL}/api/auth/ws-token/`, {
        method: "GET",
        credentials: "include",
      })
      if (!tokenRes.ok) throw new Error("Could not authenticate for restore.")
      const { token } = await tokenRes.json()

      const RENDER_URL = "https://agos-capstone.onrender.com"
      const res = await fetch(`${RENDER_URL}/api/backup/restore/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      let result: any = {}
      try {
        result = await res.json()
      } catch {
        // Response wasn't valid JSON (e.g. a server crash with no body) — fall back gracefully
      }
      if (!res.ok) throw new Error(result?.error || "Restore failed. Please check your backup file and try again.")

      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionSuccessDialog({ open: true, title: "Restore Complete", description: "System restored successfully. Restart the backend for AI model changes to take effect." })
      loadData()
    } catch (err: any) {
      console.error(err)
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionErrorDialog({ open: true, message: err?.message || "Restore failed." })
    } finally {
      setRestoring(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function formatFileSize(bytes: number) {
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  async function handleConfirmServerRestore() {
    if (!selectedRestorePoint) return
    setConfirmServerRestoreOpen(false)
    setRestoringFromServer(true)
    setActionLoadingDialog({ open: true, title: "Restoring System", description: "Please wait while your system is being restored. This might take a minute — you'll be logged out automatically once it's done." })
    try {
      await api.post("/api/backup/restore-from-server/", {
        file_name: selectedRestorePoint.file_name,
      })
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionSuccessDialog({ open: true, title: "Restore Complete", description: "System restored successfully. Restart the backend for AI model changes to take effect." })
      loadData()
    } catch (err: any) {
      console.error(err)
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionErrorDialog({ open: true, message: err?.error || "Restore failed." })
    } finally {
      setRestoringFromServer(false)
      setSelectedRestorePoint(null)
    }
  }

  async function handleUploadSound(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSound(true)
    try {
      const formData = new FormData()
      formData.append("sound_file", file)
      const res = await fetch(`${BASE_URL}/api/alert-sounds/upload/`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      let result: any = {}
      try {
        result = await res.json()
      } catch {
        // Response wasn't valid JSON (e.g. a server crash with no body) — fall back gracefully
      }
      if (!res.ok) throw new Error(result?.error || "Upload failed. Please check your sound file and try again.")
      addToast("Sound uploaded successfully.")
      loadData()
    } catch (err: any) {
      addToast(err?.message || "Upload failed.", "error")
    } finally {
      setUploadingSound(false)
      if (soundFileInputRef.current) soundFileInputRef.current.value = ""
    }
  }

  const handleDeleteSound = async () => {
    const sound = deleteSoundDialog.sound
    const tier = deleteSoundDialog.tier
    if (!sound) return
    setDeleteSoundDialog({ open: false, sound: null, tier: null })
    setDeleteLoadingDialog(true)

    try {
      await api.delete(`/api/alert-sounds/${sound.sound_id}/`)

      setUploadedSounds(prev => prev.filter(s => s.sound_id !== sound.sound_id))

      // Figure out the updated tier values (any tier using this sound falls back to preset)
      let didResetATier = false
      const updatedTierValues = { ...tierValues }
      for (const t of ["critical", "warning", "info"] as const) {
        if (updatedTierValues[t] === sound.file) {
          updatedTierValues[t] = `preset:${t}`
          didResetATier = true
        }
      }
      setTierValues(updatedTierValues)

      if (didResetATier) {
        await api.patch("/api/alert-sounds/config/", {
          sound_enabled: soundEnabled,
          critical_sound: updatedTierValues.critical,
          warning_sound: updatedTierValues.warning,
          info_sound: updatedTierValues.info,
        })
      }

      setDeleteLoadingDialog(false)
      setDeleteSuccessDialog({ open: true, filename: sound.original_filename })
    } catch (err) {
      console.error(err)
      setDeleteLoadingDialog(false)
      addToast('Failed to delete sound.', 'error')
    }
  }

  async function handleSaveSoundConfig() {
    setSaveSoundConfirmOpen(false)
    setActionLoadingDialog({ open: true, title: "Saving Settings", description: "Please wait while your alert sound settings are being saved..." })
    try {
      await api.patch("/api/alert-sounds/config/", {
        sound_enabled: soundEnabled,
        critical_sound: tierValues.critical,
        warning_sound: tierValues.warning,
        info_sound: tierValues.info,
      })
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionSuccessDialog({ open: true, title: "Settings Saved", description: "Your alert sound settings have been saved successfully." })
    } catch (err: any) {
      console.error(err)
      setActionLoadingDialog({ open: false, title: "", description: "" })
      setActionErrorDialog({ open: true, message: err?.error || "Failed to save alert sound settings." })
    }
  }


  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full gap-3 md:pb-4">

        {/* Alert Sound section */}
        <div className="rounded-lg bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] p-3 border border-[#C9C9C9] flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#58D07159]">
              <Bell className="w-4 h-4" color="#2C7B3C" />
            </div>
            <h2 className="font-bold text-[#122A48] text-base">Alert Sound</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-90">
              <div className="flex flex-col items-center gap-3 -mt-10">
                <SpinnerIcon size={24} color="#122A48" />
                <p className="text-[#122A48]">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border border-[#C6C6C8] rounded-lg p-3">
                <label className="text-[#122A48] text-xs font-medium">Enable alert sounds</label>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${soundEnabled ? "bg-[#2C7B3C]" : "bg-[#C6C6C8]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${soundEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {(["critical", "warning", "info"] as const).map((tier) => (
                <div key={tier} className="border border-[#C6C6C8] rounded-lg p-3 flex items-center justify-between gap-3">
                  <span className="text-[#122A48] text-xs font-medium capitalize w-16">{tier}</span>

                  <Select
                    value={tierValues[tier]}
                    onValueChange={(v) => setTierValues(prev => ({ ...prev, [tier]: v }))}
                  >
                    <SelectTrigger className="cursor-pointer flex-1 h-8 text-xs border-[#C6C6C8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value={`preset:${tier}`}>Default ({tier})</SelectItem>
                      {uploadedSounds.map((s) => (
                        <SelectItem key={s.sound_id} value={s.file}>
                          {s.original_filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => new Audio(resolveSoundUrl(tierValues[tier])).play().catch((err) => console.error('Playback failed:', err))}
                    className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-3 h-8 text-xs cursor-pointer"
                  >
                    ▶ Preview
                  </Button>

                  <button
                    disabled={tierValues[tier].startsWith("preset:")}
                    onClick={() => {
                      const sound = uploadedSounds.find(s => s.file === tierValues[tier])
                      if (sound) setDeleteSoundDialog({ open: true, sound, tier })
                    }}
                    className={`rounded-lg border p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 ${
                      tierValues[tier].startsWith("preset:")
                        ? "border-[#C6C6C8] text-[#C6C6C8] cursor-not-allowed"
                        : "border-[#C6C6C8] text-[#D81010] hover:bg-[#FFE5E5] cursor-pointer"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <input
                  ref={soundFileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadSound}
                  className="hidden"
                />
                <Button
                  onClick={() => soundFileInputRef.current?.click()}
                  disabled={uploadingSound}
                  className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-3 h-9 text-xs cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingSound ? "Uploading..." : "Upload Custom Sound"}
                </Button>

                <Button
                  onClick={() => setSaveSoundConfirmOpen(true)}
                  disabled={savingSoundConfig}
                  className="rounded-lg bg-[#1565BC] hover:bg-[#0d4f96] text-white px-4 h-9 text-xs cursor-pointer"
                >
                  {savingSoundConfig ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Backup & Restore section */}
        <div className="rounded-lg bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] p-3 border border-[#C9C9C9] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#58D07159]">
              <DatabaseBackup className="w-4 h-4" color="#2C7B3C" />
            </div>
            <h2 className="font-bold text-[#122A48] text-base">Backup & Restore</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-122">
              <div className="flex flex-col items-center gap-3 -mt-17">
                <SpinnerIcon size={24} color="#122A48" />
                <p className="text-[#122A48]">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Manual Backup */}
              <div className="border border-[#C6C6C8] rounded-lg p-3 flex flex-col gap-2">
                <h3 className="font-semibold text-[#122A48] text-sm">Manual Backup</h3>
                <p className="text-[#727272] text-xs">
                  Download a full backup (database, media, and AI models) to your device.
                </p>
                <div className="flex items-center justify-between -mt-2">
                  <span className="text-[#727272] text-xs">
                    Last manual backup:{" "}
                    {lastManual
                      ? new Date(lastManual.created_at).toLocaleString()
                      : "Never"}
                  </span>
                  <Button
                    onClick={() => setManualBackupConfirmOpen(true)}
                    disabled={backingUp}
                    className="rounded-lg bg-[#1565BC] hover:bg-[#0d4f96] text-white px-4 h-9 text-xs cursor-pointer flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {backingUp ? "Backing up..." : "Backup Now"}
                  </Button>
                </div>
              </div>

              {/* Scheduled Backup */}
              <div className="border border-[#C6C6C8] rounded-lg p-3 flex flex-col gap-2">
                <h3 className="font-semibold text-[#122A48] text-sm">Scheduled Backup</h3>

                <div className="flex items-center justify-between">
                  <label className="text-[#122A48] text-xs font-medium">Enable auto-backup</label>
                  <button
                    onClick={() => setAutoEnabled(!autoEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoEnabled ? "bg-[#2C7B3C]" : "bg-[#C6C6C8]"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${autoEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-[#122A48] text-xs font-medium">Frequency</label>
                  <Select value={frequencyInput} onValueChange={(v) => setFrequencyInput(v as any)}>
                    <SelectTrigger className="cursor-pointer h-8 text-xs border-[#C6C6C8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem className="cursor-pointer" value="daily">Daily</SelectItem>
                      <SelectItem className="cursor-pointer" value="weekly">Weekly</SelectItem>
                      <SelectItem className="cursor-pointer" value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#727272] text-xs flex items-center gap-1 flex-wrap">
                    Last scheduled backup:{" "}
                    {lastScheduled ? (
                      <>
                        {new Date(lastScheduled.created_at).toLocaleString()}
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] ${
                            lastScheduled.status === "failed"
                              ? "bg-[#FFE5E5] text-[#D81010]"
                              : "bg-[#B2FBC173] text-[#2C7B3C]"
                          }`}
                        >
                          {lastScheduled.status === "failed" ? "Failed" : "Success"}
                        </span>
                      </>
                    ) : (
                      "Never"
                    )}
                  </span>
                  <Button
                    onClick={() => setSaveBackupConfirmOpen(true)}
                    disabled={savingConfig}
                    className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-4 h-8 text-xs cursor-pointer"
                  >
                    {savingConfig ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>

              {/* Restore */}
              <div className="border border-[#C6C6C8] rounded-lg p-3 flex flex-col gap-2">
                <h3 className="font-semibold text-[#122A48] text-sm flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4 text-[#BB2325]" />
                  Restore
                </h3>
                <p className="text-[#727272] text-xs">
                  Restoring will overwrite current system data with the contents of the selected backup.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="restore-file-input"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-2.5 h-8 text-xs cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose Backup File
                  </Button>

                  {selectedFile && (
                    <>
                      <span className="text-[#122A48] text-xs bg-[#EDEBEB] px-2 py-1 rounded">
                        {selectedFile.name}
                      </span>
                      <Button
                        onClick={() => setConfirmRestoreOpen(true)}
                        className="rounded-lg bg-[#BB2325] hover:bg-[#9a1c1e] text-white px-4 h-8 text-xs cursor-pointer"
                      >
                        Restore
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 flex-1 min-h-[456px]">
                {/* Restore Points */}
                <div className="border border-[#C6C6C8] rounded-lg p-3 flex flex-col gap-2 flex-1 h-full overflow-auto-y">
                  <h3 className="font-semibold text-[#122A48] text-sm">Restore Points</h3>
                  <p className="text-[#727272] text-xs">
                    Snapshots available on the server, from scheduled and manual backups.
                  </p>
                  <p className="text-[#727272] text-[10px] -mt-1">
                    Snapshots are available based on your Server backup path.
                  </p>

                  {restorePoints.length === 0 ? (
                    <p className="text-[#727272] text-xs italic mt-1">No restore points available yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2 mt-1">
                      {restorePoints.map((point) => (
                        <div
                          key={point.file_name}
                          className="flex items-center justify-between border border-[#C6C6C8] rounded-lg px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-[#122A48] text-xs font-medium">{point.file_name}</span>
                            <span className="text-[#727272] text-[11px]">
                              {new Date(point.modified_at).toLocaleString()} · {formatFileSize(point.size_bytes)}
                            </span>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedRestorePoint(point)
                              setConfirmServerRestoreOpen(true)
                            }}
                            className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-3 h-7 text-xs cursor-pointer"
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Backup History */}
                <div className="border border-[#C6C6C8] rounded-lg flex-1 flex flex-col h-full">
                  <h3 className="font-semibold text-[#122A48] text-sm p-3">Recent Backup Activity</h3>
                  <Table>
                    <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC]'>
                      <TableRow>
                        <TableHead className='text-xs font-semibold text-center text-[#727272]'>TYPE</TableHead>
                        <TableHead className='text-xs font-semibold text-center text-[#727272]'>STATUS</TableHead>
                        <TableHead className='text-xs font-semibold text-center text-[#727272]'>BY</TableHead>
                        <TableHead className='text-xs font-semibold text-center text-[#727272]'>FILE</TableHead>
                        <TableHead className='text-xs font-semibold text-center text-[#727272]'>DATE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-[#727272] text-xs py-4">
                            No backup activity yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((log) => (
                          <TableRow key={log.log_id}>
                            <TableCell className="capitalize text-xs">{log.backup_type}</TableCell>
                            <TableCell className="text-xs flex justify-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                                log.status === 'failed'   ? 'bg-[#FFE5E5] text-[#D81010]' :
                                'bg-[#B2FBC173] text-[#2C7B3C]'
                              }`}>
                                {log.status === 'failed' ? 'Failed' : 'Success'}

                              </span>
                            </TableCell>
                            <TableCell className="text-xs">{log.triggered_by_name}</TableCell>
                            <TableCell className="text-xs">
                              {log.status === 'failed' && log.error_message ? (
                                <span className="text-[#D81010] max-w-50 block truncate" title={log.error_message}>
                                  {log.error_message}
                                </span>
                              ) : (
                                log.file_name || "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  <div className='mt-auto'>
                    <TablePagination
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DialogModal
        open={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={handleConfirmRestore}
        color="#F8D7DA"
        icon={ShieldAlert}
        iconColor="#BB2325"
        title="Restore System?"
        description={
          <>
            This will overwrite your current database, media files, and AI models with
            the contents of <strong>{selectedFile?.name}</strong>. This action cannot be undone.
            You will be logged out automatically once it completes, and will need to sign in again.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Restore"
      />

      <DialogModal
        open={confirmServerRestoreOpen}
        onClose={() => setConfirmServerRestoreOpen(false)}
        onConfirm={handleConfirmServerRestore}
        color="#F8D7DA"
        icon={ShieldAlert}
        iconColor="#BB2325"
        title="Restore System?"
        description={
          <>
            This will overwrite your current database, media files, and AI models with
            the contents of <strong>{selectedFile?.name}</strong>. This action cannot be undone.
            You will be logged out automatically once it completes, and will need to sign in again.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel={restoringFromServer ? "Restoring..." : "Restore"}
      />

      <DialogModal
        open={deleteSoundDialog.open}
        onClose={() => setDeleteSoundDialog({ open: false, sound: null, tier: null })}
        onConfirm={handleDeleteSound}
        color={DIALOG_COLOR.lightred}
        icon={Trash2}
        iconColor={DIALOG_COLOR.red}
        title="Delete Sound"
        description={
          <>
            Are you sure you want to delete <strong>{deleteSoundDialog.sound?.original_filename}</strong>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />

      {/* Deleting Sound — Loading */}
      <DialogModal
        open={deleteLoadingDialog}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Deleting Sound"
        description="Please wait while the sound is being deleted."
      />

      {/* Sound Deleted — Success */}
      <DialogModal
        open={deleteSuccessDialog.open}
        onClose={() => setDeleteSuccessDialog({ open: false, filename: "" })}
        onConfirm={() => setDeleteSuccessDialog({ open: false, filename: "" })}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle}
        iconColor={DIALOG_COLOR.green}
        title="Sound Deleted"
        description={
          <>
            <strong>{deleteSuccessDialog.filename}</strong> has been deleted successfully.
          </>
        }
        confirmLabel="OK"
      />

      <DialogModal
        open={manualBackupConfirmOpen}
        onClose={() => setManualBackupConfirmOpen(false)}
        onConfirm={handleManualBackup}
        color={DIALOG_COLOR.lightblue}
        icon={Download}
        iconColor={DIALOG_COLOR.blue}
        title="Create Backup?"
        description="This will create a full backup (database, media, and AI models) and let you choose where to save it. Continue?"
        cancelLabel="Cancel"
        confirmLabel="Backup Now"
      />

      <DialogModal
        open={saveBackupConfirmOpen}
        onClose={() => setSaveBackupConfirmOpen(false)}
        onConfirm={handleSaveConfig}
        color={DIALOG_COLOR.lightblue}
        icon={DatabaseBackup}
        iconColor={DIALOG_COLOR.blue}
        title="Save Backup Schedule?"
        description="This will update your automatic backup schedule settings."
        cancelLabel="Cancel"
        confirmLabel="Save Settings"
      />

      <DialogModal
        open={saveSoundConfirmOpen}
        onClose={() => setSaveSoundConfirmOpen(false)}
        onConfirm={handleSaveSoundConfig}
        color={DIALOG_COLOR.lightblue}
        icon={Bell}
        iconColor={DIALOG_COLOR.blue}
        title="Save Alert Sound Settings?"
        description="This will update your alert sound preferences."
        cancelLabel="Cancel"
        confirmLabel="Save Settings"
      />

      {/* Shared: Loading */}
      <DialogModal
        open={actionLoadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={actionLoadingDialog.title}
        description={actionLoadingDialog.description}
      />

      {/* Shared: Success */}
      <DialogModal
        open={actionSuccessDialog.open}
        onConfirm={() => setActionSuccessDialog({ open: false, title: "", description: "" })}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle}
        iconColor={DIALOG_COLOR.green}
        title={actionSuccessDialog.title}
        description={actionSuccessDialog.description}
        confirmLabel="OK"
      />

      {/* Shared: Error */}
      <DialogModal
        open={actionErrorDialog.open}
        onConfirm={() => setActionErrorDialog({ open: false, message: "" })}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Something Went Wrong"
        description={actionErrorDialog.message}
        confirmLabel="Okay"
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}