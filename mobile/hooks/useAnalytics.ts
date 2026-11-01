import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { WasteClassification } from "../types/analytics";

import { useLiveSocket } from "../lib/useLiveSocket";
import { useAuth } from "../lib/AuthContext";
import { currentMonthRange, rangeQuery, inRange } from "../lib/dateRange";

export interface AnalyticsNode {
  node_id: number;
  node_name: string;
  location: string;
}

export function useAnalytics(from: string, to: string) {
  const [classifications, setClassifications] = useState<WasteClassification[]>([]);
  const [liveClassifications, setLiveClassifications] = useState<WasteClassification[]>([]);
  const [nodes, setNodes] = useState<AnalyticsNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const { user } = useAuth();

  const fetchAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      // the detections list always shows this month, whatever range the charts use
      const thisMonth = currentMonthRange();
      const rangeIsThisMonth = from === thisMonth.from && to === thisMonth.to;

      const requests = [
        api.get(`/api/waste-classifications/?${rangeQuery(from, to)}`),
        api.get(`/api/sensor-nodes/`),
      ];

      if (!rangeIsThisMonth) {
        requests.push(api.get(`/api/waste-classifications/?${rangeQuery(thisMonth.from, thisMonth.to)}`));
      }

      const [classificationData, nodeData, liveData] = await Promise.all(requests);

      setClassifications(classificationData ?? []);
      setNodes((nodeData.results ?? nodeData ?? []).map((n: any) => ({
        node_id: n.node_id,
        node_name: n.node_name,
        location: n.hotspot_details?.name ?? n.node_name,
      })));
      setLiveClassifications(
        rangeIsThisMonth ? classificationData ?? [] : liveData ?? []
      );
    } catch {
      setError(true);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

      setLiveClassifications((prev) => [incoming, ...prev]);

      if (inRange(incoming.timestamp, from, to)) {
        setClassifications((prev) => [incoming, ...prev]);
      }
    },
    () => fetchAll()
  );

  return { classifications, liveClassifications, nodes, loading, refreshing, error, refetch: fetchAll };
}