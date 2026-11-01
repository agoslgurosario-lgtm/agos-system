import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// merge tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// for otp timer
export const formatCooldown = (secs: number): string => {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}h ${m}m ${s}s`
  }
  if (secs >= 60) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }
  return `${secs}s`
}

export const getErrorMessage = (error: unknown): string => {
  // If error is an object (backend returned JSON error)
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>

    // Handle common backend error keys
    if (err.error) return err.error as string
    if (err.detail) return err.detail as string
    if (err.message) return err.message as string
    if (err.non_field_errors) {
      const msg = err.non_field_errors
      return Array.isArray(msg) ? msg[0] : msg as string
    }

    const firstKey = Object.keys(err)[0]
    if (firstKey) {
      const firstValue = err[firstKey]
      const fieldLabel = firstKey.charAt(0).toUpperCase() + firstKey.slice(1)
      const message = Array.isArray(firstValue) ? firstValue[0] : firstValue as string
      return `${fieldLabel}: ${message}`
    }
  }

  // If error is a plain string
  if (typeof error === "string") return error

  // True fallback — network error etc
  return "Something went wrong. Please try again."
}

// Role display mapping
export const ROLE_DISPLAY: Record<string, string> = {
  MENRO: 'MENRO Officer',
  MENRO_Staff: 'MENRO Staff', 
  Barangay: 'Barangay Personnel',
  Admin: 'Admin',
}

// Convert friendly name back to backend value
export const ROLE_VALUE: Record<string, string> = {
  'MENRO Officer': 'MENRO',
  'MENRO Staff': 'MENRO_Staff',
  'Barangay Personnel': 'Barangay',
  Admin: 'Admin',
}

export function getBatteryLevel(voltage: number): string {
  if (voltage >= 4.1) return `Full (${voltage}V)`
  if (voltage >= 3.9) return `Good (${voltage}V)`
  if (voltage >= 3.7) return `Moderate (${voltage}V)`
  if (voltage >= 3.5) return `Low (${voltage}V)`
  return `Critical (${voltage}V)`
}

export function getSignalLevel(dbm: number): string {
  if (dbm >= -65) return `Excellent (${dbm} dBm)`
  if (dbm >= -75) return `Good (${dbm} dBm)`
  if (dbm >= -85) return `Fair (${dbm} dBm)`
  if (dbm >= -95) return `Weak (${dbm} dBm)`
  return `No Signal (${dbm} dBm)`
}

export function getSensorStatus(continuity: boolean): string {
  return continuity ? '✓ Connected' : '✗ Disconnected'
}

export function getDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)

  return parts.join(' ')
}
