"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Poppins } from "next/font/google";
import {FileDown} from "lucide-react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* ---------- Types ---------- */

type Status = "normal" | "warning" | "critical";
type StatusFilter = Status | "all";
type ConnFilter = "all" | "online" | "offline";

interface Reading {
  id: string;
  recordedAt: string;
  waterLevelCm: number;
  waterFlowMs: number;
  clogPercentage: number;
  waterLevelStatus: Status;
  clogStatus: Status;
  status: Status;
}

interface HealthCheck {
  id: string;
  checkedAt: string;
  batteryVolts: number;
  batteryPercent: number;
  signalDbm: number;
  waterSensor: "OK" | "Fault";
  firmware: string;
  status: Status;
}

interface SensorNode {
  id: string;
  name: string;
  zone: string;
  readings: Reading[];
  health: HealthCheck[];
}

interface DateRange {
  from: string;
  to: string;
}

/* ---------- Sample data ---------- */

const at = (value: string) =>
  new Date(`${value}:00+08:00`).toISOString();

const GAPS = [
  98, 121, 87, 143, 76, 110, 132, 95, 118, 84, 127, 104, 91, 138, 79, 115,
  101, 89, 124, 106, 93, 135, 82, 119, 97, 112, 86, 129,
];

function sampleReadings(): Reading[] {
  const out: Reading[] = [];
  let time = new Date("2026-10-06T21:32:00+08:00").getTime();

  for (let i = 0; i < 29; i++) {
    const critical = i < 19;
    const k = critical ? Math.max(0, i - 7) : i - 19;
    const status: Status = critical ? "critical" : "warning";

    out.push({
      id: `r-${i}`,
      recordedAt: new Date(time).toISOString(),
      waterLevelCm: critical ? 45 - k * 0.3 : 38 - k * 1.1,
      waterFlowMs: critical ? 0.0001 : 0.0001 + k * 0.00003,
      clogPercentage: critical ? 85 - k * 0.4 : 78 - k * 2.4,
      waterLevelStatus: status,
      clogStatus: status,
      status,
    });

    time -= GAPS[i % GAPS.length] * 60000;
  }

  return out;
}

function check(
  id: string,
  when: string,
  volts: number,
  percent: number,
  dbm: number
): HealthCheck {
  const low = dbm < -90 || percent < 20;

  return {
    id,
    checkedAt: at(when),
    batteryVolts: volts,
    batteryPercent: percent,
    signalDbm: dbm,
    waterSensor: "OK",
    firmware: "1.0.0",
    status: low ? "warning" : "normal",
  };
}

const SAMPLE_NODES: SensorNode[] = [
  {
    id: "SN-1",
    name: "CN-Poblacion West-1",
    zone: "Poblacion West",
    readings: [],
    health: [check("h1-0", "2026-10-02T16:40", 3.31, 14, -93)],
  },
  {
    id: "SN-2",
    name: "CN-Poblacion West-2",
    zone: "Poblacion West",
    readings: sampleReadings(),
    health: [
      check("h2-0", "2026-10-01T12:17", 3.7, 58, -77),
      check("h2-1", "2026-10-01T11:56", 3.7, 58, -75),
      check("h2-2", "2026-10-01T11:36", 3.7, 58, -77),
      check("h2-3", "2026-10-01T11:16", 3.71, 59, -79),
      check("h2-4", "2026-10-01T10:56", 3.71, 59, -93),
      check("h2-5", "2026-10-01T10:36", 3.72, 60, -76),
      check("h2-6", "2026-10-01T10:16", 3.72, 60, -74),
    ],
  },
  {
    id: "SN-7",
    name: "CN-Poblacion West-6",
    zone: "Poblacion West",
    readings: [],
    health: [],
  },
];

/* ---------- Formatting helpers ---------- */

const TZ = "Asia/Manila";

const STATUS_STYLE: Record<
  Status,
  { label: string; pill: string }
> = {
  normal: {
    label: "Normal",
    pill: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    label: "Warning",
    pill: "bg-amber-100 text-amber-700",
  },
  critical: {
    label: "Critical",
    pill: "bg-red-100 text-red-700",
  },
};

const FILTERS: StatusFilter[] = [
  "all",
  "normal",
  "warning",
  "critical",
];

const READING_HEADERS = [
  "Timestamp",
  "Water Level",
  "Flow Rate",
  "Clog %",
  "Water Status",
  "Clog Status",
  "Overall Status",
];

const HEALTH_HEADERS = [
  "Timestamp",
  "Battery",
  "Signal",
  "Sensor",
  "Firmware",
  "Status",
];

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const datePartsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
});

