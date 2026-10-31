import { AlertTriangle, AlertCircle, CheckCircle2, Calendar, MapPin } from "lucide-react";
import type { DetectionSeverity, DetectionStatus } from "@/types/analytics";
import { formatWeight } from "@/lib/formatWeight";

interface Props {
  node: string;
  location: string;
  severity: DetectionSeverity;
  status: DetectionStatus;
  volume: number | null;
  timestamp?: string | null;
}

const SEVERITY_STYLE: Record<DetectionSeverity, { Icon: typeof AlertTriangle; color: string }> = {
  High: { Icon: AlertTriangle, color: "#EF4444" },
  Moderate: { Icon: AlertCircle, color: "#EAB308" },
  Low: { Icon: AlertCircle, color: "#3B82F6" },
  None: { Icon: CheckCircle2, color: "#22C55E" },
};

function describeSeverity(severity: DetectionSeverity, volume: number | null) {
  if (severity === "None") return "No detection";
  return `${severity} volume${volume != null ? ` (${formatWeight(volume)})` : ""}`;
}

function formatWhen(ts?: string | null) {
  if (!ts) return "No recent reading";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DetectionRow({ node, location, severity, status, volume, timestamp }: Props) {
  const { Icon, color } = SEVERITY_STYLE[severity];
  const detected = status === "Detected";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800">{node}</p>
        <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-600">
          <MapPin size={11} className="shrink-0 text-slate-500" />
          {location}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Icon size={11} color={color} className="shrink-0" />
          {describeSeverity(severity, volume)}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
        <Calendar size={12} />
        <span className="whitespace-nowrap">{formatWhen(timestamp)}</span>
      </div>

      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
          detected ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
        }`}
      >
        {status}
      </span>
    </div>
  );
}