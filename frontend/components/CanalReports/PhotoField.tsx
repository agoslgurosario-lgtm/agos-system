"use client"

import { useRef } from "react"
import { Camera, X } from "lucide-react"

export type PhotoItem = { id: string; url: string; file?: File; mediaId?: number }

interface Props {
  label: string
  required?: boolean
  items: PhotoItem[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
}

// dashed "Add Photo" tile plus thumbnails, like the mobile form
export function PhotoField({ label, required, items, onAdd, onRemove, onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <span className="text-[#dc2626]">*</span>}
      </p>
      <div className="flex flex-wrap gap-3">
        {items.map((p) => (
          <div key={p.id} className="group relative h-28 w-28 overflow-hidden rounded-xl border border-[#e2e8f0]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full cursor-zoom-in object-cover" onClick={() => onPreview(p.id)} />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onRemove(p.id)}
              className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#16a34a] bg-[#dcfce7] text-[12px] font-bold text-[#15803d] hover:bg-[#bbf7d0]"
        >
          <Camera size={26} />
          Add Photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) onAdd(files)
            e.target.value = "" // lets the same file be picked again
          }}
        />
      </div>
    </div>
  )
}
