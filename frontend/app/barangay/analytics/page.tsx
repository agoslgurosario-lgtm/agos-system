"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FileDown,
  Loader2,
  MapPin,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import DetectionRow from "@/components/Analytics/DetectionRow";
import WasteProgress from "@/components/Analytics/WasteProgress";
import StatCard from "@/components/Analytics/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/components/hooks/usePagination";
import { useFillRows } from "@/components/hooks/useFillRows";

import { useAnalytics } from "@/lib/hooks/useAnalytics";
import {
  buildComposition,
  buildDetections,
  buildTopBarangays,
} from "@/lib/analytics";
import { formatWeight } from "@/lib/formatWeight";
import { printAnalyticsReport } from "@/lib/printAnalyticsReport";
import { getUser } from "@/lib/auth";

// "YYYY-MM-DD" in local time (toISOString would shift the day for UTC+8)
function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function defaultFrom() {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

// Same look as the filter dropdowns on the Waste Classification page
function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg border-2 border-[#C6C6C8] bg-white px-3 text-xs font-medium text-[#122A48]">
      <span className="text-[#727272]">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs font-medium text-[#122A48] outline-none"
      />
    </label>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-lg border border-[#00000040] bg-[#FAFCFD] p-4 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] ${className}`}
    >
      <h2 className="text-sm font-bold text-[#122A48]">{title}</h2>
      {subtitle && <p className="text-[11px] text-[#727272]">{subtitle}</p>}
      <div className="mt-3 flex-1">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const today = toDateInput(new Date());
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today);

  const {
    classifications: allClassifications,
    liveClassifications: allLiveClassifications,
    nodes: allNodes,
    loading,
    refreshing,
    error,
    refetch,
  } = useAnalytics(from, to);

  // Barangay users only see their own barangay's data. Admin/MENRO have no barangay, so see all.
  // Read in an effect so the server render and first client render match.
  const [scopeId, setScopeId] = useState<number | null>(null);
  const [scopeName, setScopeName] = useState<string | null>(null);
  const [scoped, setScoped] = useState(false);
  useEffect(() => {
    const u = getUser() as {
      user_role?: string;
      barangay_id?: number | null;
      barangay_details?: { barangay_name?: string } | null;
    } | null;
    if (u && (u.user_role === "Barangay" || u.barangay_id != null)) {
      setScoped(true);
      setScopeId(u.barangay_id ?? null);
      setScopeName(u.barangay_details?.barangay_name ?? null);
    }
  }, []);

  const inMyBarangay = (w: (typeof allClassifications)[number]) => {
    const b = w.node_details?.barangay_details;
    if (b?.barangay_id != null && scopeId != null) return b.barangay_id === scopeId;
    return !!scopeName && b?.barangay_name === scopeName; // can't match -> hidden
  };
  const classifications = useMemo(
    () => (scoped ? allClassifications.filter(inMyBarangay) : allClassifications),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allClassifications, scoped, scopeId, scopeName]
  );
  const liveClassifications = useMemo(
    () => (scoped ? allLiveClassifications.filter(inMyBarangay) : allLiveClassifications),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLiveClassifications, scoped, scopeId, scopeName]
  );

  // Sensor nodes: use the node's own barangay when the hook provides it (barangay_details / barangay_id),
  // otherwise fall back to nodes that appear in this barangay's classifications.
  const nodes = useMemo(() => {
    if (!scoped) return allNodes;
    const mine = new Set(
      [...allClassifications, ...allLiveClassifications]
        .filter(inMyBarangay)
        .map((w) => w.node_details?.node_id)
    );
    return allNodes.filter((n) => {
      const x = n as typeof n & {
        barangay_id?: number | null;
        barangay_details?: { barangay_id?: number; barangay_name?: string } | null;
      };
      const id = x.barangay_details?.barangay_id ?? x.barangay_id ?? null;
      if (id != null && scopeId != null) return id === scopeId;
      const name = x.barangay_details?.barangay_name;
      if (name && scopeName) return name === scopeName;
      return mine.has(n.node_id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNodes, allClassifications, allLiveClassifications, scoped, scopeId, scopeName]);

  // Keep the range valid: From can never be after To
  const handleFrom = (v: string) => {
    setFrom(v);
    if (v > to) setTo(v);
  };
  const handleTo = (v: string) => {
    setTo(v);
    if (v < from) setFrom(v);
  };

  const composition = useMemo(() => buildComposition(classifications), [classifications]);
  const detections = useMemo(
    () => buildDetections(liveClassifications, nodes),
    [liveClassifications, nodes]
  );
  // every barangay with data, for the printed report
  const allBarangays = useMemo(
    () => buildTopBarangays(classifications, Infinity),
    [classifications]
  );

  const busy = loading || refreshing;

  // Waste Classification Readings table: fill the card, paginate the rest (same as the MENRO analytics page)
  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 35,
    initialRows: 5,
    deps: [busy],
  });
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(
    classifications,
    rows
  );

  // Detected nodes first, then newest readings
  const sortedDetections = useMemo(
    () =>
      [...detections].sort(
        (a, b) =>
          (a.status === b.status ? 0 : a.status === "Detected" ? -1 : 1) ||
          new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
      ),
    [detections]
  );

  const stats = useMemo(() => {
    const totalDetections = classifications.filter(
      (c) => (c.estimated_volume || 0) > 0 || (c.dominant_waste_type && c.dominant_waste_type !== "None")
    ).length;
    const totalWaste = classifications.reduce((sum, c) => sum + (c.estimated_volume || 0), 0);
    return {
      totalDetections,
      totalWaste,
      activeHotspots: detections.filter((d) => d.status === "Detected").length,
      criticalAreas: detections.filter((d) => d.severity === "High").length,
      clearNodes: detections.filter((d) => d.status === "Clear").length,
    };
  }, [classifications, detections]);

  const nodeCount = detections.length;

  return (
    // No padding of its own: the layout already pads the page, same as the other pages
    <div className="flex min-h-full flex-col gap-3">
      {/* Filters + export */}
      <div className="flex w-full justify-between">
        <div className="flex gap-3">
          <DateField label="From" value={from} max={to} onChange={handleFrom} />
          <DateField label="To" value={to} min={from} max={today} onChange={handleTo} />
        </div>

        <div>
          <Button
            onClick={() => {
              const user = getUser();
              printAnalyticsReport({
                from,
                to,
                generatedBy: user ? `${user.first_name} ${user.last_name}` : "Admin",
                composition,
                barangays: allBarangays,
                records: classifications,
              });
            }}
            disabled={busy || error}
            className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e]"
          >
            <FileDown size={16} className="mr-1" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center py-10">
          <p className="mb-3 text-sm font-semibold text-[#D81010]">
            Failed to load analytics. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-[#D81010] bg-transparent px-3 py-2 text-sm text-[#D81010] hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      )}

      {busy && !error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-slate-600">
          <Loader2 className="animate-spin text-[#2F6FED]" />
          <span>Loading...</span>
        </div>
      )}

      {!busy && !error && (
        <>
          {/* Summary cards */}
          <div className="grid w-full grid-cols-2 gap-3 text-[#122A48] lg:grid-cols-5">
            <StatCard
              label="Total Detections"
              value={stats.totalDetections}
              note="Classifications in the selected period"
              icon={<Activity size={20} color="#582579" />}
              bg="bg-[#E1CDE3]"
            />
            <StatCard
              label="Active Hotspots"
              value={stats.activeHotspots}
              note={`Of ${nodeCount} sensor nodes, right now`}
              icon={<MapPin size={20} color="#1565BC" />}
              bg="bg-[#1565BC61]"
            />
            <StatCard
              label="Total Waste"
              value={formatWeight(stats.totalWaste)}
              note="Estimated, in the selected period"
              icon={<Scale size={20} color="#2C7B3C" />}
              bg="bg-[#B2FBC1]"
            />
            <StatCard
              label="Critical Areas"
              value={stats.criticalAreas}
              note="High volume nodes, right now"
              icon={<AlertTriangle size={20} color="#D48A00" />}
              bg="bg-[#EED7AA]"
            />
            <StatCard
              label="Clear Nodes"
              value={stats.clearNodes}
              note="No detection, right now"
              icon={<ShieldCheck size={20} color="#727272" />}
              bg="bg-[#E5E5E6]"
            />
          </div>

          {/* Main grid */}
          <div className="grid items-stretch gap-3 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Solid Debris Detection" subtitle="Latest reading per sensor node">
              {sortedDetections.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-slate-400">No sensor nodes found.</p>
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {sortedDetections.map((item) => (
                    <DetectionRow key={item.node_id} {...item} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Classified Waste Type">
              {composition.map((item) => (
                <WasteProgress key={item.type} {...item} />
              ))}
            </Card>
          </div>

          {/* Waste Classification Readings, same table as the MENRO analytics page */}
          <div
            ref={panelRef}
            className="mt-1 flex min-h-0 flex-1 flex-col rounded-lg border border-[#C6C6C8] bg-[#FAFCFD]"
          >
            <div className="w-full p-2">
              <p className="text-sm font-bold">Waste Classification Readings</p>
            </div>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="h-12 border border-[#CFD8DC] bg-[#e8eef1b4]">
                  <TableRow>
                    {[
                      "CLASSIFICATION ID",
                      "NODE",
                      "DOMINANT WASTE TYPE",
                      "RECYCLABLE",
                      "BIODEGRADABLE",
                      "RESIDUAL",
                      "SPECIAL WASTE",
                      "CONFIDENCE",
                      "ESTIMATED VOLUME",
                      "TIMESTAMP",
                    ].map((h) => (
                      <TableHead key={h} className="text-left text-xs font-semibold text-[#727272]">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((w) => (
                    <TableRow key={w.classification_id}>
                      <TableCell className="h-[35px] text-left text-xs">{w.classification_id}</TableCell>
                      <TableCell className="text-left text-xs">{w.node_details?.node_name ?? "—"}</TableCell>
                      <TableCell className="text-left text-xs">
                        {w.dominant_waste_type === "None" ? "No waste detected" : w.dominant_waste_type}
                      </TableCell>
                      <TableCell className="text-left text-xs">{Number(w.recyclable_pct).toFixed(2)}%</TableCell>
                      <TableCell className="text-left text-xs">{Number(w.biodegradable_pct).toFixed(2)}%</TableCell>
                      <TableCell className="text-left text-xs">{Number(w.residual_pct).toFixed(2)}%</TableCell>
                      <TableCell className="text-left text-xs">{Number(w.special_waste_pct).toFixed(2)}%</TableCell>
                      <TableCell className="text-left text-xs">{Number(w.confidence).toFixed(2)}%</TableCell>
                      <TableCell className="text-left text-xs">{formatWeight(Number(w.estimated_volume))}</TableCell>
                      <TableCell className="text-left text-xs">
                        {new Date(w.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {classifications.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-10 text-sm text-[#727272]">
                No waste classifications in the selected period.
              </div>
            )}

            <div className="mt-auto">
              <TablePagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}