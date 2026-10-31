"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import type { WasteClassification } from "@/types/analytics";

export interface AnalyticsNode {
  node_id: number;
  node_name: string;
  location: string;
  barangay_id?: number | null;
  barangay_details?: { barangay_id: number; barangay_name: string } | null;
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "2026-08-14" .. "2026-10-02" -> ["2026-08", "2026-09", "2026-10"]
// The API is queried per month, so a date range = one request per month it touches.
function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const months: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// Both ends inclusive, compared in the user's local time
function inRange(timestamp: string, from: string, to: string) {
  const t = new Date(timestamp).getTime();
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T23:59:59.999`).getTime();
  return t >= start && t <= end;
}

// The API may be paginated: follow `next` so a whole month is loaded, not just the first page.
async function fetchMonth(month: string): Promise<WasteClassification[]> {
  let endpoint: string | null = `/api/waste-classifications/?month=${month}&page_size=100`;
  const all: WasteClassification[] = [];
  for (let i = 0; endpoint && i < 100; i++) {
    const data = await api.get(endpoint);
    if (Array.isArray(data)) {
      all.push(...data);
      break;
    }
    all.push(...(data?.results ?? []));
    if (data?.next) {
      const next = new URL(data.next, window.location.origin);
      endpoint = next.pathname + next.search;
    } else {
      endpoint = null;
    }
  }
  return all;
}

// The web app keeps the logged-in user in localStorage under "user".
function getStoredUser(): { user_role?: string; barangay_id?: number | null } | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param from first day to include, "YYYY-MM-DD"
 * @param to   last day to include,  "YYYY-MM-DD"
 */
export function useAnalytics(from: string, to: string) {
  const [classifications, setClassifications] = useState<WasteClassification[]>([]);
  const [liveClassifications, setLiveClassifications] = useState<WasteClassification[]>([]);
  const [nodes, setNodes] = useState<AnalyticsNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const currentMonth = monthKey();
        const months = monthsBetween(from, to);
        const currentIdx = months.indexOf(currentMonth);

        const [monthData, nodeData, liveData] = await Promise.all([
          Promise.all(months.map((m) => fetchMonth(m))),
          api.get(`/api/sensor-nodes/`),
          // "current detections" always reads the current month
          currentIdx === -1
            ? fetchMonth(currentMonth)
            : Promise.resolve(null),
        ]);

        const list = monthData.flat().filter((w) => inRange(w.timestamp, from, to));
        const liveList = currentIdx === -1 ? liveData ?? [] : monthData[currentIdx];

        setClassifications(list);
        setLiveClassifications(liveList);
        setNodes(
          (nodeData?.results ?? nodeData ?? []).map((n: any) => ({
            node_id: n.node_id,
            node_name: n.node_name,
            location: n.hotspot_details?.name ?? n.node_name,
            barangay_id: n.barangay_details?.barangay_id ?? n.barangay_id ?? null,
            barangay_details: n.barangay_details ?? null,
          }))
        );
      } catch {
        setError(true);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (incoming: WasteClassification) => {
      const user = getStoredUser();
      const incomingBarangay = incoming.node_details?.barangay_details?.barangay_id;
      if (
        user?.user_role === "Barangay" &&
        incomingBarangay != null &&
        incomingBarangay !== user.barangay_id
      ) {
        return;
      }

      setLiveClassifications((prev) => [incoming, ...prev]);
      if (inRange(incoming.timestamp, from, to)) {
        setClassifications((prev) => [incoming, ...prev]);
      }
    },
  });

  return { classifications, liveClassifications, nodes, loading, refreshing, error, refetch: fetchAll };
}