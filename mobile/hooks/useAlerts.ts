import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Alert, AlertType } from "../types/alert";

import { useLiveSocket } from "../lib/useLiveSocket";
import { useAuth } from "../lib/AuthContext";
import { useAlertsContext } from "../lib/AlertsContext";
import { APP_ALERT_TYPES } from "../constants/alerts";
import { inRange, rangeQuery } from "../lib/dateRange";

export type AlertTypeFilter = "All" | AlertType;

export function useAlerts(alertType: AlertTypeFilter, from: string, to: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const { user } = useAuth();
  const { refreshUnreadCount } = useAlertsContext();

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.append(
        "alert_type",
        alertType === "All" ? APP_ALERT_TYPES.join(",") : alertType
      );

      const data = await api.get(`/api/alerts/?${params.toString()}&${rangeQuery(from, to)}`);
      setAlerts(data.results ?? data);
    } catch {
      setError(true);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [alertType, from, to]);

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
      if (!inRange(incoming.timestamp, from, to)) return;

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
      refreshUnreadCount();
    } catch {
      
    }
  }, [refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post(`/api/alerts/mark-all-read/?alert_type=${APP_ALERT_TYPES.join(",")}`);
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      refreshUnreadCount();
    } catch {}
  }, [refreshUnreadCount]);

  return { alerts, loading, refreshing, error, refetch: fetchAlerts, markAsRead, markAllAsRead };
}