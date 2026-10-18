import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Alert, AlertType } from "../types/alert";

import { useLiveSocket } from "../lib/useLiveSocket";
import { useAuth } from "../lib/AuthContext";

export type AlertTypeFilter = "All" | AlertType;
export type DateFilter = "Today" | "7Days" | "30Days";

const ALL_ALERT_TYPES: AlertType[] = [
  "Water_Level_Rising",
  "Low_Clog_Alert",
  "Moderate_Clog_Alert",
  "Critical_Clog",
  "Waste_Type_Rejected",
  "Waste_Type_Approved",
];

export function useAlerts(alertType: AlertTypeFilter, dateFilter: DateFilter) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const { user } = useAuth();

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.append(
        "alert_type",
        alertType === "All" ? ALL_ALERT_TYPES.join(",") : alertType
      );
      if (dateFilter) params.append("date", dateFilter);

      const data = await api.get(`/api/alerts/?${params.toString()}`);
      setAlerts(data.results ?? data);
    } catch {
      setError(true);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [alertType, dateFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useLiveSocket<Alert>(
    'ws/alerts/',
    (incoming) => {
      if (user?.user_role === 'Barangay' && incoming.barangay_id != null && incoming.barangay_id !== user.barangay_id) {
        return
      }
      const matchesType = alertType === 'All' || incoming.alert_type === alertType;
      if (!matchesType) return;

      setAlerts((prev) => {
        const exists = prev.some((a) => a.alert_id === incoming.alert_id);
        return exists ? prev : [incoming, ...prev];
      });
    },
    () => fetchAlerts()
  );

  const markAsRead = useCallback(async (alertId: number) => {
    try {
      await api.post(`/api/alerts/${alertId}/read/`);
      setAlerts((prev) =>
        prev.map((a) =>
          a.alert_id === alertId ? { ...a, is_read: true } : a
        )
      );
    } catch {
      
    }
  }, []);

  return { alerts, loading, refreshing, error, refetch: fetchAlerts, markAsRead };
}