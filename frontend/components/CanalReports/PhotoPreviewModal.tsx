"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const MAX_SCALE = 10
const DOUBLE_CLICK_SCALE = 2.5

interface Props {
  open: boolean
  photos: { uri: string }[]
  initialIndex?: number
  onClose: () => void
}

// full-screen photo viewer: wheel or double-click to zoom, drag to pan while zoomed, arrow keys / buttons to change photo
export function PhotoPreviewModal({ open, photos, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [])

  // keep the photo inside the stage after zooming (at scale 1 this snaps back to center)
  const clampPos = useCallback((x: number, y: number, s: number) => {
    const el = stageRef.current
    if (!el) return { x, y }
    const lx = ((s - 1) * el.clientWidth) / 2
    const ly = ((s - 1) * el.clientHeight) / 2
    return { x: Math.min(Math.max(x, -lx), lx), y: Math.min(Math.max(y, -ly), ly) }
  }, [])

  useEffect(() => { if (open) { setIndex(initialIndex); reset() } }, [open, initialIndex, reset])

  const go = useCallback((d: number) => {
    setIndex((i) => {
      const n = i + d
      return n < 0 || n >= photos.length ? i : n
    })
    reset()
  }, [photos.length, reset])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, go])

  if (!open) return null
  const photo = photos[index]

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(Math.max(scale - e.deltaY * 0.002 * scale, 1), MAX_SCALE)
    setScale(next)
    setPos((p) => clampPos(p.x, p.y, next))
  }

  const onDoubleClick = () => {
    if (scale > 1) reset()
    else setScale(DOUBLE_CLICK_SCALE)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos(clampPos(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y, scale))
  }
  const onPointerUp = () => { drag.current = null }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-semibold text-white">{photos.length > 0 ? `${index + 1} / ${photos.length}` : ""}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-full p-1 text-white hover:bg-white/10">
          <X size={26} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {photo && (
          <div
            ref={stageRef}
            className="flex h-full w-full items-center justify-center overflow-hidden"
            style={{ cursor: scale > 1 ? "grab" : "zoom-in", touchAction: "none" }}
            onWheel={onWheel}
            onDoubleClick={onDoubleClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.uri}
              alt={`Photo ${index + 1}`}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: drag.current ? "none" : "transform 120ms ease-out" }}
            />
          </div>
        )}

        {index > 0 && (
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/15 p-2 text-white hover:bg-white/30">
            <ChevronLeft size={28} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/15 p-2 text-white hover:bg-white/30">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  )
}
