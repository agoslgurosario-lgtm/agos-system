"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";

import AlertModal from "@/components/Alerts/AlertModal";

import { useAlerts, type AlertTypeFilter, type DateFilter } from "@/lib/hooks/useAlerts";
import { ALERT_META, ALERT_STYLE } from "@/lib/alerts";
import { getUser } from "@/lib/auth";
import type { Alert } from "@/types/alert";

const PAGE_SIZE = 10; // minimum rows per page
// used to work out how many rows fit on screen (header row, row height, pagination footer, bottom gap)
const THEAD_H = 40;
const ROW_H = 45;
const FOOTER_H = 56;
const BOTTOM_GAP = 16;
const ALL_BARANGAYS = "All";

// Same chips as the admin alerts page. Remove any your Barangay users shouldn't see.
// ("Report Submitted" is intentionally not here, and useAlerts drops those alerts.)
const TYPE_CHIPS: { value: string; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Water_Level_Rising", label: "Water Level Rising" },
  { value: "Low_Clog_Alert", label: "Low Clog" },
  { value: "Moderate_Clog_Alert", label: "Moderate Clog" },
  { value: "Critical_Clog", label: "Critical Clog" },
  { value: "Node_Offline", label: "Node Offline" },
  { value: "Low_Battery", label: "Low Battery" },
  { value: "Weak_Signal", label: "Weak Signal" },
  { value: "Sensor_Failure", label: "Sensor Failure" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "Today", label: "Today" },
  { value: "7Days", label: "Last 7 days" },
  { value: "30Days", label: "Last 30 days" },
];

function formatDetectedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// What the Type column shows. Types missing from ALERT_META (Weak_Signal, Node_Offline, ...)
// fall back to the chip label, then to the raw type with underscores removed.
function typeLabel(alertType: string) {
  return (
    ALERT_META[alertType as keyof typeof ALERT_META]?.label ??
    TYPE_CHIPS.find((c) => c.value === alertType)?.label ??
    alertType.replace(/_/g, " ")
  );
}

