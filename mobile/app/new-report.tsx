import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Platform, KeyboardTypeOptions, ActivityIndicator, Image, Modal, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import LocationPickerMap, { PickedLocation } from "@/components/reports/LocationPickerMap";
import ChipSelect from "@/components/reports/ChipSelect";
import {
  SEVERITY_OPTIONS, SEVERITY_COLORS,
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS,
  FINAL_CONDITION_OPTIONS,
} from "@/constants/reports";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import type {
  CanalMonitoringReport, ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition, FinalCanalCondition,
} from "@/types/reports";
import { SubmitReportModal } from "@/components/reports/SubmitReportModal";
import { IncompleteReportModal } from "@/components/reports/IncompleteReportModal";
import { PhotoPreviewModal } from "@/components/reports/PhotoPreviewModal";

// Rosario, La Union — fallback map center when the barangay has no coordinates
const MUNICIPALITY_CENTER = { latitude: 16.2286, longitude: 120.4906 };

interface PhotoAsset {
  uri: string;
  fileName: string;
  mediaId?: number;
  uploading?: boolean;
}

interface ReportFormState {
  // Monitoring site
  canalName: string;
  latitude: number | null;
  longitude: number | null;
  nearestLandmark: string;

  // Detection summary
  dateObserved: Date | null;
  severity: ReportSeverity | null;

  // Canal condition
  waterLevel: WaterLevel | null;
  obstructionCoverage: ObstructionCoverage | null;
  waterFlowCondition: WaterFlowCondition | null;

  // Waste composition (kg)
  wastePlasticKg: string;
  wasteFoodWrapperKg: string;
  wastePaperCardboardKg: string;
  wasteGlassKg: string;
  wasteOrganicKg: string;
  wasteMetalKg: string;
  wasteFoamKg: string;
  wasteTextileKg: string;
  wasteEwasteKg: string;
  wasteOtherKg: string;
  wasteOtherLabel: string;

  // Barangay response
  assignedPersonnel: string;
  dateResponded: Date | null;
  actionTaken: string;
  wasteCollectedAmount: string;
  finalCanalCondition: FinalCanalCondition | null;
  remarks: string;

  // Photos
  beforePhotos: PhotoAsset[];
  afterPhotos: PhotoAsset[];
  evidencePhotos: PhotoAsset[];
}

const INITIAL_STATE: ReportFormState = {
  canalName: "",
  latitude: null,
  longitude: null,
  nearestLandmark: "",

  dateObserved: null,
  severity: null,

  waterLevel: null,
  obstructionCoverage: null,
  waterFlowCondition: null,

  wastePlasticKg: "",
  wasteFoodWrapperKg: "",
  wastePaperCardboardKg: "",
  wasteGlassKg: "",
  wasteOrganicKg: "",
  wasteMetalKg: "",
  wasteFoamKg: "",
  wasteTextileKg: "",
  wasteEwasteKg: "",
  wasteOtherKg: "",
  wasteOtherLabel: "",

  assignedPersonnel: "",
  dateResponded: null,
  actionTaken: "",
  wasteCollectedAmount: "",
  finalCanalCondition: null,
  remarks: "",

  beforePhotos: [],
  afterPhotos: [],
  evidencePhotos: [],
};

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, numberOfLines = 1, required = false, }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
}) {
  return (
    <View className={`flex-1 ${multiline ? "mb-3" : ""}`}>
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <Text className="text-[#dc2626]">*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#94a3b8"
        className={`rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-2.5 text-[13px] text-[#0f172a] ${
          multiline ? "min-h-[70px]" : ""
        }`}
      />
    </View>
  );
}

