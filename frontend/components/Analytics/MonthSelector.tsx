"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedMonth: string;
  onSelect: (month: string) => void;
}

function getMonthOptions() {
  const months = [];
  const year = new Date().getFullYear();
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return months;
}

export default function MonthSelector({ visible, onClose, selectedMonth, onSelect }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const options = getMonthOptions();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select month"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-800">Select Month</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <ul className="max-h-[360px] overflow-y-auto">
          {options.map((opt) => {
            const selected = opt.value === selectedMonth;
            return (
              <li key={opt.value}>
                <button
                  onClick={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  className="flex w-full items-center border-b border-slate-100 py-3 text-left hover:bg-slate-50"
                >
                  <span
                    className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected ? "border-[#7FA9B8]" : "border-slate-300"
                    }`}
                  >
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#7FA9B8]" />}
                  </span>
                  <span
                    className={`text-[14px] ${
                      selected ? "font-semibold text-slate-800" : "text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
