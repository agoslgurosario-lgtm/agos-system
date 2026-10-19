import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { SensorNodeApi, ClogEventApi } from "../types/map";
import { WasteClassification } from "../types/analytics";
import { buildComposition } from "../lib/analytics";

import { useLiveSocket } from "../lib/useLiveSocket";
import { useAuth } from "../lib/AuthContext";

const UNRESOLVED_STATUSES = ["Detected", "Responded"];

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useMapData() {
  const [nodes, setNodes] = useState<SensorNodeApi[]>([]);
  const [clogEvents, setClogEvents] = useState<ClogEventApi[]>([]);
  const [classifications, setClassifications] = useState<WasteClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const { user } = useAuth();

  const fetchAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      const [nodeData, clogData, wasteData] = await Promise.all([
        api.get("/api/sensor-nodes/"),
        api.get("/api/clog-events/"),
        api.get(`/api/waste-classifications/?month=${currentMonthValue()}`),
      ]);
      setNodes(nodeData ?? []);
      setClogEvents(clogData ?? []);
      setClassifications(wasteData ?? []);
    } catch {
      setError(true);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const nodeData = await api.get("/api/sensor-nodes/");
        if (nodeData) setNodes(nodeData);
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

    useLiveSocket<{
    node_details: { node_id: number };
    water_level: number | null;
    water_flow_rate: number | null;
    clog_pct: number | null;
    timestamp: string;
    reading_status: string;
    overall_status: string | null;
  }>(
    'ws/sensor-readings/',
    (incoming) => {
      const nodeId = incoming.node_details?.node_id;
      if (nodeId == null) return;

      const condition = (incoming.overall_status ?? incoming.reading_status ?? null) as
        "Normal" | "Warning" | "Critical" | null;

      setNodes((prev) =>
        prev.map((n) =>
          n.node_id === nodeId
            ? {
                ...n,
                water_level: incoming.water_level,
                water_flow_rate: incoming.water_flow_rate,
                clog_pct: incoming.clog_pct,
                condition,
                last_reading_at: incoming.timestamp,
                is_online: true,
              }
            : n
        )
      );
    },
    () => fetchAll()
  );

  useLiveSocket<WasteClassification>(
    'ws/waste-classification/',
    (incoming) => {
      if (
        user?.user_role === 'Barangay' &&
        incoming.node_details?.barangay_details?.barangay_id != null &&
        incoming.node_details.barangay_details.barangay_id !== user.barangay_id
      ) {
        return;
      }
      setClassifications((prev) => [incoming, ...prev]);
    },
    () => fetchAll()
  );

  const mappableNodes = nodes.filter(
    (n) => n.hotspot_details?.latitude != null && n.hotspot_details?.longitude != null
  );

  const criticalCount = nodes.filter((n) => n.condition === "Critical").length;
  const obstructedNodeIds = new Set(
    clogEvents
      .filter((e) => UNRESOLVED_STATUSES.includes(e.status))
      .map((e) => e.node)
  );
  const obstructedCount = obstructedNodeIds.size;

  const awaitingResponseCount = new Set(
    clogEvents.filter((e) => e.status === "Detected").map((e) => e.node)
  ).size;

  const waterLevelReadings = nodes
    .map((n) => n.water_level)
    .filter((v): v is number => v != null);

  const avgWaterLevelCm =
    waterLevelReadings.length > 0
      ? Math.round(
          (waterLevelReadings.reduce((sum, v) => sum + v, 0) / waterLevelReadings.length) * 10
        ) / 10
      : null;

  const stats = {
    monitoringPointsTotal: nodes.length,
    criticalNodesCount: criticalCount,
    obstructedCanalsCount: obstructedCount,
    awaitingResponseCount: awaitingResponseCount,
    averageWaterLevelCm: avgWaterLevelCm,
  };

  const totalWasteKg = classifications.reduce((sum, w) => sum + (w.estimated_volume || 0), 0);

  const composition = buildComposition(classifications);

  return { nodes, mappableNodes, awaitingResponseCount, stats, totalWasteKg, composition, loading, refreshing, error, refetch: fetchAll };
}