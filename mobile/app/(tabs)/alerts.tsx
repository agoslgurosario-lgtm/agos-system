import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View, ActivityIndicator, RefreshControl  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AlertCard from "../../components/alerts/AlertCard";
import AlertModal from "../../components/alerts/AlertModal";
import StatCard from "../../components/alerts/StatCard";
import FilterSheet from "../../components/alerts/FilterSheet";
import Pagination from "../../components/alerts/Pagination";

import { useAlerts, AlertTypeFilter, DateFilter } from "../../hooks/useAlerts";
import { Alert } from "../../types/alert";

const PAGE_SIZE = 5;

const CLOG_TYPES = ["Low_Clog_Alert", "Moderate_Clog_Alert", "Critical_Clog"];

export default function AlertsScreen() {
  const [alertType, setAlertType] = useState<AlertTypeFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("Today");
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [page, setPage] = useState(1);

  const { alerts, loading, refreshing, error, refetch, markAsRead } = useAlerts(alertType, dateFilter);

  // Statistics
  const totalAlerts = alerts.length;
  const clogEvents = alerts.filter((a) => CLOG_TYPES.includes(a.alert_type)).length;
  const unread = alerts.filter((a) => !a.is_read).length;
  const critical = alerts.filter((a) => a.alert_type === "Critical_Clog").length;

  const totalPages = Math.ceil(alerts.length / PAGE_SIZE);
  const paginatedAlerts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return alerts.slice(start, start + PAGE_SIZE);
  }, [alerts, page]);

  const handleApplyFilter = (type: AlertTypeFilter, date: DateFilter) => {
    setAlertType(type);
    setDateFilter(date);
    setPage(1);
  };

  const handleAlertPress = (alert: Alert) => {
    setSelectedAlert(alert);
    if (!alert.is_read) markAsRead(alert.alert_id);
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-[#EEF3F8]">
        <FlatList
          data={(loading || refreshing) ? [] : paginatedAlerts}
          keyExtractor={(item) => item.alert_id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => refetch(true)} tintColor="#122A48" />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 30,
          }}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View className="flex-row justify-between items-center mt-3 mb-2">
                <View style={{ width: 24 }} />
                <Text className="text-[23px] font-bold text-[#122A48]">
                  Alerts
                </Text>
                <Pressable onPress={() => setFilterVisible(true)}>
                  <Ionicons name="filter-outline" size={22} color="#334155" />
                </Pressable>
              </View>

              {/* Statistics */}
              <View className="mt-5">
                <View className="flex-row">
                  <StatCard title="Total Alerts" value={totalAlerts} />
                  <View className="w-4" />
                  <StatCard title="Clog Events" value={clogEvents} />
                </View>

                <View className="h-4" />

                <View className="flex-row">
                  <StatCard title="Unread" value={unread} />
                  <View className="w-4" />
                  <StatCard title="Critical" value={critical} />
                </View>

                <View className="h-6" />
              </View>

              {error && (
                <View className="items-center py-10">
                  <Text className="text-[#D81010] font-semibold text-sm mb-3">
                    Failed to load alerts. Please try again.
                  </Text>
                  <Pressable
                    onPress={() => refetch()}
                    className="border border-slate-300 rounded-lg px-4 py-2"
                  >
                    <Text className="text-slate-600 text-sm">Retry</Text>
                  </Pressable>
                </View>
              )}

              {(loading || refreshing) && !error && (
                <>
                  <View className="items-center justify-center p-10 flex flex-col gap-2">
                    <ActivityIndicator color="#2F6FED" />
                    <Text>Loading...</Text>
                  </View>
                </>
              )}

              {!loading && !refreshing && !error && alerts.length === 0 && (
                <View className="items-center py-10">
                  <Text className="text-slate-500 text-sm">No alerts found.</Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <AlertCard alert={item} onPress={() => handleAlertPress(item)} />
          )}
          ListFooterComponent={
            !loading && !refreshing && !error && alerts.length > 0 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            ) : null
          }
        />
      </SafeAreaView>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selectedType={alertType}
        selectedDate={dateFilter}
        onApply={handleApplyFilter}
      />

      <AlertModal
        alert={selectedAlert}
        visible={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </>
  );
}