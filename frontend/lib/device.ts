/**
 * True on iPhone and iPad (including iPadOS, which reports itself as a Mac).
 * Used where iOS Safari needs a different export flow.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const isIPhoneOrIPad = /iPad|iPhone|iPod/.test(ua)
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return isIPhoneOrIPad || isIPadOS
}