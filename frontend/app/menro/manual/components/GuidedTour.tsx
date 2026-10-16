"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export interface TourStep {
  /** Matches a data-tour="..." attribute on the element to highlight */
  target: string
  title: string
  description: string
  /** Preferred side for the tooltip. Flips automatically if there's no room. */
  placement?: "top" | "bottom" | "left" | "right"
}

interface GuidedTourProps {
  steps: TourStep[]
  onFinish: () => void
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

type Placement = "top" | "bottom" | "left" | "right"

const PAD = 6 // breathing room around the highlighted element
const GAP = 16 // distance between highlight and tooltip (room for the arrow)
const MARGIN = 12 // minimum distance from the viewport edge
const TIP_W = 320

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

export default function GuidedTour({ steps, onFinish }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const [tipH, setTipH] = useState(170)
  const tipRef = useRef<HTMLDivElement>(null)

  // Keep the latest onFinish without re-triggering effects
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const step = steps[index]
  const isLast = index === steps.length - 1

  const next = useCallback(() => {
    if (isLast) onFinishRef.current()
    else setIndex((i) => i + 1)
  }, [isLast])

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  const getTarget = useCallback(
    () => document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`),
    [step.target]
  )

  const measure = useCallback(() => {
    const el = getTarget()
    if (!el) return false
    const r = el.getBoundingClientRect()
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
    setVp({ w: window.innerWidth, h: window.innerHeight })
    return true
  }, [getTarget])

  // When the step changes: scroll the target into view, then measure it.
  // If the target doesn't exist (e.g. hidden for this role), skip the step.
  useLayoutEffect(() => {
    const el = getTarget()
    if (!el) {
      next()
      return
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest" })
    measure()
    const raf = requestAnimationFrame(measure) // re-measure after layout settles
    return () => cancelAnimationFrame(raf)
  }, [getTarget, measure, next])

  // Keep the spotlight glued to the element on resize / scroll
  useEffect(() => {
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [measure])

  // Measure the real tooltip height so positioning is accurate
  useLayoutEffect(() => {
    if (tipRef.current) {
      const h = tipRef.current.offsetHeight
      if (h && h !== tipH) setTipH(h)
    }
  }, [index, box, tipH])

  // Keyboard: Enter / → = Okay, ← = Back, Esc = skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinishRef.current()
      else if (e.key === "Enter" || e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") back()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, back])

  if (!box) {
    // Still measuring: just block clicks
    return createPortal(<div className="fixed inset-0 z-[60]" />, document.body)
  }

  // ---- Positioning ----
  const spot = {
    top: box.top - PAD,
    left: box.left - PAD,
    width: box.width + PAD * 2,
    height: box.height + PAD * 2,
  }
  const spotRight = spot.left + spot.width
  const spotBottom = spot.top + spot.height
  const tipW = Math.min(TIP_W, vp.w - MARGIN * 2)

  // Centre of the *visible* part of the target (matters for tall elements like the sidebar)
  const cx = (Math.max(spot.left, 0) + Math.min(spotRight, vp.w)) / 2
  const cy = (Math.max(spot.top, 0) + Math.min(spotBottom, vp.h)) / 2

  const fits: Record<Placement, boolean> = {
    bottom: spotBottom + GAP + tipH + MARGIN <= vp.h,
    top: spot.top - GAP - tipH - MARGIN >= 0,
    right: spotRight + GAP + tipW + MARGIN <= vp.w,
    left: spot.left - GAP - tipW - MARGIN >= 0,
  }
  const preferred = step.placement ?? "bottom"
  const order: Placement[] = [preferred, "bottom", "top", "right", "left"]
  const placement = order.find((p) => fits[p]) ?? preferred

  let top = 0
  let left = 0
  if (placement === "bottom") {
    top = spotBottom + GAP
    left = cx - tipW / 2
  } else if (placement === "top") {
    top = spot.top - GAP - tipH
    left = cx - tipW / 2
  } else if (placement === "right") {
    left = spotRight + GAP
    top = cy - tipH / 2
  } else {
    left = spot.left - GAP - tipW
    top = cy - tipH / 2
  }
  left = clamp(left, MARGIN, vp.w - tipW - MARGIN)
  top = clamp(top, MARGIN, vp.h - tipH - MARGIN)

  // Arrow points at the target's centre, kept inside the tooltip's rounded corners
  const arrowX = clamp(cx - left, 24, tipW - 24)
  const arrowY = clamp(cy - top, 24, tipH - 24)

  const arrowStyle: React.CSSProperties =
    placement === "bottom"
      ? { top: -7, left: arrowX - 6 }
      : placement === "top"
      ? { bottom: -7, left: arrowX - 6 }
      : placement === "right"
      ? { left: -7, top: arrowY - 6 }
      : { right: -7, top: arrowY - 6 }

  const arrowBorder =
    placement === "bottom"
      ? "border-l border-t"
      : placement === "top"
      ? "border-r border-b"
      : placement === "right"
      ? "border-l border-b"
      : "border-t border-r"

  return createPortal(
    <>
      {/* Click blocker so the page can't be used mid-tour */}
      <div className="fixed inset-0 z-[60]" />

      {/* Spotlight: transparent hole, everything else dimmed by the huge shadow */}
      <div
        className="pointer-events-none fixed z-[60] rounded-xl"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow: "0 0 0 2px #22c55e, 0 0 0 9999px rgba(15, 23, 42, 0.65)",
          transition: "all 250ms ease",
        }}
      />

      {/* Tooltip */}
      <div
        ref={tipRef}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        className="fixed z-[70] rounded-xl border border-gray-200 bg-white shadow-xl"
        style={{ top, left, width: tipW, transition: "top 250ms ease, left 250ms ease" }}
      >
        <div
          className={`absolute h-3 w-3 rotate-45 bg-white border-gray-200 ${arrowBorder}`}
          style={arrowStyle}
        />

        {/* Inner wrapper scrolls if the content is taller than the screen; the arrow stays outside it */}
        <div
          className="overflow-y-auto p-4"
          style={{ maxHeight: Math.max(vp.h - MARGIN * 2 - 2, 160) }}
        >
          <p className="text-[11px] font-medium text-green-700 mb-1">
            Step {index + 1} of {steps.length}
          </p>
          <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.description}</p>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onFinishRef.current()}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                autoFocus
                className="rounded-lg bg-green-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-800"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}