"use client";

import { useState } from "react";

interface Range {
  start: string; // yyyy-mm-dd
  end: string;
}

interface Props {
  value: Range;
  onApply: (r: Range) => void;
  onClear: () => void;
}

const inputCls =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-500";

export function DateRangeFilter({ value, onApply, onClear }: Props) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className={inputCls}
        value={draft.start}
        max={draft.end}
        onChange={(e) => setDraft({ ...draft, start: e.target.value })}
      />
      <span className="text-xs text-gray-500">to</span>
      <input
        type="date"
        className={inputCls}
        value={draft.end}
        min={draft.start}
        onChange={(e) => setDraft({ ...draft, end: e.target.value })}
      />
      <button
        onClick={() => {
          onClear();
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        Clear
      </button>
      <button
        onClick={() => draft.start && draft.end && onApply(draft)}
        className="rounded-md bg-[#0f2747] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16345f]"
      >
        Apply
      </button>
    </div>
  );
}
