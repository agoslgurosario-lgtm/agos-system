"use client";

import { useMemo, useState } from "react";
import { FileDown, Loader2, PieChart as PieChartIcon, Scale, ShieldCheck, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import DetectionRow from "@/components/Analytics/DetectionRow";
import WasteProgress from "@/components/Analytics/WasteProgress";
import StatCard from "@/components/Analytics/StatCard";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { TablePagination } from "@/components/TablePagination";
import { Toast } from "@/components/Toast";
import { usePagination } from "@/components/hooks/usePagination";
import { useFillRows } from "@/components/hooks/useFillRows";
import { useToast } from "@/components/hooks/useToast";

import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { buildComposition, buildDetections } from "@/lib/analytics";
import { currentMonthRange, toISODate } from "@/lib/dateRange";
import { exportOrPrint } from "@/lib/exportOrPrint";
import { formatWeight } from "@/lib/formatWeight";
import { printAnalyticsReport } from "@/lib/printAnalyticsReport";
import { getUser } from "@/lib/auth";

const TABLE_COLUMNS = [
  "CLASSIFICATION ID", "NODE", "DOMINANT WASTE TYPE", "RECYCLABLE", "BIODEGRADABLE",
  "RESIDUAL", "SPECIAL WASTE", "CONFIDENCE", "ESTIMATED VOLUME", "TIMESTAMP",
];

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
      className={`flex flex-col rounded-lg border border-[#00000040] bg-[#FAFCFD] p-3 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] ${className}`}
    >
      <h2 className="text-sm font-bold text-[#122A48]">{title}</h2>
      {subtitle && <p className="text-[11px] text-[#727272]">{subtitle}</p>}
      <div className="mt-2 flex-1">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  // date range: opens on the current month, clearing it goes back to the current month
  const [range, setRange] = useState(() => currentMonthRange());
  const { from, to } = range;

  const handleRangeChange = (f: string, t: string) => {
    if (!f && !t) {
      setRange(currentMonthRange());
      return;
    }
    setRange({ from: f || t, to: t || toISODate(new Date()) });
  };

  // The backend already limits waste classifications and sensor nodes to the user's barangay,
  // so everything below is used as-is.
  const { classifications, liveClassifications, nodes, loading, refreshing, error, refetch } =
    useAnalytics(from, to);

  const { toasts, addToast, removeToast } = useToast();

  const composition = useMemo(() => buildComposition(classifications), [classifications]);
  const detections = useMemo(
    () => buildDetections(liveClassifications, nodes),
    [liveClassifications, nodes]
  );

  const busy = loading || refreshing;

  // Waste Classification Readings table: fill the card, paginate the rest (same as the MENRO analytics page)
  const { panelRef, tableWrapRef, rows } = useFillRows({ rowHeight: 35, initialRows: 5, deps: [busy] });
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

  // ---------- summary cards (all about the selected period, except Clear Nodes) ----------
  const stats = useMemo(() => {
    const totalWaste = classifications.reduce((sum, c) => sum + (c.estimated_volume || 0), 0);

    const volumeByNode: Record<string, number> = {};
    for (const c of classifications) {
      const name = c.node_details?.node_name;
      if (!name) continue;
      volumeByNode[name] = (volumeByNode[name] || 0) + (c.estimated_volume || 0);
    }
    const [topNodeName, topNodeVolume] =
      Object.entries(volumeByNode).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

    const topType = totalWaste > 0 ? [...composition].sort((a, b) => b.percent - a.percent)[0] : null;

    return {
      totalWaste,
      topType,
      topNode: topNodeName && topNodeVolume > 0 ? { name: topNodeName, volume: topNodeVolume } : null,
      clearNodes: detections.filter((d) => d.status === "Clear").length,
    };
  }, [classifications, composition, detections]);

  // ---------- export (desktop = print dialog, iPhone/iPad = PDF in a new tab) ----------
  const handleExport = () => {
    const user = getUser();
    const period = from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`;

    exportOrPrint({
      table: {
        title: `Waste Analytics (${period})`,
        columns: ["ID", "Node", "Dominant Type", "Recyclable", "Biodegradable", "Residual", "Special Waste", "Confidence", "Est. Volume", "Timestamp"],
        rows: classifications.map((c) => [
          c.classification_id,
          c.node_details?.node_name ?? "—",
          c.dominant_waste_type === "None" ? "No waste detected" : c.dominant_waste_type,
          `${Number(c.recyclable_pct).toFixed(2)}%`,
          `${Number(c.biodegradable_pct).toFixed(2)}%`,
          `${Number(c.residual_pct).toFixed(2)}%`,
          `${Number(c.special_waste_pct).toFixed(2)}%`,
          `${Number(c.confidence).toFixed(2)}%`,
          formatWeight(Number(c.estimated_volume)),
          c.timestamp ? new Date(c.timestamp).toLocaleString("en-PH") : "—",
        ]),
        orientation: "landscape",
      },
      print: () =>
        printAnalyticsReport({
          from,
          to,
          generatedBy: user ? `${user.first_name} ${user.last_name}` : "Barangay Personnel",
          composition,
          records: classifications,
        }),
      onError: () => addToast("Failed to export. Please try again.", "error"),
    });
  };

  return (
    // No padding of its own: the layout already pads the page, same as the other pages
    <div className="flex min-h-full flex-col gap-3">
      {/* Filters + export */}
      <div className="flex w-full justify-between">
        <DateRangeFilter from={from} to={to} onChange={handleRangeChange} align="left" width="w-[240px]" />

        <Button
          onClick={handleExport}
          disabled={busy || error}
          className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e]"
        >
          <FileDown size={16} className="mr-1" />
          Export
        </Button>
      </div>

      {error && (
        <div className="flex flex-col items-center py-10">
          <p className="mb-3 text-sm font-semibold text-[#D81010]">
            Failed to load analytics. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="cursor-pointer rounded-lg border border-[#D81010] bg-transparent px-3 py-2 text-sm text-[#D81010] hover:bg-gray-100"
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
          <div className="grid w-full grid-cols-2 gap-3 text-[#122A48] lg:grid-cols-4">
            <StatCard
              label="Total Waste"
              value={formatWeight(stats.totalWaste)}
              note="Estimated, in the selected period"
              icon={<Scale size={20} color="#2C7B3C" />}
              bg="bg-[#B2FBC1]"
            />
            <StatCard
              label="Dominant Waste Type"
              value={stats.topType ? stats.topType.type : "—"}
              note={
                stats.topType
                  ? `${stats.topType.percent}% of the total waste`
                  : "No waste data in the selected period"
              }
              icon={<PieChartIcon size={20} color="#582579" />}
              bg="bg-[#E1CDE3]"
            />
            <StatCard
              label="Highest Volume Node"
              value={stats.topNode ? stats.topNode.name : "—"}
              note={
                stats.topNode
                  ? `${formatWeight(stats.topNode.volume)} in the selected period`
                  : "No waste data in the selected period"
              }
              icon={<TrendingUp size={20} color="#D48A00" />}
              bg="bg-[#EED7AA]"
            />
            <StatCard
              label="Clear Nodes"
              value={stats.clearNodes}
              note={`Of ${detections.length} sensor nodes, no detection right now`}
              icon={<ShieldCheck size={20} color="#727272" />}
              bg="bg-[#E5E5E6]"
            />
          </div>

          {/* Compact top row: leaves room for the readings table */}
          <div className="grid items-stretch gap-3 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Solid Debris Detection" subtitle="Latest reading per sensor node">
              {sortedDetections.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-slate-400">No sensor nodes found.</p>
              ) : (
                <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                  {sortedDetections.map((item) => (
                    <DetectionRow key={item.node_id} {...item} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Classified Waste Type" subtitle="Share of the total waste in the selected period">
              {composition.map((item) => (
                <WasteProgress key={item.type} {...item} />
              ))}
            </Card>
          </div>

          {/* Waste Classification Readings, same table as the MENRO analytics page */}
          <div
            ref={panelRef}
            className="flex min-h-[320px] flex-1 flex-col rounded-lg border border-[#C6C6C8] bg-[#FAFCFD]"
          >
            <div className="w-full p-2">
              <p className="text-sm font-bold">Waste Classification Readings</p>
            </div>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="h-12 border border-[#CFD8DC] bg-[#e8eef1b4]">
                  <TableRow>
                    {TABLE_COLUMNS.map((h) => (
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
                      <TableCell className="text-left text-xs">{new Date(w.timestamp).toLocaleString()}</TableCell>
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}