function SelectBox({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-[#1565C0]"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

function AlertsContent() {
  const [alertType, setAlertType] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("Today");
  const [barangay, setBarangay] = useState(ALL_BARANGAYS);
  const [query, setQuery] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [page, setPage] = useState(1);

  const {
    alerts: allAlerts,
    loading,
    refreshing,
    error,
    refetch,
    markAsRead,
  } = useAlerts(alertType as AlertTypeFilter, dateFilter);

  // Barangay users only see their own barangay's alerts. Admin/MENRO have no barangay, so see all.
  // Read in an effect so the server render and first client render match.
  type Scope = { id: number | null; name: string | null } | null;
  const [scope, setScope] = useState<Scope>(null);
  useEffect(() => {
    const u = getUser() as {
      user_role?: string;
      barangay_id?: number | null;
      barangay_details?: { barangay_name?: string } | null;
    } | null;
    if (u && (u.user_role === "Barangay" || u.barangay_id != null)) {
      setScope({ id: u.barangay_id ?? null, name: u.barangay_details?.barangay_name ?? null });
    }
  }, []);

  const alerts = useMemo(() => {
    if (!scope) return allAlerts;
    // match by id when the alert has one, otherwise by name; anything we can't match is hidden
    return allAlerts.filter((a) =>
      a.barangay_id != null && scope.id != null
        ? a.barangay_id === scope.id
        : !!scope.name && a.barangay_name === scope.name
    );
  }, [allAlerts, scope]);

  const alertId = useSearchParams().get("alertId");
  const openedRef = useRef<string | null>(null);

  const handleRowClick = (alert: Alert) => {
    setSelectedAlert(alert);
    if (!alert.is_read) markAsRead(alert.alert_id);
  };

  // open a specific alert when linked from a notification (?alertId=123)
  useEffect(() => {
    if (!alertId || loading || openedRef.current === alertId) return;
    const match = alerts.find((a) => String(a.alert_id) === alertId);
    if (match) {
      openedRef.current = alertId;
      handleRowClick(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId, loading, alerts]);

  // Barangay options come from the data itself. Barangay-role users only receive
  // their own barangay's alerts, so the dropdown hides itself for them.
  const barangayOptions = useMemo(() => {
    const names = new Set<string>();
    alerts.forEach((a) => a.barangay_name && names.add(a.barangay_name));
    return Array.from(names).sort();
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (barangay !== ALL_BARANGAYS && a.barangay_name !== barangay) return false;
      if (!q) return true;
      return [
        a.node_name,
        a.barangay_name,
        typeLabel(a.alert_type),
        a.alert_type.replace(/_/g, " "), // "weak signal", "low clog alert", ...
        formatDetectedAt(a.timestamp),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [alerts, query, barangay]);

  // Show as many rows as fit the screen so the table fills the card (never fewer than PAGE_SIZE)
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    const calc = () => {
      const el = tableWrapRef.current;
      if (!el) return;
      const available =
        window.innerHeight - el.getBoundingClientRect().top - THEAD_H - FOOTER_H - BOTTOM_GAP;
      setPageSize(Math.max(PAGE_SIZE, Math.floor(available / ROW_H)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // if the list shrinks (filters, live updates), never stay on a page that no longer exists
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const busy = loading || refreshing;

  return (
    // no padding of its own: the layout already pads the page, like the admin alerts page
    <div className="flex min-h-full flex-col gap-3">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[400px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search notification…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-[#1565C0]"
          />
        </div>

        <div className="flex items-center gap-2">
          {barangayOptions.length > 1 && (
            <SelectBox
              value={barangay}
              onChange={(v) => {
                setBarangay(v);
                setPage(1);
              }}
            >
              <option value={ALL_BARANGAYS}>All Barangay</option>
              {barangayOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </SelectBox>
          )}

          <SelectBox
            value={dateFilter}
            onChange={(v) => {
              setDateFilter(v as DateFilter);
              setPage(1);
            }}
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectBox>
        </div>
      </div>

      {/* Notifications card */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="mr-2 text-base font-bold text-[#122A48]">Notifications</h2>
          {/* chips sit on the right, same as the admin alerts page */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {TYPE_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => {
                  setAlertType(chip.value);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  alertType === chip.value
                    ? "border-[#1565C0] bg-[#1565C0] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={tableWrapRef} className="flex flex-1 flex-col overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[14%] px-4 py-3 font-semibold">Node</th>
                <th className="w-[26%] px-4 py-3 font-semibold">Type</th>
                <th className="w-[30%] px-4 py-3 font-semibold">Barangay</th>
                <th className="w-[30%] px-4 py-3 font-semibold">Detected</th>
              </tr>
            </thead>
            <tbody>
              {!busy &&
                !error &&
                rows.map((a) => {
                  const style = ALERT_STYLE[a.alert_type];
                  return (
                    <tr
                      key={a.alert_id}
                      onClick={() => handleRowClick(a)}
                      className="cursor-pointer border-t border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <td className={`px-4 py-3.5 ${a.is_read ? "" : "font-semibold"}`}>
                        {a.node_name ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style?.badgeBg} ${style?.badgeText}`}
                        >
                          {typeLabel(a.alert_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">{a.barangay_name ?? "—"}</td>
                      <td className="px-4 py-3.5">{formatDetectedAt(a.timestamp)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {busy && !error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-sm text-slate-600">
              <LoaderCircle className="animate-spin text-[#2F6FED]" />
              Loading...
            </div>
          )}

          {error && (
            <div className="flex flex-1 flex-col items-center justify-center py-10">
              <p className="mb-3 text-sm font-semibold text-[#D81010]">
                Failed to load alerts. Please try again.
              </p>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
              >
                Retry
              </button>
            </div>
          )}

          {!busy && !error && filtered.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-10">
              <p className="text-center text-sm text-slate-500">No alerts found.</p>
            </div>
          )}
        </div>

        {/* "Page 1 of N" + Previous / Next, same footer as the Waste Classification page */}
        {!busy && !error && filtered.length > 0 && (
          <div className="mt-auto flex items-center justify-between border-t border-slate-200 px-3 py-3">
            <p className="text-xs text-[#727272]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#122A48] hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#122A48] hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense>
      <AlertsContent />
    </Suspense>
  );
}