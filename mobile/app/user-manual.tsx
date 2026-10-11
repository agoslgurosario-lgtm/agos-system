import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// COMMON
import ManualHeader from "../components/userManual/common/ManualHeader";
import ManualSearch from "../components/userManual/common/ManualSearch";
import ManualMenu from "../components/userManual/common/ManualMenu";
import ManualEmptyState from "../components/userManual/common/ManualEmptyState";

// MAP
import MapAccess from "../components/userManual/map/MapAccess";
import MapUnderstanding from "../components/userManual/map/MapUnderstanding";
import MapZoom from "../components/userManual/map/MapZoom";
import MonitoringPoints from "../components/userManual/map/MonitoringPoints";
import CriticalNodes from "../components/userManual/map/CriticalNodes";
import ObstructedCanals from "../components/userManual/map/ObstructedCanals";
import WaterLevel from "../components/userManual/map/WaterLevel";
import WasteComposition from "../components/userManual/map/WasteComposition";

// ALERTS
import AlertAccess from "../components/userManual/alerts/AlertAccess";
import AlertSummary from "../components/userManual/alerts/AlertSummary";
import AlertList from "../components/userManual/alerts/AlertList";
import AlertDetails from "../components/userManual/alerts/AlertDetails";
import AlertFilter from "../components/userManual/alerts/AlertFilter";

// ANALYTICS
import WasteAnalytics from "../components/userManual/analytics/WasteAnalytics";
import EstimatedWasteVolume from "../components/userManual/analytics/EstimatedWasteVolume";
import SolidDebrisDetection from "../components/userManual/analytics/SolidDebrisDetection";
import ClassifiedWasteType from "../components/userManual/analytics/ClassifiedWasteType";

import ClogEventsAccess from "../components/userManual/clogEvents/ClogEventsAccess";
import ClogEventSummary from "../components/userManual/clogEvents/ClogEventSummary";
import ClogEventDetails from "../components/userManual/clogEvents/ClogEventDetails";
import ClogEventTimeline from "../components/userManual/clogEvents/ClogEventTimeline";

import ReportsAccess from "../components/userManual/reports/ReportsAccess";
import RecentReports from "../components/userManual/reports/RecentReports";
import AddReport from "../components/userManual/reports/AddReport";
import AddEditReport from "../components/userManual/reports/AddEditReport";
//import WasteCollected from "../components/userManual/reports/WasteCollected";
import UploadEvidence from "../components/userManual/reports/UploadEvidence";
import SubmissionStatus from "../components/userManual/reports/SubmissionStatus";

import Profile from "../components/userManual/profile/Profile";

/* ================================================= */
/* SECTION NAMES                                     */
/* ================================================= */

const MAP_SECTIONS = [
  "Map Access",
  "Understanding the Map",
  "Zooming the Map",
  "Monitoring Points",
  "Critical Nodes",
  "Obstructed Canals",
  "Average Water Level",
  "Waste Composition",
];

const ALERT_SECTIONS = [
  "Alert Access",
  "Alert Summary",
  "Viewing Alerts",
  "Alert Details",
  "Filtering Alerts",
];

const ANALYTICS_SECTIONS = [
  "Waste Analytics",
  "Estimated Waste Volume",
  "Solid Debris Detection",
  "Classified Waste Type",
];

const CLOG_EVENT_SECTIONS = [
  "Clog Events",
  "Event Summary",
  "Clog Event Details",
  "Event Timeline",
];

const REPORT_SECTIONS = [
  "Reports",
  "Recent Reports",
  "Creating a New Report",
  "Add or Edit Report",
  //"Waste Collected",
  "Upload Evidence",
  "Submission Status",
];

const PROFILE_SECTIONS = ["Profile"];

/* ================================================= */
/* MAIN SCREEN                                       */
/* ================================================= */