// Datetime field — the new model stores DateTimeFields, so this picks date then time.
function DateTimeField({ label, value, onChange, required = false, placeholder = "Select date & time", }: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const formatted = value
    ? value.toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : placeholder;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setMode(null);
    if (event.type !== "set" || !selected) {
      setTempDate(null);
      return;
    }

    if (mode === "date") {
      setTempDate(selected);
      // chain straight into the time picker
      setTimeout(() => setMode("time"), Platform.OS === "android" ? 0 : 0);
    } else {
      const base = tempDate ?? value ?? new Date();
      const combined = new Date(base);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(combined);
      setTempDate(null);
      if (Platform.OS === "ios") setMode(null);
    }
  };

  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <Text className="text-[#dc2626]">*</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setMode("date")}
        className="flex-row items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-2.5"
      >
        <MaterialCommunityIcons name="calendar-clock" size={18} color="#94a3b8" />
        <Text className={`flex-1 text-[13px] ${value ? "text-[#475569]" : "text-[#94a3b8]"}`}>
          {formatted}
        </Text>
      </TouchableOpacity>

      {mode && (
        <DateTimePicker
          value={tempDate ?? value ?? new Date()}
          mode={mode}
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View className="mb-3 mt-1 flex-row items-center gap-1.5">
      <MaterialCommunityIcons name={icon as any} size={16} color="#16a34a" />
      <Text className="text-xs font-bold tracking-wide text-[#16a34a]">
        {title}
      </Text>
    </View>
  );
}

// Read-only display for auto-filled, locked values (Barangay, Municipality)
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">{label}</Text>
      <View className="flex-row items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-[#e2e8f0] px-3 py-2.5">
        <MaterialCommunityIcons name="lock-outline" size={14} color="#94a3b8" />
        <Text className="flex-1 text-[13px] text-[#64748b]">{value}</Text>
      </View>
    </View>
  );
}

