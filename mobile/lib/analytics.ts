import { WasteClassification, WasteVolume, WasteCompositionItem, Detection } from "../types/analytics";
import { AnalyticsNode } from "../hooks/useAnalytics";

const CATEGORIES: { key: keyof Pick<WasteClassification, "biodegradable_pct" | "recyclable_pct" | "residual_pct" | "special_waste_pct">; title: string; icon: string }[] = [
  { key: "biodegradable_pct", title: "Biodegradable", icon: "leaf" },
  { key: "recyclable_pct", title: "Recyclable", icon: "recycle" },
  { key: "residual_pct", title: "Residual", icon: "trash" },
  { key: "special_waste_pct", title: "Special Waste", icon: "package" },
];

const COMPOSITION_COLORS: Record<string, string> = {
  Biodegradable: "#59C36A",
  Recyclable: "#63A5FF",
  Residual: "#D89A5D",
  "Special Waste": "#EF5B5B",
};

function categoryTotal(data: WasteClassification[], pctKey: keyof WasteClassification) {
  return data.reduce(
    (sum, w) => sum + (w.estimated_volume || 0) * ((w[pctKey] as number) || 0) / 100,
    0
  );
}

function dominantNode(data: WasteClassification[], pctKey: keyof WasteClassification) {
  const totals: Record<string, number> = {};
  for (const w of data) {
    const contribution = (w.estimated_volume || 0) * ((w[pctKey] as number) || 0) / 100;
    const name = w.node_details?.node_name ?? "—";
    totals[name] = (totals[name] || 0) + contribution;
  }
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function buildWasteVolumes(data: WasteClassification[]): WasteVolume[] {
  return CATEGORIES.map(({ key, title, icon }) => {
    const total = categoryTotal(data, key);
    const dominant = dominantNode(data, key);
    return {
      title,
      value: Math.round(total * 100) / 100,
      subtitle: dominant ? `${dominant} dominant` : "No data yet",
      icon,
    };
  });
}

export function buildComposition(data: WasteClassification[]): WasteCompositionItem[] {
  const totalWaste = data.reduce((sum, w) => sum + (w.estimated_volume || 0), 0);
  return CATEGORIES.map(({ key, title, icon }) => {
    const total = categoryTotal(data, key);
    const pct = totalWaste > 0 ? (total / totalWaste) * 100 : 0;
    return {
      type: title,
      percent: Math.round(pct * 10) / 10,
      color: COMPOSITION_COLORS[title],
      icon,
    };
  });
}

function bucketSeverity(volume: number): "None" | "Low" | "Moderate" | "High" {
  // Thresholds are sized for YOLO's per-item average weights (bottle 0.025 kg, etc.)
  if (volume >= 1) return "High";
  if (volume >= 0.25) return "Moderate";
  if (volume > 0) return "Low";
  return "None";
}

export function buildDetections(
  liveData: WasteClassification[],
  nodes: AnalyticsNode[]
): Detection[] {
  const STALE_MS = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  const latestByNode: Record<number, WasteClassification> = {};
  for (const w of liveData) {
    const nodeId = w.node_details?.node_id;
    if (nodeId == null) continue;
    const existing = latestByNode[nodeId];
    if (!existing || new Date(w.timestamp) > new Date(existing.timestamp)) {
      latestByNode[nodeId] = w;
    }
  }

  return nodes.map((node) => {
    const latest = latestByNode[node.node_id];
    const isFresh = latest && now - new Date(latest.timestamp).getTime() <= STALE_MS;

    if (!isFresh) {
      return {
        node_id: node.node_id,
        node: node.node_name,
        location: node.location,
        severity: "None",
        status: "Clear",
        volume: null,
      };
    }

    const volume = latest.estimated_volume || 0;
    let severity = bucketSeverity(volume);
    // classifier sees waste but YOLO didn't count anything
    if (severity === "None" && latest.dominant_waste_type !== "None") severity = "Low";

    return {
      node_id: node.node_id,
      node: node.node_name,
      location: node.location,
      severity,
      // badge and text now come from the same result, so they can't disagree
      status: severity === "None" ? "Clear" : "Detected",
      volume,
    };
  });
}