export default function UserManualScreen() {
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState("All");

  const [search, setSearch] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    "Map Access": true,
  });

  /* ================================================= */
  /* TOGGLE SECTION                                   */
  /* ================================================= */

  const toggleSection = (section: string) => {
    setExpandedSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  /* ================================================= */
  /* SEARCH                                            */
  /* ================================================= */

  const normalizedSearch = search.trim().toLowerCase();

  const mapMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return MAP_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const alertMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return ALERT_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const analyticsMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return ANALYTICS_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const clogEventMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return CLOG_EVENT_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const reportMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return REPORT_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const profileMatches = useMemo(() => {
    if (!normalizedSearch) return true;

    return PROFILE_SECTIONS.some((section) =>
      section.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  /* ================================================= */
  /* WHICH MAIN CATEGORY SHOULD SHOW?                 */
  /* ================================================= */

  const shouldShowMap =
    (selectedFilter === "All" || selectedFilter === "Map") && mapMatches;

  const shouldShowAlerts =
    (selectedFilter === "All" || selectedFilter === "Alerts") && alertMatches;

  const shouldShowAnalytics =
    (selectedFilter === "All" || selectedFilter === "Analytics") &&
    analyticsMatches;

  const shouldShowClogEvents =
    (selectedFilter === "All" || selectedFilter === "Clog Events") &&
    clogEventMatches;

  const shouldShowReports =
    (selectedFilter === "All" || selectedFilter === "Reports") && reportMatches;

  const shouldShowProfile =
    (selectedFilter === "All" || selectedFilter === "Profile") &&
    profileMatches;

  /* ================================================= */
  /* NO SEARCH RESULTS                                 */
  /* ================================================= */

  const noResults =
    normalizedSearch.length > 0 &&
    !mapMatches &&
    !alertMatches &&
    !analyticsMatches &&
    !clogEventMatches &&
    !reportMatches &&
    !profileMatches;

  return (
    <SafeAreaView
      className="flex-1 bg-[#EEF3F8]"
      edges={["top", "left", "right"]}
    >
      {/* ================================================= */}
      {/* HEADER                                             */}
      {/* ================================================= */}

      <ManualHeader
        onBack={() => router.back()}
        onMenu={() => setMenuOpen(true)}
        currentSection={selectedFilter}
      />

      {/* ================================================= */}
      {/* BURGER MENU                                        */}
      {/* ================================================= */}

      <ManualMenu
        selected={selectedFilter}
        onSelect={(value) => {
          setSelectedFilter(value);
          setMenuOpen(false);
        }}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* ================================================= */}
      {/* CONTENT                                            */}
      {/* ================================================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
        }}
      >
        {/* ================================================= */}
        {/* INTRO                                             */}
        {/* ================================================= */}

        <View className="px-5 pt-5">
          <Text className="text-[9px] font-bold tracking-widest text-[#2C8198]">
            BARANGAY USER GUIDE
          </Text>

          <Text className="mt-2 text-[25px] font-bold text-[#203D70]">
            Learn the System
          </Text>

          <Text className="mt-1 text-[11px] leading-5 text-slate-400">
            {`Find instructions for using the application's monitoring, alert, and
            waste analytics features.`}
          </Text>
        </View>

        {/* ================================================= */}
        {/* SEARCH                                             */}
        {/* ================================================= */}

        <ManualSearch value={search} onChangeText={setSearch} />

        {/* ================================================= */}
        {/* ACTIVE FILTER                                      */}
        {/* ================================================= */}

        <View className="mb-4 px-5">
          <View className="self-start rounded-full bg-[#E8EEF7] px-3 py-1.5">
            <Text className="text-[9px] font-bold text-[#203D70]">
              {selectedFilter === "All"
                ? "ALL SECTIONS"
                : selectedFilter.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ================================================= */}
        {/* NO RESULTS                                        */}
        {/* ================================================= */}

        {noResults && (
          <View className="px-5">
            <ManualEmptyState query={search} />
          </View>
        )}

        {/* ================================================= */}
        {/* MAP                                                */}
        {/* ================================================= */}

        {shouldShowMap && (
          <View className="px-5">
            <SectionTitle
              title="Map"
              description="Learn how to use and understand the monitoring map."
            />

            <MapAccess
              expanded={!!expandedSections["Map Access"]}
              onPress={() => toggleSection("Map Access")}
            />

            <MapUnderstanding
              expanded={!!expandedSections["Understanding the Map"]}
              onPress={() => toggleSection("Understanding the Map")}
            />

            <MapZoom
              expanded={!!expandedSections["Zooming the Map"]}
              onPress={() => toggleSection("Zooming the Map")}
            />

            <MonitoringPoints
              expanded={!!expandedSections["Monitoring Points"]}
              onPress={() => toggleSection("Monitoring Points")}
            />

            <CriticalNodes
              expanded={!!expandedSections["Critical Nodes"]}
              onPress={() => toggleSection("Critical Nodes")}
            />

            <ObstructedCanals
              expanded={!!expandedSections["Obstructed Canals"]}
              onPress={() => toggleSection("Obstructed Canals")}
            />

            <WaterLevel
              expanded={!!expandedSections["Average Water Level"]}
              onPress={() => toggleSection("Average Water Level")}
            />

            <WasteComposition
              expanded={!!expandedSections["Waste Composition"]}
              onPress={() => toggleSection("Waste Composition")}
            />
          </View>
        )}

        {/* ================================================= */}
        {/* ALERTS                                             */}
        {/* ================================================= */}

        {shouldShowAlerts && (
          <View className="px-5">
            <SectionTitle
              title="Alerts"
              description="Learn how to access, understand, and filter alerts."
            />

            <AlertAccess
              expanded={!!expandedSections["Alert Access"]}
              onPress={() => toggleSection("Alert Access")}
            />

            <AlertSummary
              expanded={!!expandedSections["Alert Summary"]}
              onPress={() => toggleSection("Alert Summary")}
            />

            <AlertList
              expanded={!!expandedSections["Viewing Alerts"]}
              onPress={() => toggleSection("Viewing Alerts")}
            />

            <AlertDetails
              expanded={!!expandedSections["Alert Details"]}
              onPress={() => toggleSection("Alert Details")}
            />

            <AlertFilter
              expanded={!!expandedSections["Filtering Alerts"]}
              onPress={() => toggleSection("Filtering Alerts")}
            />
          </View>
        )}

        {/* ================================================= */}
        {/* ANALYTICS                                         */}
        {/* ================================================= */}

        {shouldShowAnalytics && (
          <View className="px-5">
            <SectionTitle
              title="Waste Analytics"
              description="Learn how to view and understand waste monitoring data."
            />

            {/* 1 — WASTE ANALYTICS */}

            <WasteAnalytics
              expanded={!!expandedSections["Waste Analytics"]}
              onPress={() => toggleSection("Waste Analytics")}
            />

            {/* 2 — ESTIMATED WASTE VOLUME */}

            <EstimatedWasteVolume
              expanded={!!expandedSections["Estimated Waste Volume"]}
              onPress={() => toggleSection("Estimated Waste Volume")}
            />

            {/* 3 — SOLID DEBRIS DETECTION */}

            <SolidDebrisDetection
              expanded={!!expandedSections["Solid Debris Detection"]}
              onPress={() => toggleSection("Solid Debris Detection")}
            />

            {/* 4 — CLASSIFIED WASTE TYPE */}

            <ClassifiedWasteType
              expanded={!!expandedSections["Classified Waste Type"]}
              onPress={() => toggleSection("Classified Waste Type")}
            />
          </View>
        )}
        {/* CLOG EVENTS */}

        {shouldShowClogEvents && (
          <View className="px-5">
            <SectionTitle
              title="Clog Events"
              description="Learn how to view, understand, and track detected clog events."
            />

            <ClogEventsAccess
              expanded={!!expandedSections["Clog Events"]}
              onPress={() => toggleSection("Clog Events")}
            />

            <ClogEventSummary
              expanded={!!expandedSections["Event Summary"]}
              onPress={() => toggleSection("Event Summary")}
            />

            <ClogEventDetails
              expanded={!!expandedSections["Clog Event Details"]}
              onPress={() => toggleSection("Clog Event Details")}
            />

            <ClogEventTimeline
              expanded={!!expandedSections["Event Timeline"]}
              onPress={() => toggleSection("Event Timeline")}
            />
          </View>
        )}

        {/* REPORTS */}

        {shouldShowReports && (
          <View className="px-5">
            <SectionTitle
              title="Reports"
              description="Learn how to access, create, edit, and complete clearing operation reports."
            />

            <ReportsAccess
              expanded={!!expandedSections["Reports"]}
              onPress={() => toggleSection("Reports")}
            />

            <RecentReports
              expanded={!!expandedSections["Recent Reports"]}
              onPress={() => toggleSection("Recent Reports")}
            />

            <AddReport
              expanded={!!expandedSections["Creating a New Report"]}
              onPress={() => toggleSection("Creating a New Report")}
            />

            <AddEditReport
              expanded={!!expandedSections["Add or Edit Report"]}
              onPress={() => toggleSection("Add or Edit Report")}
            />

            {/* <WasteCollected
              expanded={!!expandedSections["Waste Collected"]}
              onPress={() => toggleSection("Waste Collected")}
            /> */}

            <UploadEvidence
              expanded={!!expandedSections["Upload Evidence"]}
              onPress={() => toggleSection("Upload Evidence")}
            />

            <SubmissionStatus
              expanded={!!expandedSections["Submission Status"]}
              onPress={() => toggleSection("Submission Status")}
            />
          </View>
        )}

        {/* ================================================= */}
        {/* PROFILE                                           */}
        {/* ================================================= */}

        {shouldShowProfile && (
          <View className="px-5">
            <SectionTitle
              title="Profile"
              description="Learn how to view your account information and access profile actions."
            />

            <Profile
              expanded={!!expandedSections["Profile"]}
              onPress={() => toggleSection("Profile")}
            />
          </View>
        )}

        {/* ================================================= */}
        {/* SEARCH RESULT NOTE                                */}
        {/* ================================================= */}

        {!noResults && normalizedSearch.length > 0 && (
          <View className="mt-2 px-5">
            <Text className="text-center text-[9px] text-slate-400">
              {`Showing results for "${search}"`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================= */
/* SECTION TITLE                                     */
/* ================================================= */

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="mb-4 mt-1">
      <Text className="text-[18px] font-bold text-[#203D70]">{title}</Text>

      <Text className="mt-1 text-[10px] text-slate-400">{description}</Text>

      <View className="mt-3 h-1 w-8 rounded-full bg-[#7FA9B8]" />
    </View>
  );
}