function fmt(iso: string) {
  return dateTimeFmt.format(new Date(iso));
}

function dateKey(iso: string) {
  const parts = Object.fromEntries(
    datePartsFmt
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateLabel(value: string) {
  return dateLabelFmt.format(
    new Date(`${value}T00:00:00+08:00`)
  );
}

function getInitialDateRange(): DateRange {
  const today = dateKey(new Date().toISOString());

  return {
    from: `${today.slice(0, 7)}-01`,
    to: today,
  };
}

function inDateRange(iso: string, range: DateRange) {
  const value = dateKey(iso);

  return (
    (!range.from || value >= range.from) &&
    (!range.to || value <= range.to)
  );
}

function dateRangeLabel(range: DateRange) {
  if (range.from && range.to) {
    return range.from === range.to
      ? dateLabel(range.from)
      : `${dateLabel(range.from)} – ${dateLabel(range.to)}`;
  }

  if (range.from) {
    return `dates from ${dateLabel(range.from)}`;
  }

  if (range.to) {
    return `dates through ${dateLabel(range.to)}`;
  }

  return "all dates";
}

function exportRangeKey(range: DateRange) {
  return `${range.from || "start"}-to-${range.to || "latest"}`;
}

function ago(iso: string, now: number) {
  const minutes = Math.floor(
    (now - new Date(iso).getTime()) / 60000
  );

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function countBy(
  items: { status: Status }[]
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: items.length,
    normal: 0,
    warning: 0,
    critical: 0,
  };

  items.forEach((item) => {
    counts[item.status] += 1;
  });

  return counts;
}

function isOnline(node: SensorNode, now: number | null) {
  const latest = node.readings[0];

  if (now === null || !latest) return false;

  const elapsed = now - new Date(latest.recordedAt).getTime();

  return elapsed >= 0 && elapsed < 3600000;
}

function downloadCsv(
  filename: string,
  rows: (string | number)[][]
) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Icons ---------- */

const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SignalIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 4v16" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...svgProps} width={14} height={14}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...svgProps} width={15} height={15}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg {...svgProps} width={14} height={14}>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      {...svgProps}
      width={20}
      height={20}
      strokeWidth={1.8}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg {...svgProps} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

function OffIcon() {
  return (
    <svg {...svgProps} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

/* ---------- Shared pieces ---------- */

const SELECT =
  "h-9 rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1565c0]";

const TH =
  "whitespace-nowrap bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500";

const TD = "whitespace-nowrap px-4 py-3 align-middle";

function Pill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status].pill}`}
    >
      {STATUS_STYLE[status].label}
    </span>
  );
}

function ConnState({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold ${
        online
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />

      {online ? "Online" : "Offline"}
    </span>
  );
}

function StatusSelect({
  label,
  allLabel,
  value,
  counts,
  onChange,
  className = SELECT,
}: {
  label: string;
  allLabel: string;
  value: StatusFilter;
  counts?: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) =>
        onChange(event.target.value as StatusFilter)
      }
      className={className}
    >
      {FILTERS.map((filter) => (
        <option key={filter} value={filter}>
          {filter === "all"
            ? allLabel
            : STATUS_STYLE[filter].label}
          {counts ? ` (${counts[filter]})` : ""}
        </option>
      ))}
    </select>
  );
}

function DateRangeFilter({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const wrapperClass =
    "inline-flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-[#1565c0]";

  const inputClass =
    "min-w-0 bg-transparent text-[12px] font-medium text-[#122A48] outline-none [color-scheme:light]";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={wrapperClass}>
        <span className="text-[12px] text-slate-500">
          From
        </span>

        <input
          type="date"
          aria-label="History start date"
          value={range.from}
          max={range.to || undefined}
          onChange={(event) => {
            const from = event.target.value;

            onChange({
              from,
              to:
                from && range.to && from > range.to
                  ? from
                  : range.to,
            });
          }}
          className={inputClass}
        />
      </label>

      <label className={wrapperClass}>
        <span className="text-[12px] text-slate-500">
          To
        </span>

        <input
          type="date"
          aria-label="History end date"
          value={range.to}
          min={range.from || undefined}
          onChange={(event) => {
            const to = event.target.value;

            onChange({
              from:
                to && range.from && to < range.from
                  ? to
                  : range.from,
              to,
            });
          }}
          className={inputClass}
        />
      </label>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages < 1) return null;

  const buttonClass =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-[#FAFCFD] px-[10px] text-[12px] font-medium text-[#88898D] transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:opacity-50 disabled:hover:bg-[#FAFCFD]";

  return (
    <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-[13px] text-[#88898D]">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={buttonClass}
        >
          <svg {...svgProps} width={14} height={14}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Previous
        </button>

        <button
          type="button"
          onClick={() =>
            onPage(Math.min(totalPages, page + 1))
          }
          disabled={page === totalPages}
          className={buttonClass}
        >
          Next
          <svg {...svgProps} width={14} height={14}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Empty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <p className="font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-[13px] text-slate-500">
        {text}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  tint,
  value,
  label,
}: {
  icon: ReactNode;
  tint: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tint}`}
      >
        {icon}
      </span>

      <div>
        <p className="text-xl font-bold leading-tight tabular-nums text-slate-900">
          {value}
        </p>

        <p className="text-[13px] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[680px] text-left text-[13px] text-[#122A48]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className={TH}>
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Page ---------- */

export default function SensorNodesPage() {
  const nodes = SAMPLE_NODES;

  const [now, setNow] = useState<number | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [conn, setConn] = useState<ConnFilter>("all");
  const [health, setHealth] =
    useState<StatusFilter>("all");
  const [water, setWater] =
    useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const perPage = 12;

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, conn, health, water]);

  const query = search.trim().toLowerCase();

  const visible = nodes.filter((node) => {
    const online = isOnline(node, now);

    return (
      (query === "" ||
        node.id.toLowerCase().includes(query) ||
        node.name.toLowerCase().includes(query) ||
        node.zone.toLowerCase().includes(query)) &&
      (conn === "all" ||
        (conn === "online" ? online : !online)) &&
      (health === "all" ||
        node.health[0]?.status === health) &&
      (water === "all" ||
        node.readings[0]?.status === water)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(visible.length / perPage)
  );

  const currentPage = Math.min(page, totalPages);

  const pagedNodes = visible.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const onlineCount = nodes.filter((node) =>
    isOnline(node, now)
  ).length;

  const viewing =
    nodes.find((node) => node.id === viewId) ?? null;

  return (
    <div
      className={`${poppins.className} flex h-full min-h-0 w-full min-w-0 flex-1 flex-col p-1 text-[13px]`}
    >
      <h1 className="shrink-0 text-[17px] font-semibold text-slate-900">
        Node Management
      </h1>

      <div className="mt-3 grid shrink-0 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<SignalIcon />}
          tint="bg-slate-100 text-slate-600"
          value={nodes.length}
          label="Total Nodes"
        />

        <StatCard
          icon={<CheckCircleIcon />}
          tint="bg-emerald-100 text-emerald-600"
          value={onlineCount}
          label="Online"
        />

        <StatCard
          icon={<OffIcon />}
          tint="bg-blue-100 text-blue-600"
          value={nodes.length - onlineCount}
          label="Offline"
        />
      </div>

      <section
        aria-label="IoT sensor nodes"
        className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-slate-900">
            IoT Sensor Nodes
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search node..."
                aria-label="Search node"
                className="h-9 w-52 rounded-lg bg-white pl-9 pr-3 text-[13px] ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1565c0]"
              />
            </div>

            <select
              aria-label="Filter by connection status"
              value={conn}
              onChange={(event) =>
                setConn(event.target.value as ConnFilter)
              }
              className={SELECT}
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>

            <StatusSelect
              label="Filter by device health"
              allLabel="All Device Health"
              value={health}
              onChange={setHealth}
            />

            <StatusSelect
              label="Filter by water level"
              allLabel="All Water Levels"
              value={water}
              onChange={setWater}
            />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto border-t border-slate-200">
          <table className="w-full min-w-[820px] text-left text-[13px] text-[#122A48]">
            <thead>
              <tr>
                <th className={TH}>Node ID</th>
                <th className={TH}>Barangay</th>
                <th className={TH}>Device Health</th>
                <th className={TH}>Water Level</th>
                <th className={TH}>Last Reading</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pagedNodes.map((node) => {
                const latest = node.readings[0];
                const latestHealth = node.health[0];

                return (
                  <tr
                    key={node.id}
                    className="hover:bg-slate-50"
                  >
                    <td
                      className={`${TD} font-semibold text-[#122A48]`}
                    >
                      {node.id}
                    </td>

                    <td className={`${TD} text-[#122A48]`}>
                      {node.zone}
                    </td>

                    <td className={TD}>
                      {latestHealth ? (
                        <Pill status={latestHealth.status} />
                      ) : (
                        <span className="text-[#122A48]/60">
                          No data
                        </span>
                      )}
                    </td>

                    <td className={TD}>
                      {latest ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono font-semibold tabular-nums text-[#122A48]">
                            {+latest.waterLevelCm.toFixed(1)} cm
                          </span>

                          <Pill status={latest.status} />
                        </span>
                      ) : (
                        <span className="text-[#122A48]/60">
                          No readings yet
                        </span>
                      )}
                    </td>

                    <td
                      className={`${TD} font-medium text-[#122A48]`}
                    >
                      {latest && now !== null
                        ? ago(latest.recordedAt, now)
                        : "—"}
                    </td>

                    <td className={TD}>
                      <ConnState
                        online={isOnline(node, now)}
                      />
                    </td>

                    <td className={TD}>
                      <button
                        type="button"
                        onClick={() => setViewId(node.id)}
                        aria-label={`View ${node.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-sky-50 px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-sky-100"
                      >
                        <HistoryIcon />
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="p-4">
              <Empty
                title="No nodes match"
                text="Try a different search or filter."
              />
            </div>
          )}
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPage={setPage}
        />
      </section>

      {viewing && (
        <NodeModal
          key={viewing.id}
          node={viewing}
          now={now}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  );
}

/* ---------- Node history modal ---------- */

interface TabProps {
  node: SensorNode;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  filter: StatusFilter;
  onFilter: (value: StatusFilter) => void;
}

function NodeModal({
  node,
  now,
  onClose,
}: {
  node: SensorNode;
  now: number | null;
  onClose: () => void;
}) {
  const [tab, setTab] =
    useState<"readings" | "health">("readings");

  const [rf, setRf] = useState<StatusFilter>("all");
  const [hf, setHf] = useState<StatusFilter>("all");

  const [range, setRange] = useState<DateRange>(
    getInitialDateRange
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const tabs = [
    { key: "readings", label: "Readings History" },
    { key: "health", label: "Health History" },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="node-modal-title"
              className="text-[15px] font-semibold text-slate-900"
            >
              {node.id}
            </h2>

            <p className="truncate text-[11px] text-slate-500">
              Node History · {node.name} · {node.zone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ConnState online={isOnline(node, now)} />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Node history"
          className="flex shrink-0 border-y border-slate-200 px-2"
        >
          {tabs.map((item) => (
            <button
              key={item.key}
              id={`node-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              aria-controls="node-history-panel"
              onClick={() => setTab(item.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-[12px] font-medium ${
                tab === item.key
                  ? "border-[#1565c0] text-[#1565c0]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          id="node-history-panel"
          role="tabpanel"
          aria-labelledby={`node-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          {tab === "readings" ? (
            <ReadingsTab
              node={node}
              range={range}
              onRangeChange={setRange}
              filter={rf}
              onFilter={setRf}
            />
          ) : (
            <HealthTab
              node={node}
              range={range}
              onRangeChange={setRange}
              filter={hf}
              onFilter={setHf}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- History toolbar ---------- */

function Toolbar({
  counts,
  props,
  onExport,
  canExport,
}: {
  counts: Record<StatusFilter, number>;
  props: TabProps;
  onExport: () => void;
  canExport: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <StatusSelect
          label="Filter by status"
          allLabel="All Status"
          value={props.filter}
          counts={counts}
          onChange={props.onFilter}
          className={SELECT}
        />

        <DateRangeFilter
          range={props.range}
          onChange={props.onRangeChange}
        />
      </div>

      <button
        type="button"
        onClick={onExport}
        disabled={!canExport}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2FD45B] px-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#26b84f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileDown size={16} className="mr-1" />
        Export
      </button>
    </div>
  );
}

/* ---------- Readings tab ---------- */

function ReadingsTab(props: TabProps) {
  const { node, range, filter } = props;

  const [page, setPage] = useState(1);
  const perPage = 8;

  const inRange = node.readings.filter((reading) =>
    inDateRange(reading.recordedAt, range)
  );

  const counts = countBy(inRange);

  const filtered =
    filter === "all"
      ? inRange
      : inRange.filter(
          (reading) => reading.status === filter
        );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage)
  );

  const currentPage = Math.min(page, totalPages);

  const shown = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to, filter, node.id]);

  const exportCsv = () =>
    downloadCsv(
      `${node.id}-readings-${exportRangeKey(range)}.csv`,
      [
        [
          "Timestamp",
          "Water Level (cm)",
          "Flow Rate (m/s)",
          "Clog %",
          "Water Status",
          "Clog Status",
          "Overall Status",
        ],
        ...filtered.map((reading) => [
          fmt(reading.recordedAt),
          reading.waterLevelCm.toFixed(1),
          reading.waterFlowMs.toFixed(4),
          reading.clogPercentage.toFixed(1),
          STATUS_STYLE[reading.waterLevelStatus].label,
          STATUS_STYLE[reading.clogStatus].label,
          STATUS_STYLE[reading.status].label,
        ]),
      ]
    );

  const emptyText =
    node.readings.length === 0
      ? "No readings recorded for this node yet."
      : inRange.length === 0
        ? `No readings for ${dateRangeLabel(range)}.`
        : `No ${filter} readings for ${dateRangeLabel(range)}.`;

  return (
    <>
      <Toolbar
        counts={counts}
        props={props}
        onExport={exportCsv}
        canExport={filtered.length > 0}
      />

      <DataTable headers={READING_HEADERS}>
        {shown.length > 0 ? (
          shown.map((reading) => (
            <tr
              key={reading.id}
              className="hover:bg-slate-50"
            >
              <td
                className={`${TD} font-medium text-[#122A48]`}
              >
                {fmt(reading.recordedAt)}
              </td>

              <td className={`${TD} tabular-nums`}>
                {reading.waterLevelCm.toFixed(1)} cm
              </td>

              <td className={`${TD} tabular-nums`}>
                {reading.waterFlowMs.toFixed(4)} m/s
              </td>

              <td className={`${TD} tabular-nums`}>
                {reading.clogPercentage.toFixed(1)}%
              </td>

              <td className={TD}>
                <Pill status={reading.waterLevelStatus} />
              </td>

              <td className={TD}>
                <Pill status={reading.clogStatus} />
              </td>

              <td className={TD}>
                <Pill status={reading.status} />
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={READING_HEADERS.length}
              className="px-4 py-16 text-center text-[13px] text-[#122A48]/60"
            >
              {emptyText}
            </td>
          </tr>
        )}
      </DataTable>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPage={setPage}
      />
    </>
  );
}

/* ---------- Health tab ---------- */

function HealthTab(props: TabProps) {
  const { node, range, filter } = props;

  const [page, setPage] = useState(1);
  const perPage = 8;

  const inRange = node.health.filter((healthCheck) =>
    inDateRange(healthCheck.checkedAt, range)
  );

  const counts = countBy(inRange);

  const filtered =
    filter === "all"
      ? inRange
      : inRange.filter(
          (healthCheck) => healthCheck.status === filter
        );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage)
  );

  const currentPage = Math.min(page, totalPages);

  const shown = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to, filter, node.id]);

  const exportCsv = () =>
    downloadCsv(
      `${node.id}-health-${exportRangeKey(range)}.csv`,
      [
        [
          "Timestamp",
          "Battery (V)",
          "Battery (%)",
          "Signal (dBm)",
          "Sensor",
          "Firmware",
          "Status",
        ],
        ...filtered.map((healthCheck) => [
          fmt(healthCheck.checkedAt),
          healthCheck.batteryVolts.toFixed(2),
          healthCheck.batteryPercent,
          healthCheck.signalDbm,
          healthCheck.waterSensor,
          healthCheck.firmware,
          STATUS_STYLE[healthCheck.status].label,
        ]),
      ]
    );

  const emptyText =
    node.health.length === 0
      ? `${node.id} has not reported battery, signal or firmware.`
      : inRange.length === 0
        ? `No health checks for ${dateRangeLabel(range)}.`
        : `No ${filter} health checks for ${dateRangeLabel(range)}.`;

  return (
    <>
      <Toolbar
        counts={counts}
        props={props}
        onExport={exportCsv}
        canExport={filtered.length > 0}
      />

      <DataTable headers={HEALTH_HEADERS}>
        {shown.length > 0 ? (
          shown.map((healthCheck) => (
            <tr
              key={healthCheck.id}
              className="hover:bg-slate-50"
            >
              <td
                className={`${TD} font-medium text-[#122A48]`}
              >
                {fmt(healthCheck.checkedAt)}
              </td>

              <td className={`${TD} tabular-nums`}>
                {healthCheck.batteryVolts.toFixed(2)} V (
                {healthCheck.batteryPercent}%)
              </td>

              <td className={`${TD} tabular-nums`}>
                {healthCheck.signalDbm} dBm
              </td>

              <td className={`${TD} font-medium`}>
                {healthCheck.waterSensor}
              </td>

              <td className={TD}>
                {healthCheck.firmware}
              </td>

              <td className={TD}>
                <Pill status={healthCheck.status} />
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={HEALTH_HEADERS.length}
              className="px-4 py-16 text-center text-[13px] text-[#122A48]/60"
            >
              {emptyText}
            </td>
          </tr>
        )}
      </DataTable>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPage={setPage}
      />
    </>
  );
}

