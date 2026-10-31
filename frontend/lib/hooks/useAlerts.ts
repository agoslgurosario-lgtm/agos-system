"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { ALL_ALERT_TYPES } from "@/lib/alerts";
import type { Alert, AlertType } from "@/types/alert";

export type AlertTypeFilter = "All" | AlertType;
export type DateFilter = "Today" | "7Days" | "30Days";

// "Report submitted" notifications are never requested, shown or accepted here.
// Matches any alert type with "report" in its name (e.g. Report_Submitted).
const isReportAlert = (type: string) => /report/i.test(type);

function getStoredUser(): { user_role?: string; barangay_id?: number | null } | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAlerts(alertType: AlertTypeFilter, dateFilter: DateFilter) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchAlerts = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const types = (alertType === "All" ? [...ALL_ALERT_TYPES] : [alertType]).filter(
          (t) => !isReportAlert(t)
        );

        const params = new URLSearchParams();
        params.append("alert_type", types.join(","));
        if (dateFilter) params.append("date", dateFilter);

        // The API may be paginated: follow `next` so every alert in the range is loaded,
        // otherwise the page's search can only see the newest first page.
        let endpoint: string | null = `/api/alerts/?${params.toString()}`;
        const list: Alert[] = [];
        for (let i = 0; endpoint && i < 50; i++) {
          const data = await api.get(endpoint);
          if (Array.isArray(data)) {
            list.push(...data);
            break;
          }
          list.push(...(data.results ?? []));
          if (data.next) {
            const next = new URL(data.next, window.location.origin);
            endpoint = next.pathname + next.search;
          } else {
            endpoint = null;
          }
        }
        setAlerts(list.filter((a) => !isReportAlert(a.alert_type)));
      } catch {
        setError(true);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [alertType, dateFilter]
  );

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (incoming: Alert) => {
      if (isReportAlert(incoming.alert_type)) return;

      const user = getStoredUser();
      if (
        user?.user_role === "Barangay" &&
        incoming.barangay_id != null &&
        incoming.barangay_id !== user.barangay_id
      ) {
        return;
      }
      if (alertType !== "All" && incoming.alert_type !== alertType) return;

      setAlerts((prev) =>
        prev.some((a) => a.alert_id === incoming.alert_id) ? prev : [incoming, ...prev]
      );
    },
  });

  const markAsRead = useCallback(async (alertId: number) => {
    try {
      await api.post(`/api/alerts/${alertId}/read/`);
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? { ...a, is_read: true } : a)));
    } catch {
      // leave it unread; it will retry next time it's opened
    }
  }, []);

  return { alerts, loading, refreshing, error, refetch: fetchAlerts, markAsRead };
}