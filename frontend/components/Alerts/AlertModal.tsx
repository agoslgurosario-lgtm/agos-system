"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { ALERT_META, ALERT_STYLE } from "@/lib/alerts";
import { formatWeight } from "@/lib/formatWeight";
import type { Alert, AlertContext } from "@/types/alert";

type Props = { alert: Alert | null; onClose: () => void };

const pct = (v?: number | null) => (v == null ? null : `${Math.round(v * 10) / 10}%`);

function contextRows(ctx: AlertContext): { label: string; value: string }[] {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Severity", value: ctx.severity },
    { label: "Water level", value: ctx.water_level != null ? `${ctx.water_level} cm` : null },
    { label: "Water level (% of canal)", value: pct(ctx.water_level_pct) },
    { label: "Warning threshold", value: pct(ctx.warning_pct) },
    { label: "Critical threshold", value: pct(ctx.critical_pct) },
    { label: "Water flow", value: ctx.water_flow },
    { label: "Flow rate", value: ctx.water_flow_rate != null ? String(ctx.water_flow_rate) : null },
    { label: "Clog level", value: pct(ctx.clog_pct) },
    { label: "Dominant waste", value: ctx.dominant_waste_type },
    { label: "Estimated volume", value: ctx.estimated_volume != null ? formatWeight(ctx.estimated_volume) : null },
    { label: "Confidence", value: pct(ctx.confidence) },
    { label: "Biodegradable", value: pct(ctx.biodegradable_pct) },
    { label: "Recyclable", value: pct(ctx.recyclable_pct) },
    { label: "Residual", value: pct(ctx.residual_pct) },
    { label: "Special waste", value: pct(ctx.special_waste_pct) },
    { label: "Waste type", value: ctx.waste_type },
    { label: "Originally named", value: ctx.original_name },
    { label: "Reason", value: ctx.reason },
  ];
  return rows.filter((r): r is { label: string; value: string } => !!r.value);
}

export default function AlertModal({ alert, onClose }: Props) {
  useEffect(() => {
    if (!alert) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alert, onClose]);

  if (!alert) return null;

  const meta = ALERT_META[alert.alert_type];
  const style = ALERT_STYLE[alert.alert_type];
  const rows = alert.alert_context ? contextRows(alert.alert_context) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style?.badgeBg} ${style?.badgeText}`}
            >
              {meta?.label ?? alert.alert_type}
            </span>
            <p className="mt-2 text-sm font-bold text-[#122A48]">{alert.node_name ?? "Unknown node"}</p>
            <p className="text-xs text-slate-500">
              {alert.barangay_name ?? "—"} ·{" "}
              {new Date(alert.timestamp).toLocaleString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No extra details for this alert.</p>
          ) : (
            <dl className="space-y-2.5 text-xs">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{r.label}</dt>
                  <dd className="text-right font-semibold text-slate-800">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
