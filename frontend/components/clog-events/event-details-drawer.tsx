"use client";

import { useEffect } from "react";
import {
  Check,
  Clock,
  Cpu,
  Droplet,
  Gauge,
  LayoutGrid,
  Scale,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ClogEvent } from "@/types/clog-event";
import { formatDateTime } from "@/lib/clog-utils";
import { SeverityBadge, StatusBadge } from "./badges";

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-[#0f2747]">{value}</p>
      </div>
    </div>
  );
}

function Timeline({ event }: { event: ClogEvent }) {
  const responded = !!event.respondedAt && !event.autoCleared;
  return (
    <div>
      <h3 className="mb-3 text-lg font-bold text-[#0f2747]">Timeline</h3>

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-red-600">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <span
            className={`my-1 w-0.5 flex-1 ${responded ? "bg-blue-600" : "bg-green-600"}`}
          />
        </div>
        <div className="pb-4">
          <p className="font-bold text-[#0f2747]">Detected</p>
          <p className="text-sm text-gray-500">{formatDateTime(event.detectedAt)}</p>
          <p className="text-sm text-gray-500">Detected by System</p>
        </div>
      </div>

      <div className="flex gap-3">
        {responded ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-600 text-green-600">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
        <div>
          <p className="font-bold text-[#0f2747]">Responded</p>
          {responded ? (
            <>
              <p className="text-sm text-gray-500">Response team deployed</p>
              <p className="text-sm text-gray-500">{formatDateTime(event.respondedAt)}</p>
              {event.respondedBy && (
                <p className="text-sm text-gray-500">by: {event.respondedBy}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">No response recorded</p>
              <p className="text-sm text-gray-500">
                Auto-cleared after 7 days with no resolution
              </p>
              <p className="text-sm text-gray-500">{formatDateTime(event.clearedAt)}</p>
            </>
          )}
        </div>
      </div>

      {event.autoCleared && (
        <p className="mt-6 text-center text-sm text-gray-400">
          This event cleared on its own, so no response report is needed.
        </p>
      )}
    </div>
  );
}

interface Props {
  event: ClogEvent | null;
  onClose: () => void;
}

export function EventDetailsDrawer({ event, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-[#f5f8fb] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0f2747]">Event Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <SeverityBadge severity={event.severity} />
            <StatusBadge status={event.status} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#0f2747]">{event.barangay}</h3>
            <p className="text-sm text-gray-400">{event.nodeId}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoTile
              icon={LayoutGrid}
              label="Classification"
              value={event.classification ?? "None"}
            />
            <InfoTile
              icon={Scale}
              label="Estimated Weight (AI)"
              value={`${event.estimatedWeightG > 0 ? "~ " : ""}${event.estimatedWeightG} g`}
            />
            <InfoTile icon={Cpu} label="Reading ID" value={String(event.readingId)} />
            <InfoTile icon={Droplet} label="Water Level" value={`${event.waterLevelCm} cm`} />
            <InfoTile icon={Waves} label="Water Flow" value={`${event.waterFlowMs} m/s`} />
            <InfoTile icon={Gauge} label="Clog %" value={`${event.clogPercent}%`} />
            <InfoTile icon={Clock} label="Detected At" value={formatDateTime(event.detectedAt)} />
          </div>

          <Timeline event={event} />
        </div>
      </aside>
    </div>
  );
}
