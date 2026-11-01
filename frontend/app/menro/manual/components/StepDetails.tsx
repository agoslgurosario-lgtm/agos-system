"use client"

import { useState } from "react"
import PreviousNextButtons from "./PreviousNextButtons"

interface ExtraSection {
  label?: string
  description: string
  imageUrl?: string | string[]
}

interface StepDetailProps {
  stepIndex: number
  totalSteps: number
  title: string
  description: string
  imageUrl?: string | string[]
  whyItMatters: string
  extraSections?: ExtraSection[]
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
  nextLabel?: string
}

const toArray = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : [])

function ExpandLabel() {
  return (
    <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
      >
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
      Click to expand
    </span>
  )
}
function ImageGrid({
  urls,
  alt,
  onOpen,
  tour,
}: {
  urls: string[]
  alt: string
  onOpen: (src: string, alt: string) => void
  tour?: boolean
}) {
  return (
    <div
      {...(tour ? { "data-tour": "step-image" } : {})}
      className="mb-5 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${urls.length}, minmax(0, 1fr))` }}
    >
      {urls.map((src, i) => (
        <div key={src} className="group">
          <button
            type="button"
            onClick={() => onOpen(src, urls.length > 1 ? `${alt} (${i + 1})` : alt)}
            className="relative block w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200"
          >
            <img src={src} alt={alt} className="block h-auto w-full" />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            <ExpandLabel />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function StepDetail({
  stepIndex,
  totalSteps,
  title,
  description,
  imageUrl,
  whyItMatters,
  extraSections,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  nextLabel,
}: StepDetailProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)

  const mainImages = toArray(imageUrl)

  return (
    <>
    <div className="flex-1 min-h-0 max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-green-700 font-small">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <PreviousNextButtons
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          nextLabel={nextLabel}
        />
      </div>

      <div data-tour="step-content">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4 whitespace-pre-line">{description}</p>
      </div>

      {/* Main Step Image(s) */}
      {mainImages.length > 0 ? (
        <ImageGrid
          urls={mainImages}
          alt={title}
          tour
          onOpen={(src, alt) => setLightboxImage({ src, alt })}
        />
      ) : (
        <div data-tour="step-image" className="bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm mb-5">
          Screenshot placeholder
        </div>
      )}

      {/* Extra Sections Images */}
      {extraSections?.map((section, i) => {
        const sectionImages = toArray(section.imageUrl)

        return (
          <div key={i}>
            {section.label && (
              <h2 className="text-sm font-semibold text-gray-900">{section.label}</h2>
            )}
            <p className="text-xs text-gray-500 mt-1 mb-4 whitespace-pre-line">
              {section.description}
            </p>

            {sectionImages.length > 0 ? (
              <ImageGrid
                urls={sectionImages}
                alt={section.label || "Section image"}
                onOpen={(src, alt) => setLightboxImage({ src, alt })}
              />
            ) : (
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm mb-5">
                Screenshot placeholder
              </div>
            )}
          </div>
        )
      })}

      <div data-tour="step-why">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Why is this important?</h3>
        <p className="text-xs text-gray-500 mb-4">{whyItMatters}</p>
      </div>
    </div>

    {/* Lightbox */}
    {lightboxImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        onClick={() => setLightboxImage(null)}
      >
        <button
          type="button"
          onClick={() => setLightboxImage(null)}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <img
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}