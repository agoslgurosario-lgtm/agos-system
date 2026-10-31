import type { WasteClassification, WasteCompositionItem } from "@/types/analytics";
import type { TopBarangay } from "@/lib/analytics";
import { formatWeight, formatWeightIn, pickWeightUnit } from "@/lib/formatWeight";

export interface AnalyticsReportData {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
  generatedBy: string;
  composition: WasteCompositionItem[];
  barangays: TopBarangay[];
  records: WasteClassification[];
}

const CATEGORIES: { title: string; key: keyof WasteClassification }[] = [
  { title: "Biodegradable", key: "biodegradable_pct" },
  { title: "Recyclable", key: "recyclable_pct" },
  { title: "Residual", key: "residual_pct" },
  { title: "Special Waste", key: "special_waste_pct" },
];

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const DATE_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const pct = (v: unknown) => `${Number(v).toFixed(2)}%`;

function table(
  columns: string[],
  rows: (string | number)[][],
  opts: { compact?: boolean; right?: number[]; blue?: number[] } = {}
) {
  const right = new Set(opts.right ?? []);
  const blue = new Set(opts.blue ?? []);
  const tdClass = (i: number) => {
    const c = [right.has(i) ? "r" : "", blue.has(i) ? "b" : ""].filter(Boolean).join(" ");
    return c ? ` class="${c}"` : "";
  };
  const cls = ` class="data${opts.compact ? " compact" : ""}"`;
  return `
  <table${cls}>
    <thead><tr>${columns
      .map((c, i) => `<th${right.has(i) ? ' class="r"' : ""}>${esc(c)}</th>`)
      .join("")}</tr></thead>
    <tbody>${
      rows.length
        ? rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell, i) => `<td${tdClass(i)}>${esc(cell)}</td>`)
                  .join("")}</tr>`
            )
            .join("")
        : `<tr><td class="empty" colspan="${columns.length}">No data in this period.</td></tr>`
    }</tbody>
  </table>`;
}

function buildHtml({ from, to, generatedBy, composition, barangays, records }: AnalyticsReportData) {
  const period = from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`;
  const generatedAt = new Date().toLocaleString("en-PH", DATE_TIME);
  const logo = `${window.location.origin}/ROS-logo.jpg`;

  // Volume per waste type, from the raw records
  const typeVolume: Record<string, number> = {};
  for (const { title, key } of CATEGORIES) {
    typeVolume[title] = records.reduce(
      (sum, w) => sum + ((w.estimated_volume || 0) * ((w[key] as number) || 0)) / 100,
      0
    );
  }
  const typeUnit = pickWeightUnit(Object.values(typeVolume));

  const compositionTable = table(
    ["Waste Type", "Estimated Volume", "Share"],
    composition.map((c) => [c.type, formatWeightIn(typeVolume[c.type] ?? 0, typeUnit), `${c.percent}%`]),
    { right: [1, 2] }
  );

  const barangayUnit = pickWeightUnit(barangays.map((b) => b.total));
  const barangayTable = table(
    ["#", "Barangay", "Total Waste", ...CATEGORIES.map((c) => c.title), "Most Common Type"],
    barangays.map((b, i) => [
      i + 1,
      b.name,
      formatWeightIn(b.total, barangayUnit),
      ...CATEGORIES.map((c) => formatWeightIn(b.breakdown[c.title] ?? 0, barangayUnit)),
      b.topType,
    ]),
    { right: [2, 3, 4, 5, 6] }
  );

  // Same columns as the Waste Classification report
  const recordTable = table(
    [
      "ID",
      "Node",
      "Location",
      "Dominant Type",
      "Recyclable",
      "Biodegradable",
      "Residual",
      "Special Waste",
      "Confidence",
      "Est. Volume",
      "Timestamp",
    ],
    [...records]
      .sort((a, b) => b.classification_id - a.classification_id)
      .map((c) => [
        c.classification_id,
        c.node_details?.node_name ?? "—",
        c.node_details?.barangay_details?.barangay_name ?? "—",
        c.dominant_waste_type,
        pct(c.recyclable_pct),
        pct(c.biodegradable_pct),
        pct(c.residual_pct),
        pct(c.special_waste_pct),
        pct(c.confidence),
        formatWeight(Number(c.estimated_volume)),
        c.timestamp ? new Date(c.timestamp).toLocaleString("en-PH", DATE_TIME) : "—",
      ]),
    { compact: true, blue: [3, 4, 5, 6, 7, 8] }
  );

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Waste Analytics</title>
<style>
  @page { size: A4 portrait; margin: 1.5cm 1.5cm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #122A48; margin: 0; }

  /* outer table only exists to repeat the footer on every printed page */
  table.page { width: 100%; border-collapse: collapse; margin: 0; }
  table.page > tbody > tr > td, table.page > tfoot > tr > td { padding: 0; border: 0; background: none; }
  table.page > tfoot { display: table-footer-group; }

  .header { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 3px; }
  .header img { width: 66px; height: 66px; border-radius: 50%; }
  .header-text { text-align: center; }
  .header-text p { margin: 2px 0; font-size: 11px; }
  .header-text p.municipality { font-weight: bold; }
  .divider { display: none; }

  .title-block { text-align: center; margin-bottom: 14px; }
  .title-block .office { font-weight: bold; font-size: 18px; margin: 0 0 4px; }
  .title-block .meta { color: #444; font-size: 10px; margin: 2px 0 0; }
  .title-block .meta b { color: #122A48; }

  h2 { font-size: 12px; margin: 18px 0 0; color: #122A48; }

  /* light table, same look as the Waste Classification print */
  table.data { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.data th { color: #727272; padding: 8px 6px; text-align: left; font-size: 8px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #DDD; }
  table.data td { padding: 8px 6px; border-bottom: 1px solid #E5E5E6; font-size: 9px; color: #122A48; }
  table.data td.b { color: #1565BC; }
  table.data thead { display: table-header-group; }
  table.data tr { page-break-inside: avoid; }
  table.data .r { text-align: right; white-space: nowrap; }
  table.data td.empty { text-align: center; color: #727272; }
  table.data.compact th { padding: 6px 4px; font-size: 7px; }
  table.data.compact td { padding: 6px 4px; font-size: 7.5px; }

  .footer { text-align: center; color: #727272; font-size: 8px; padding-top: 10px; }
</style>
</head>
<body>
<table class="page">
  <tbody><tr><td>
    <div class="header">
      <img src="${esc(logo)}" alt="" />
      <div class="header-text">
        <p>Republic of the Philippines</p>
        <p>Province of La Union</p>
        <p class="municipality">Municipality Of Rosario</p>
      </div>
    </div>
    <div class="divider"></div>

    <div class="title-block">
      <p class="office">Waste Analytics</p>
      <p class="meta">
        Generated by <b>${esc(generatedBy)}</b> &nbsp;|&nbsp; ${esc(generatedAt)} &nbsp;|&nbsp; ${records.length} records
      </p>
      <p class="meta">Period: ${esc(period)}</p>
    </div>

    <h2>Classified Waste Type</h2>
    ${compositionTable}

    <h2>Barangays with Waste Data</h2>
    ${barangayTable}

    <h2>Waste Classification Records</h2>
    ${recordTable}
  </td></tr></tbody>
  <tfoot><tr><td><div class="footer">AGOS — Automated Geo-Based Obstruction Sensing System</div></td></tr></tfoot>
</table>
</body>
</html>`;
}

/**
 * Opens the browser print dialog with the analytics report, styled like the
 * admin reports (municipality letterhead, navy tables).
 * It prints from a hidden iframe, so the app's layout and global print CSS
 * can't blank it out. Choose "Save as PDF" as the destination to download it.
 */
export function printAnalyticsReport(data: AnalyticsReportData) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = buildHtml(data);

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.onafterprint = () => iframe.remove();
    win.focus();
    win.print();
    // fallback cleanup if afterprint never fires
    setTimeout(() => iframe.remove(), 120_000);
  };

  document.body.appendChild(iframe);
}