function CoordinatePicker({ latitude, longitude, onPress, required = false, }: {
  latitude: number | null;
  longitude: number | null;
  onPress: () => void;
  required?: boolean;
}) {
  const hasPin = latitude != null && longitude != null;

  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        GPS Coordinates {required && <Text className="text-[#dc2626]">*</Text>}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        className={`flex-row items-center gap-2 rounded-[10px] border px-3 py-2.5 ${
          hasPin ? "border-[#86efac] bg-[#f0fdf4]" : "border-dashed border-[#cbd5e1] bg-[#f8fafc]"
        }`}
      >
        <MaterialCommunityIcons
          name={hasPin ? "map-marker-check" : "map-marker-plus-outline"}
          size={18}
          color={hasPin ? "#16a34a" : "#94a3b8"}
        />
        <Text className={`flex-1 text-[13px] ${hasPin ? "text-[#15803d]" : "text-[#94a3b8]"}`}>
          {hasPin
            ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
            : "Tap to pick on map"}
        </Text>
        {hasPin && (
          <Text className="text-[11px] font-semibold text-[#16a34a]">Change</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// keep digits and a single decimal point
function sanitizeDecimal(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

// blank / invalid → 0, only used for the running total
function parseAmount(text: string): number {
  const n = parseFloat(text);
  return Number.isNaN(n) ? 0 : n;
}

type WasteKgKey =
  | "wastePlasticKg" | "wasteFoodWrapperKg" | "wastePaperCardboardKg" | "wasteGlassKg"
  | "wasteOrganicKg" | "wasteMetalKg" | "wasteFoamKg" | "wasteTextileKg"
  | "wasteEwasteKg" | "wasteOtherKg";

// "Other" is in the grid now; its "specify" text field sits below it
const WASTE_KG_FIELDS: { key: WasteKgKey; label: string }[] = [
  { key: "wastePlasticKg", label: "Plastic (kg)" },
  { key: "wasteFoodWrapperKg", label: "Food Wrapper (kg)" },
  { key: "wastePaperCardboardKg", label: "Paper / Cardboard (kg)" },
  { key: "wasteGlassKg", label: "Glass (kg)" },
  { key: "wasteOrganicKg", label: "Organic (kg)" },
  { key: "wasteMetalKg", label: "Metal (kg)" },
  { key: "wasteFoamKg", label: "Foam (kg)" },
  { key: "wasteTextileKg", label: "Clothes / Textiles (kg)" },
  { key: "wasteEwasteKg", label: "E-waste (kg)" },
  { key: "wasteOtherKg", label: "Other (kg)" },
];

// lays fields out two per row; a lone last field gets a spacer so it doesn't stretch full width
function FieldPairs<T extends { key: string }>({ items, render }: {
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <>
      {rows.map((row, i) => (
        <View key={i} className="mb-2.5 flex-row gap-2.5">
          {row.map((item) => (
            <React.Fragment key={item.key}>{render(item)}</React.Fragment>
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </>
  );
}

type PhotoField = "beforePhotos" | "afterPhotos" | "evidencePhotos";

const PHOTO_CATEGORY: Record<PhotoField, string> = {
  beforePhotos: "Before_Clearing",
  afterPhotos: "After_Clearing",
  evidencePhotos: "Additional_Evidence",
};

// the backend only accepts known image extensions, so make sure the name has one
function ensureFileName(name: string): string {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name) ? name : `${name}.jpg`;
}

function PhotoUploadMulti({ label, photos, onAdd, onRemove, required = false, onPreview }: {
  label: string;
  photos: PhotoAsset[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  required?: boolean;
  onPreview: (index: number) => void;
}) {
  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <Text className="text-[#dc2626]">*</Text>}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View
            key={`${photo.uri}-${index}`}
            className="overflow-hidden rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]"
            style={{ width: 96, height: 96 }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onPreview(index)}
              style={{ width: "100%", height: "100%" }}
            >
              <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </TouchableOpacity>

            {photo.uploading ? (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator color="white" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => onRemove(index)}
                className="absolute top-1 right-1 rounded-full bg-white/90 p-0.5"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={onAdd}
          className="items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#86efac] bg-[#dcfce7]"
          style={{ width: 96, height: 96 }}
        >
          <MaterialCommunityIcons name="camera-plus-outline" size={22} color="#16a34a" />
          <Text className="mt-1 text-center text-[10px] font-semibold text-[#16a34a]">
            Add Photo{photos.length > 0 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PhotoSourceSheet({ visible, onClose, onTakePhoto, onChooseGallery, }: {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl px-5 pt-3 pb-8" onPress={(e) => e.stopPropagation()}>
          <View className="self-center w-10 h-1 rounded-full bg-[#E2E8F0] mb-4" />

          <Text className="text-sm font-bold text-[#122A48] mb-1">Add Photo</Text>
          <Text className="text-[11px] text-[#94A3B8] mb-3">Choose a source</Text>

          <TouchableOpacity
            onPress={onTakePhoto}
            className="flex-row items-center gap-3 py-3 border-b border-[#F1F5F9]"
          >
            <View className="w-10 h-10 rounded-xl bg-[#dcfce7] items-center justify-center">
              <MaterialCommunityIcons name="camera-outline" size={20} color="#16a34a" />
            </View>
            <Text className="text-[13px] font-semibold text-[#334155]">Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onChooseGallery}
            className="flex-row items-center gap-3 py-3"
          >
            <View className="w-10 h-10 rounded-xl bg-[#dcfce7] items-center justify-center">
              <MaterialCommunityIcons name="image-outline" size={20} color="#16a34a" />
            </View>
            <Text className="text-[13px] font-semibold text-[#334155]">Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="mt-4 items-center justify-center rounded-xl bg-[#f1f5f9] py-3"
          >
            <Text className="text-[13px] font-semibold text-[#64748B]">Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// blank → null, so drafts keep "not filled in yet" as null
function toNumberOrNull(text: string): number | null {
  const n = parseFloat(text);
  return Number.isNaN(n) ? null : n;
}

// used to avoid creating an empty draft when there's nothing to save
function isFormEmpty(f: ReportFormState): boolean {
  return (
    !f.canalName.trim() && f.latitude == null && !f.nearestLandmark.trim() &&
    !f.dateObserved && !f.severity &&
    !f.waterLevel && !f.obstructionCoverage && !f.waterFlowCondition &&
    WASTE_KG_FIELDS.every((w) => !f[w.key].trim()) && !f.wasteOtherLabel.trim() &&
    !f.assignedPersonnel.trim() && !f.dateResponded && !f.actionTaken.trim() &&
    !f.wasteCollectedAmount.trim() && !f.finalCanalCondition && !f.remarks.trim() &&
    f.beforePhotos.length === 0 && f.afterPhotos.length === 0 && f.evidencePhotos.length === 0
  );
}

function getErrorMessage(err: any, fallback: string): string {
  const firstFieldError = typeof err === "object" && err !== null ? Object.values(err)[0] : null;
  const message = Array.isArray(firstFieldError) ? firstFieldError[0] : err?.detail ?? err?.error;
  return typeof message === "string" ? message : fallback;
}

function DraftSavedModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full items-center rounded-2xl bg-white p-6">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7]">
            <MaterialCommunityIcons name="content-save-check-outline" size={28} color="#16a34a" />
          </View>
          <Text className="mb-1 text-base font-extrabold text-[#122A48]">Draft Saved</Text>
          <Text className="mb-5 text-center text-[13px] text-[#64748B]">
            You can continue this report anytime from the Reports tab, on any device signed in to your barangay account.
          </Text>
          <TouchableOpacity onPress={onClose} className="w-full items-center rounded-xl bg-[#16a34a] py-3">
            <Text className="text-sm font-bold text-white">Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function NewReportScreen() {
  const router = useRouter();
  // report_id: continuing an existing in-progress report
  // clog_event_id: filed from the clog-clearing flow
  const params = useLocalSearchParams<{ report_id?: string; clog_event_id?: string }>();
  const { user } = useAuth();

  const clogEventId = params.clog_event_id ? Number(params.clog_event_id) : null;

  const [form, setForm] = useState<ReportFormState>(INITIAL_STATE);
  const [reportId, setReportId] = useState<number | null>(
    params.report_id ? Number(params.report_id) : null
  );
  const [isLoadingReport, setIsLoadingReport] = useState(!!params.report_id);
  const [isLocked, setIsLocked] = useState(false); // already submitted — read-only
  const [isMapVisible, setIsMapVisible] = useState(false);

  const [photoSheetField, setPhotoSheetField] = useState<PhotoField | null>(null);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isDraftSavedVisible, setIsDraftSavedVisible] = useState(false);

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isIncompleteVisible, setIsIncompleteVisible] = useState(false);

  const [preview, setPreview] = useState<{ field: PhotoField; index: number } | null>(null);

  // Photos need a server-side report to attach to. This ref holds the id once it exists,
  // and the promise ref stops two quick uploads from each creating their own report.
  const reportIdRef = useRef<number | null>(params.report_id ? Number(params.report_id) : null);
  const creatingRef = useRef<Promise<number> | null>(null);

  const barangayName = user?.barangay_details?.barangay_name ?? "Your barangay";
  const mapCenter = {
    latitude: user?.barangay_details?.latitude ?? MUNICIPALITY_CENTER.latitude,
    longitude: user?.barangay_details?.longitude ?? MUNICIPALITY_CENTER.longitude,
  };

  // Load an existing in-progress report when continuing one
  useEffect(() => {
    if (!params.report_id) return;

    api
      .get(`/api/canal-reports/${params.report_id}/`)
      .then((report: CanalMonitoringReport) => {
        if (report.is_submitted) {
          setIsLocked(true);
          return;
        }

        const toPhotos = (category: string): PhotoAsset[] =>
          (report.media ?? [])
            .filter((m: any) => m.media_category === category)
            .map((m: any) => ({
              uri: m.file_url,
              fileName: m.file_path?.split("/").pop() ?? `photo_${m.media}.jpg`,
              mediaId: m.media,
            }));

        const num = (v: number | null) => (v == null ? "" : String(v));

        setForm({
          canalName: report.canal_name ?? "",
          latitude: report.latitude,
          longitude: report.longitude,
          nearestLandmark: report.nearest_landmark ?? "",

          dateObserved: report.date_observed ? new Date(report.date_observed) : null,
          severity: report.severity,

          waterLevel: report.water_level,
          obstructionCoverage: report.obstruction_coverage,
          waterFlowCondition: report.water_flow_condition,

          wastePlasticKg: num(report.waste_plastic_kg),
          wasteFoodWrapperKg: num(report.waste_food_wrapper_kg),
          wastePaperCardboardKg: num(report.waste_paper_cardboard_kg),
          wasteGlassKg: num(report.waste_glass_kg),
          wasteOrganicKg: num(report.waste_organic_kg),
          wasteMetalKg: num(report.waste_metal_kg),
          wasteFoamKg: num(report.waste_foam_kg),
          wasteTextileKg: num(report.waste_textile_kg),
          wasteEwasteKg: num(report.waste_ewaste_kg),
          wasteOtherKg: num(report.waste_other_kg),
          wasteOtherLabel: report.waste_other_label ?? "",

          assignedPersonnel: report.assigned_personnel ?? "",
          dateResponded: report.date_responded ? new Date(report.date_responded) : null,
          actionTaken: report.action_taken ?? "",
          wasteCollectedAmount: num(report.waste_collected_amount),
          finalCanalCondition: report.final_canal_condition,
          remarks: report.remarks ?? "",

          beforePhotos: toPhotos("Before_Clearing"),
          afterPhotos: toPhotos("After_Clearing"),
          evidencePhotos: toPhotos("Additional_Evidence"),
        });
      })
      .catch(() => {
        Alert.alert("Error", "Couldn't load that report. Please try again.");
      })
      .finally(() => setIsLoadingReport(false));
  }, [params.report_id]);

  const update = <K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirmLocation = (location: PickedLocation) => {
    setForm((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    setIsMapVisible(false);
  };

  // Creates a nearly-empty in-progress report the first time something needs one.
  // Every field is optional server-side, so an empty body is valid.
  const ensureReportExists = async (): Promise<number> => {
    if (reportIdRef.current) return reportIdRef.current;

    if (!creatingRef.current) {
      creatingRef.current = api
        .post("/api/canal-reports/", clogEventId ? { clog_event: clogEventId } : {})
        .then((report) => {
          reportIdRef.current = report.report_id;
          setReportId(report.report_id);
          return report.report_id as number;
        })
        .finally(() => {
          creatingRef.current = null;
        });
    }
    return creatingRef.current;
  };

  const pickFromGallery = async (field: PhotoField) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access to upload evidence.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    await uploadPickedAssets(field, result.assets);
  };

  const pickFromCamera = async (field: PhotoField) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access to take evidence photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    await uploadPickedAssets(field, result.assets);
  };

  const uploadPickedAssets = async (field: PhotoField, assets: ImagePicker.ImagePickerAsset[]) => {
    const category = PHOTO_CATEGORY[field];
    const pending: PhotoAsset[] = assets.map((asset) => ({
      uri: asset.uri,
      fileName: ensureFileName(asset.fileName || asset.uri.split("/").pop() || "evidence_image.jpg"),
      uploading: true,
    }));
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ...pending] }));

    try {
      const id = await ensureReportExists();

      for (const photo of pending) {
        const formData = new FormData();
        formData.append("file", { uri: photo.uri, name: photo.fileName, type: "image/jpeg" } as any);
        formData.append("media_category", category);
        formData.append("report_id", String(id)); // backend reads report_id (the old screen sent monthly_report_id)

        const media = await api.upload("/api/report-media/upload/", formData);

        setForm((prev) => ({
          ...prev,
          [field]: prev[field].map((p) =>
            p.uri === photo.uri && p.uploading ? { ...p, uploading: false, mediaId: media.media } : p
          ),
        }));
      }
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.error ?? "One or more photos couldn't be uploaded. Please try again.");
      setForm((prev) => ({ ...prev, [field]: prev[field].filter((p) => !p.uploading) }));
    }
  };

  const removePhoto = async (field: PhotoField, index: number) => {
    const photo = form[field][index];
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));

    if (photo.mediaId) {
      try {
        await api.delete(`/api/report-media/${photo.mediaId}/`);
      } catch {
        Alert.alert("Error", "Couldn't remove that photo from the server. Please try again.");
        setForm((prev) => ({
          ...prev,
          [field]: [...prev[field].slice(0, index), photo, ...prev[field].slice(index)],
        }));
      }
    }
  };

  const allPhotos = [...form.beforePhotos, ...form.afterPhotos, ...form.evidencePhotos];
  const hasUploadingPhotos = allPhotos.some((p) => p.uploading);

  // Drafts keep blank waste fields as null; on submit they become 0.
  // is_submitted is only ever sent as true — a draft save never sends it, so a stale
  // second device saving a draft can't accidentally un-submit a report.
  const buildPayload = (submit: boolean) => {
    const kg = (text: string) => (submit ? parseAmount(text) : toNumberOrNull(text));
    const textOrNull = (text: string) => (text.trim() ? text.trim() : null);

    return {
      canal_name: textOrNull(form.canalName),
      latitude: form.latitude,
      longitude: form.longitude,
      nearest_landmark: form.nearestLandmark.trim(),

      date_observed: form.dateObserved ? form.dateObserved.toISOString() : null,
      severity: form.severity,

      water_level: form.waterLevel,
      obstruction_coverage: form.obstructionCoverage,
      water_flow_condition: form.waterFlowCondition,

      waste_plastic_kg: kg(form.wastePlasticKg),
      waste_food_wrapper_kg: kg(form.wasteFoodWrapperKg),
      waste_paper_cardboard_kg: kg(form.wastePaperCardboardKg),
      waste_glass_kg: kg(form.wasteGlassKg),
      waste_organic_kg: kg(form.wasteOrganicKg),
      waste_metal_kg: kg(form.wasteMetalKg),
      waste_foam_kg: kg(form.wasteFoamKg),
      waste_textile_kg: kg(form.wasteTextileKg),
      waste_ewaste_kg: kg(form.wasteEwasteKg),
      waste_other_kg: kg(form.wasteOtherKg),
      waste_other_label: form.wasteOtherLabel.trim(),

      assigned_personnel: textOrNull(form.assignedPersonnel),
      date_responded: form.dateResponded ? form.dateResponded.toISOString() : null,
      action_taken: textOrNull(form.actionTaken),
      waste_collected_amount: toNumberOrNull(form.wasteCollectedAmount),
      final_canal_condition: form.finalCanalCondition,
      remarks: form.remarks.trim(),

      ...(submit ? { is_submitted: true } : {}),
    };
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!form.canalName.trim()) missing.push("Canal name / ID");
    if (form.latitude == null || form.longitude == null) missing.push("GPS coordinates");
    if (!form.dateObserved) missing.push("Date / time observed");
    if (!form.severity) missing.push("Severity");
    if (!form.waterLevel) missing.push("Water level");
    if (!form.obstructionCoverage) missing.push("Obstruction coverage");
    if (!form.waterFlowCondition) missing.push("Water flow condition");
    if (!form.assignedPersonnel.trim()) missing.push("Assigned personnel");
    if (!form.dateResponded) missing.push("Date / time responded");
    if (!form.actionTaken.trim()) missing.push("Action taken");
    if (toNumberOrNull(form.wasteCollectedAmount) === null) missing.push("Waste collected");
    if (!form.finalCanalCondition) missing.push("Final canal condition");
    if (form.beforePhotos.length === 0) missing.push("Before Cleanup photo");
    if (form.afterPhotos.length === 0) missing.push("After Cleanup photo");
    return missing;
  };

  const handleSaveDraft = async () => {
    if (hasUploadingPhotos) {
      Alert.alert("Please wait", "Photos are still uploading.");
      return;
    }
    if (!reportIdRef.current && isFormEmpty(form)) {
      Alert.alert("Nothing to save", "Fill in something first, then save it as a draft.");
      return;
    }

    setIsSavingDraft(true);
    try {
      const id = await ensureReportExists();
      await api.patch(`/api/canal-reports/${id}/`, buildPayload(false));
      setIsDraftSavedVisible(true);
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err, "Couldn't save draft. Please try again."));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDraftSavedClose = () => {
    setIsDraftSavedVisible(false);
    router.replace("/(tabs)/reports" as any);
  };

  const handleOpenSubmitModal = () => {
    if (hasUploadingPhotos) {
      Alert.alert("Please wait", "Photos are still uploading.");
      return;
    }

    const missing = getMissingFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setIsIncompleteVisible(true);
      return;
    }

    if (form.dateResponded!.getTime() < form.dateObserved!.getTime()) {
      Alert.alert("Check the dates", "The response time can't be earlier than the time the problem was observed.");
      return;
    }

    setIsSubmitModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const id = await ensureReportExists();
      await api.patch(`/api/canal-reports/${id}/`, buildPayload(true));

      setIsSubmitModalVisible(false);
      Alert.alert(
        "Report Submitted",
        "Your report was successfully submitted!",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/reports" as any) }],
        { cancelable: false }
      );
    } catch (err: any) {
      setIsSubmitModalVisible(false);
      Alert.alert("Error", getErrorMessage(err, "Couldn't submit report. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingReport) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8fafc]">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#16a34a" size="large" />
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8fafc] px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="lock-outline" size={40} color="#94a3b8" />
        <Text className="mt-3 text-center text-sm font-semibold text-[#334155]">
          This report has already been submitted
        </Text>
        <Text className="mt-1 text-center text-[13px] text-[#64748B]">
          It can no longer be edited.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/reports" as any)}
          className="mt-5 rounded-[10px] bg-[#16a34a] px-5 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-white">Back to Reports</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#122A48]">
          {reportId ? "Continue Report" : "New Canal Report"}
        </Text>

        <View className="w-7" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-3.5 pt-3 pb-6">
        <View
          className="rounded-2xl border border-[#f1f5f9] bg-white p-3.5"
          style={{
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {/* MONITORING SITE INFORMATION */}
          <SectionHeader icon="map-marker-radius-outline" title="MONITORING SITE INFORMATION" />

          <View className="mb-3">
            <Field
              label="Canal Name / ID"
              required
              value={form.canalName}
              onChangeText={(t) => update("canalName", t)}
              placeholder="e.g. Purok 3 main canal"
            />
          </View>

          <View className="mb-3 flex-row gap-2.5">
            <LockedField label="Barangay" value={barangayName} />
            <LockedField label="Municipality" value="Rosario, La Union" />
          </View>

          <CoordinatePicker
            required
            latitude={form.latitude}
            longitude={form.longitude}
            onPress={() => setIsMapVisible(true)}
          />

          <View className="mb-3">
            <Field
              label="Nearest Landmark"
              value={form.nearestLandmark}
              onChangeText={(t) => update("nearestLandmark", t)}
              placeholder="e.g. beside Brgy. Hall"
            />
          </View>

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* DETECTION SUMMARY */}
          <SectionHeader icon="clipboard-alert-outline" title="DETECTION SUMMARY" />

          <View className="mb-3">
            <DateTimeField
              label="Date / Time Observed"
              required
              value={form.dateObserved}
              onChange={(d) => update("dateObserved", d)}
            />
          </View>

          <ChipSelect
            label="Severity"
            required
            options={SEVERITY_OPTIONS}
            value={form.severity}
            onChange={(v) => update("severity", v)}
            colorMap={SEVERITY_COLORS}
          />

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* CANAL CONDITION  */}
          <SectionHeader icon="waves" title="CANAL CONDITION" />

          <ChipSelect
            label="Water Level"
            required
            options={WATER_LEVEL_OPTIONS}
            value={form.waterLevel}
            onChange={(v) => update("waterLevel", v)}
          />

          <ChipSelect
            label="Obstruction Coverage"
            required
            options={OBSTRUCTION_COVERAGE_OPTIONS}
            value={form.obstructionCoverage}
            onChange={(v) => update("obstructionCoverage", v)}
          />

          <ChipSelect
            label="Water Flow Condition"
            required
            options={WATER_FLOW_OPTIONS}
            value={form.waterFlowCondition}
            onChange={(v) => update("waterFlowCondition", v)}
          />

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* WASTE COMPOSITION */}
          <SectionHeader icon="trash-can-outline" title="WASTE COMPOSITION" />
          <Text className="mb-3 -mt-1 text-[11px] text-[#94a3b8]">
            Estimate what was in the canal. Anything left blank is recorded as 0 when you submit.
          </Text>

          {/* By category */}
          <View className="mb-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <Text className="mb-1 text-xs font-bold text-[#334155]">By Category (kg)</Text>
            <Text className="mb-2.5 text-[11px] leading-4 text-[#94a3b8]">
              Plastic: bottles, bags, containers · Food Wrapper: snack and junk-food packaging · Clothes / Textiles: shirts, shorts, towels · E-waste: batteries, vapes, electronics
            </Text>

            <FieldPairs
              items={WASTE_KG_FIELDS}
              render={(f) => (
                <Field
                  label={f.label}
                  value={form[f.key]}
                  onChangeText={(t) => update(f.key, sanitizeDecimal(t))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              )}
            />

            <View className="mb-1">
              <Field
                label="Other — specify"
                value={form.wasteOtherLabel}
                onChangeText={(t) => update("wasteOtherLabel", t)}
                placeholder="e.g. rubber, tires"
              />
            </View>
          </View>

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* BARANGAY RESPONSE */}
          <SectionHeader icon="account-hard-hat-outline" title="BARANGAY RESPONSE" />

          <View className="mb-3">
            <Field
              label="Assigned Personnel"
              required
              value={form.assignedPersonnel}
              onChangeText={(t) => update("assignedPersonnel", t)}
              placeholder="Who carried out the cleanup"
            />
          </View>

          <View className="mb-3">
            <DateTimeField
              label="Date / Time Responded"
              required
              value={form.dateResponded}
              onChange={(d) => update("dateResponded", d)}
            />
          </View>

          <Field
            label="Action Taken"
            required
            value={form.actionTaken}
            onChangeText={(t) => update("actionTaken", t)}
            placeholder="Describe what was done to clear the canal..."
            multiline
            numberOfLines={3}
          />

          <View className="mb-3">
            <Field
              label="Waste Collected"
              required
              value={form.wasteCollectedAmount}
              onChangeText={(t) => update("wasteCollectedAmount", sanitizeDecimal(t))}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <ChipSelect
            label="Final Canal Condition"
            required
            options={FINAL_CONDITION_OPTIONS}
            value={form.finalCanalCondition}
            onChange={(v) => update("finalCanalCondition", v)}
          />

          <Field
            label="Remarks"
            value={form.remarks}
            onChangeText={(t) => update("remarks", t)}
            placeholder="Anything else worth noting (optional)"
            multiline
            numberOfLines={3}
          />

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* PHOTOS */}
          <SectionHeader icon="tray-arrow-up" title="PHOTOS" />

          <PhotoUploadMulti
            label="Before Cleanup"
            required
            photos={form.beforePhotos}
            onAdd={() => setPhotoSheetField("beforePhotos")}
            onRemove={(i) => removePhoto("beforePhotos", i)}
            onPreview={(i) => setPreview({ field: "beforePhotos", index: i })}
          />
          <PhotoUploadMulti
            label="After Cleanup"
            required
            photos={form.afterPhotos}
            onAdd={() => setPhotoSheetField("afterPhotos")}
            onRemove={(i) => removePhoto("afterPhotos", i)}
            onPreview={(i) => setPreview({ field: "afterPhotos", index: i })}
          />
          <PhotoUploadMulti
            label="Additional Evidence"
            photos={form.evidencePhotos}
            onAdd={() => setPhotoSheetField("evidencePhotos")}
            onRemove={(i) => removePhoto("evidencePhotos", i)}
            onPreview={(i) => setPreview({ field: "evidencePhotos", index: i })}
          />

          <View className="mt-3 flex-row gap-2.5">
            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] border border-[#cbd5e1] bg-[#f8fafc] py-3 ${
                isSavingDraft ? "opacity-60" : "opacity-100"
              }`}
            >
              {isSavingDraft ? (
                <ActivityIndicator color="#475569" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#475569" />
                  <Text className="text-[13px] font-semibold text-[#475569]">Save Draft</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenSubmitModal}
              disabled={isSavingDraft || isSubmitting}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#16a34a] py-3 ${
                isSubmitting ? "opacity-60" : "opacity-100"
              }`}
            >
              <MaterialCommunityIcons name="send-outline" size={18} color="white" />
              <Text className="text-[13px] font-semibold text-white">Submit</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      <LocationPickerMap
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        onConfirm={handleConfirmLocation}
        initial={
          form.latitude != null && form.longitude != null
            ? { latitude: form.latitude, longitude: form.longitude }
            : null
        }
        centerLat={mapCenter.latitude}
        centerLng={mapCenter.longitude}
      />

      <PhotoSourceSheet
        visible={photoSheetField !== null}
        onClose={() => setPhotoSheetField(null)}
        onTakePhoto={() => {
          const field = photoSheetField;
          setPhotoSheetField(null);
          if (field) pickFromCamera(field);
        }}
        onChooseGallery={() => {
          const field = photoSheetField;
          setPhotoSheetField(null);
          if (field) pickFromGallery(field);
        }}
      />

      <SubmitReportModal
        visible={isSubmitModalVisible}
        onClose={() => setIsSubmitModalVisible(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        summary={{
          location: barangayName,
          canalName: form.canalName.trim(),
          severity: form.severity,
          dateObserved: form.dateObserved,
          responder: form.assignedPersonnel.trim(),
          wasteCollectedKg: toNumberOrNull(form.wasteCollectedAmount) ?? 0,
          photoCount: allPhotos.length,
        }}
      />

      <IncompleteReportModal
        visible={isIncompleteVisible}
        missingFields={missingFields}
        onClose={() => setIsIncompleteVisible(false)}
      />

      <PhotoPreviewModal
        visible={preview !== null}
        photos={preview ? form[preview.field].map((p) => ({ uri: p.uri })) : []}
        initialIndex={preview?.index ?? 0}
        onClose={() => setPreview(null)}
      />

      <DraftSavedModal visible={isDraftSavedVisible} onClose={handleDraftSavedClose} />
    </SafeAreaView>
  );
}