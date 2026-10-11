"use client"

import { useState } from "react"

interface StepImagesProps {
  images?: string[]
  alt?: string
}

function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}

export default function StepImages({ images, alt = "" }: StepImagesProps) {
  const [openSrc, setOpenSrc] = useState<string | null>(null)

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm mb-5">
        Screenshot placeholder
      </div>
    )
  }

  return (
    <>
      <div
        className={`grid gap-3 mb-5 ${
          images.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpenSrc(src)}
            className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-95 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} screenshot ${i + 1}`}
              className="w-full h-full object-contain bg-white"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

            {/* Expand button */}
            <span
              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExpandIcon />
              Click to expand
            </span>
          </button>
        ))}
      </div>

      {openSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpenSrc(null)}
        >
          <div className="relative max-w-full max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={openSrc}
              alt={alt}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenSrc(null)
              }}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}