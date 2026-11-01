import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Platform, KeyboardTypeOptions, ActivityIndicator, Image, Modal, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import ChipSelect from "@/components/reports/ChipSelect";
import { CleanupSummary } from "@/components/reports/CleanupSummary";
import {
  SEVERITY_OPTIONS, SEVERITY_COLORS,
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS,
  PUROK_OPTIONS
} from "@/constants/reports";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import type {
  CanalMonitoringReport, ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition, CustomWasteType,
  CleanupPreview,
} from "@/types/reports";
import { AddOtherWasteModal } from "@/components/reports/AddOtherWasteModal";
import { SubmitReportModal } from "@/components/reports/SubmitReportModal";
import { IncompleteReportModal } from "@/components/reports/IncompleteReportModal";
import { PhotoPreviewModal } from "@/components/reports/PhotoPreviewModal";
import { IncompleteSignatoriesModal } from "@/components/reports/IncompleteSignatoriesModal";
import { PostReportSummary, type SystemData } from "@/components/reports/PostReportSummary";
import { CompletePostModal } from "@/components/reports/CompletePostModal";
import { ConfirmActionModal } from "@/components/reports/ConfirmActionModal";


interface PhotoAsset {
  uri: string;
  fileName: string;
  mediaId?: number;
  uploading?: boolean;
}

interface ReportFormState {
  // Monitoring site
  purok: number | null;

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
  wasteSanitaryKg: string;
  wasteFootwearKg: string;
  wasteMedicalKg: string;
  wasteOtherKg: string;
  wasteOtherLabel: string;
  customWaste: { wasteTypeId: number; name: string; status: string; kg: string }[];

  // Barangay response
  assignedPersonnel: string;
  dateResponded: Date | null;
  actionTaken: string;
  remarks: string;

  // Photos
  beforePhotos: PhotoAsset[];
  afterPhotos: PhotoAsset[];
  evidencePhotos: PhotoAsset[];
}

const INITIAL_STATE: ReportFormState = {
  purok: null,  

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
  wasteSanitaryKg: "",
  wasteFootwearKg: "",
  wasteMedicalKg: "",
  wasteOtherKg: "",
  wasteOtherLabel: "",
  customWaste: [],

  assignedPersonnel: "",
  dateResponded: null,
  actionTaken: "",
  remarks: "",

  beforePhotos: [],
  afterPhotos: [],
  evidencePhotos: [],
};

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, numberOfLines = 1, required = false, stacked = false, }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
  stacked?: boolean;
}) {
  return (
    <View className={`${stacked ? "" : "flex-1"} ${multiline ? "mb-3" : ""}`}>
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
    <View>
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
function LockedField({ label, value, stacked = false }: { label: string; value: string; stacked?: boolean }) {
  return (
    <View className={stacked ? "" : "flex-1"}>
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">{label}</Text>
      <View className="flex-row items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-[#e2e8f0] px-3 py-2.5">
        <MaterialCommunityIcons name="lock-outline" size={14} color="#94a3b8" />
        <Text className="flex-1 text-[13px] text-[#64748b]">{value}</Text>
      </View>
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
  | "wasteEwasteKg" | "wasteSanitaryKg" | "wasteFootwearKg" | "wasteMedicalKg" | "wasteOtherKg";

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
  { key: "wasteSanitaryKg", label: "Sanitary / Hygiene (kg)" },
  { key: "wasteFootwearKg", label: "Footwear / Rubber (kg)" },
  { key: "wasteMedicalKg", label: "Medical (kg)" },
  { key: "wasteOtherKg", label: "Other (kg)" },
];

const WASTE_GRID_FIELDS = WASTE_KG_FIELDS.filter((w) => w.key !== "wasteOtherKg");

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
    f.purok == null &&
    !f.dateObserved && !f.severity &&
    !f.waterLevel && !f.obstructionCoverage && !f.waterFlowCondition &&
    WASTE_KG_FIELDS.every((w) => !f[w.key].trim()) && !f.wasteOtherLabel.trim() &&
    f.customWaste.length === 0 &&
    !f.assignedPersonnel.trim() && !f.dateResponded && !f.actionTaken.trim() &&
    !f.remarks.trim() &&
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

function postErrorMessage(err: any): string {
  if (!err) return "Couldn't complete the report. Please try again.";
  const extra = Array.isArray(err.missing) ? `\nMissing: ${err.missing.join(", ")}` : "";
  if (typeof err.detail === "string") return err.detail + extra;
  if (typeof err.is_submitted === "string" || Array.isArray(err.is_submitted)) return String(err.is_submitted);
  const parts = Object.values(err).flat().filter((v) => typeof v === "string") as string[];
  return parts.length ? parts.join("\n") : "Couldn't complete the report. Please try again.";
}


export default function NewReportScreen() {
  const router = useRouter();
  // report_id: continuing an existing in-progress report
  // clog_event_id: filed from the clog-clearing flow
  const params = useLocalSearchParams<{ report_id?: string; clog_event_id?: string }>();
  const { user } = useAuth();

  const clogEventId = params.clog_event_id ? Number(params.clog_event_id) : null;

  const [isCheckingSignatories, setIsCheckingSignatories] = useState(false);

  const [form, setForm] = useState<ReportFormState>(INITIAL_STATE);
  const [reportId, setReportId] = useState<number | null>(
    params.report_id ? Number(params.report_id) : null
  );
  const [isLoadingReport, setIsLoadingReport] = useState(!!params.report_id);
  const [isLocked, setIsLocked] = useState(false); // already submitted — read-only

  const [photoSheetField, setPhotoSheetField] = useState<PhotoField | null>(null);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isDraftSavedVisible, setIsDraftSavedVisible] = useState(false);

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [missingSignatories, setMissingSignatories] = useState<string[]>([]);
  const [isSignatoriesVisible, setIsSignatoriesVisible] = useState(false);
  const [isIncompleteVisible, setIsIncompleteVisible] = useState(false);

  const [isPost, setIsPost] = useState(false);
  const [reportStatus, setReportStatus] = useState("Draft");
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  // cleanup mode = a new report with no clog event, or a loaded report whose scope is Barangay
  const [isCleanup, setIsCleanup] = useState(!params.report_id && !clogEventId);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const [preview, setPreview] = useState<{ field: PhotoField; index: number } | null>(null);

  // Photos need a server-side report to attach to. This ref holds the id once it exists,
  // and the promise ref stops two quick uploads from each creating their own report.
  const reportIdRef = useRef<number | null>(params.report_id ? Number(params.report_id) : null);
  const creatingRef = useRef<Promise<number> | null>(null);

  const barangayName = user?.barangay_details?.barangay_name ?? "Your barangay";

  const [wasteTypes, setWasteTypes] = useState<CustomWasteType[]>([]);
  const [isAddWasteVisible, setIsAddWasteVisible] = useState(false);

  useEffect(() => {
    api.get("/api/custom-waste-types/")
      .then((list: CustomWasteType[]) => setWasteTypes(list))
      .catch(() => {});
  }, []);

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
          purok: report.purok,

          dateObserved: report.date_observed ? new Date(report.date_observed) : null,
          severity: report.severity,

          waterLevel: report.overall_water_level,
          obstructionCoverage: report.overall_obstruction_coverage,
          waterFlowCondition: report.overall_water_flow_condition,

          wastePlasticKg: num(report.waste_plastic_kg),
          wasteFoodWrapperKg: num(report.waste_food_wrapper_kg),
          wastePaperCardboardKg: num(report.waste_paper_cardboard_kg),
          wasteGlassKg: num(report.waste_glass_kg),
          wasteOrganicKg: num(report.waste_organic_kg),
          wasteMetalKg: num(report.waste_metal_kg),
          wasteFoamKg: num(report.waste_foam_kg),
          wasteTextileKg: num(report.waste_textile_kg),
          wasteEwasteKg: num(report.waste_ewaste_kg),
          wasteSanitaryKg: num(report.waste_sanitary_kg),
          wasteFootwearKg: num(report.waste_footwear_kg),
          wasteMedicalKg: num(report.waste_medical_kg),
          wasteOtherKg: num(report.waste_other_kg),
          wasteOtherLabel: report.waste_other_label ?? "",
          customWaste: (report.custom_waste ?? []).map((c) => ({
            wasteTypeId: c.waste_type,
            name: c.waste_type_name,
            status: c.waste_type_status,
            kg: c.weight_kg > 0 ? String(c.weight_kg) : "",
          })),

          assignedPersonnel: report.assigned_personnel ?? "",
          dateResponded: report.date_responded ? new Date(report.date_responded) : null,
          actionTaken: report.action_taken ?? "",
          remarks: report.remarks ?? "",

          beforePhotos: toPhotos("Before_Clearing"),
          afterPhotos: toPhotos("After_Clearing"),
          evidencePhotos: toPhotos("Additional_Evidence"),
        });
        const post =
          report.clog_event != null &&
          ["Awaiting_Post_Report", "Ready_To_Verify"].includes(report.status);
        setIsPost(post);
        setIsCleanup(report.report_scope === "Barangay");
        setReportStatus(report.status);
        if (post) {
          setSystemLoading(true);
          api
            .get(`/api/canal-reports/${report.report_id}/system-data/`)
            .then((d: SystemData) => setSystemData(d))
            .catch(() => setSystemData(null))
            .finally(() => setSystemLoading(false));
        }
      })
      .catch(() => {
        Alert.alert("Error", "Couldn't load that report. Please try again.");
      })
      .finally(() => setIsLoadingReport(false));
  }, [params.report_id]);

  const update = <K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // new cleanup report: the cleanup date starts as now
  useEffect(() => {
    if (isCleanup && !params.report_id) {
      setForm((p) => (p.dateResponded ? p : { ...p, dateResponded: new Date() }));
    }
  }, []);

  // fetch the sensor data per purok whenever the cleanup date changes
  useEffect(() => {
    if (!isCleanup || !form.dateResponded || isLoadingReport) return;
    const iso = form.dateResponded.toISOString();
    const t = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(false);
      api
        .get(`/api/canal-reports/cleanup-preview/?date=${encodeURIComponent(iso)}`)
        .then((d: CleanupPreview) => setCleanupPreview(d))
        .catch(() => setPreviewError(true))
        .finally(() => setPreviewLoading(false));
    }, 500);
    return () => clearTimeout(t);
  }, [isCleanup, form.dateResponded, isLoadingReport]);

  const addCustomWaste = (t: CustomWasteType) => {
    setWasteTypes((prev) => (prev.some((p) => p.waste_type_id === t.waste_type_id) ? prev : [...prev, t]));
    setForm((prev) =>
      prev.customWaste.some((c) => c.wasteTypeId === t.waste_type_id)
        ? prev
        : { ...prev, customWaste: [...prev.customWaste, { wasteTypeId: t.waste_type_id, name: t.name, status: t.status, kg: "" }] }
    );
  };
  const updateCustomKg = (id: number, kg: string) =>
    setForm((prev) => ({ ...prev, customWaste: prev.customWaste.map((c) => (c.wasteTypeId === id ? { ...c, kg } : c)) }));
  const removeCustomWaste = (id: number) =>
    setForm((prev) => ({ ...prev, customWaste: prev.customWaste.filter((c) => c.wasteTypeId !== id) }));

  const customWasteKg = form.customWaste.reduce((sum, c) => sum + parseAmount(c.kg), 0);
  const wasteTotalKg =
    Math.round((WASTE_KG_FIELDS.reduce((sum, w) => sum + parseAmount(form[w.key]), 0) + customWasteKg) * 100) / 100;
  const hasAnyWaste =
    WASTE_KG_FIELDS.some((w) => form[w.key].trim() !== "") || form.customWaste.some((c) => c.kg.trim() !== "");

  // Creates a nearly-empty in-progress report the first time something needs one.
  // Every field is optional server-side, so an empty body is valid.
  const ensureReportExists = async (): Promise<number> => {
    if (reportIdRef.current) return reportIdRef.current;

    if (!creatingRef.current) {
      creatingRef.current = api
        .post(
          "/api/canal-reports/",
          clogEventId ? { clog_event: clogEventId } : isCleanup ? { report_scope: "Barangay" } : {}
        )
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

  // Drafts keep blank waste fields as null; on complete they become 0.
  // Reports are never submitted from this form: submitting happens on the Submit screen after verifying.
  const buildPayload = (submit: boolean) => {
    const kg = (text: string) => (submit ? parseAmount(text) : toNumberOrNull(text));
    const textOrNull = (text: string) => (text.trim() ? text.trim() : null);

    return {
      purok: form.purok,

      date_observed: form.dateObserved ? form.dateObserved.toISOString() : null,
      severity: form.severity,

      overall_water_level: form.waterLevel,
      overall_obstruction_coverage: form.obstructionCoverage,
      overall_water_flow_condition: form.waterFlowCondition,

      waste_plastic_kg: kg(form.wastePlasticKg),
      waste_food_wrapper_kg: kg(form.wasteFoodWrapperKg),
      waste_paper_cardboard_kg: kg(form.wastePaperCardboardKg),
      waste_glass_kg: kg(form.wasteGlassKg),
      waste_organic_kg: kg(form.wasteOrganicKg),
      waste_metal_kg: kg(form.wasteMetalKg),
      waste_foam_kg: kg(form.wasteFoamKg),
      waste_textile_kg: kg(form.wasteTextileKg),
      waste_ewaste_kg: kg(form.wasteEwasteKg),
      waste_sanitary_kg: kg(form.wasteSanitaryKg),
      waste_footwear_kg: kg(form.wasteFootwearKg),
      waste_medical_kg: kg(form.wasteMedicalKg),
      waste_other_kg: kg(form.wasteOtherKg),
      waste_other_label: form.wasteOtherLabel.trim(),
      custom_waste: form.customWaste.map((c) => ({ waste_type: c.wasteTypeId, weight_kg: parseAmount(c.kg) })),

      assigned_personnel: textOrNull(form.assignedPersonnel),
      date_responded: form.dateResponded ? form.dateResponded.toISOString() : null,
      action_taken: textOrNull(form.actionTaken),
      waste_collected_amount: submit || hasAnyWaste ? wasteTotalKg : null,
      remarks: form.remarks.trim(),
    };
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (isCleanup) {
      const hasSensorData = (cleanupPreview?.puroks ?? []).some((p) => p.has_sensor_data);
      if (!form.dateResponded) missing.push("Date / time of the cleanup");
      if (!hasSensorData) {
        if (!form.waterLevel) missing.push("Overall water level");
        if (!form.obstructionCoverage) missing.push("Overall obstruction");
        if (!form.waterFlowCondition) missing.push("Overall water flow");
      }
      if (!form.assignedPersonnel.trim()) missing.push("Assigned personnel");
      if (!form.actionTaken.trim()) missing.push("Action taken");
      if (wasteTotalKg <= 0) missing.push("Waste composition (at least one category)");
      form.customWaste.forEach((c) => {
        if (parseAmount(c.kg) <= 0) missing.push(`Weight for ${c.name}`);
      });
      if (form.beforePhotos.length === 0) missing.push("Before Cleanup photo");
      if (form.afterPhotos.length === 0) missing.push("After Cleanup photo");
      return missing;
    }
    if (form.purok == null) missing.push("Purok");
    if (!form.dateObserved) missing.push("Date / time observed");
    if (!form.severity) missing.push("Severity");
    if (!form.waterLevel) missing.push("Overall water level");
    if (!form.obstructionCoverage) missing.push("Overall obstruction");
    if (!form.waterFlowCondition) missing.push("Overall water flow");
    if (!form.assignedPersonnel.trim()) missing.push("Assigned personnel");
    if (!form.dateResponded) missing.push("Date / time responded");
    if (!form.actionTaken.trim()) missing.push("Action taken");
    if (wasteTotalKg <= 0) missing.push("Waste composition (at least one category)");
    form.customWaste.forEach((c) => {
      if (parseAmount(c.kg) <= 0) missing.push(`Weight for ${c.name}`);
    });
    if (form.beforePhotos.length === 0) missing.push("Before Cleanup photo");
    if (form.afterPhotos.length === 0) missing.push("After Cleanup photo");
    return missing;
  };

  const handleSaveDraft = async () => {
    if (hasUploadingPhotos) {
      Alert.alert("Please wait", "Photos are still uploading.");
      return;
    }
    if (!reportIdRef.current && isFormEmpty(isCleanup ? { ...form, dateResponded: null } : form)) {
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

  const handleOpenCompleteModal = () => {
    if (hasUploadingPhotos) {
      Alert.alert("Please wait", "Photos are still uploading.");
      return;
    }
    if (isCleanup && (previewLoading || !cleanupPreview)) {
      Alert.alert("Please wait", "The canal data is still loading.");
      return;
    }
    const missing = getMissingFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setIsIncompleteVisible(true);
      return;
    }
    if (isCleanup) {
      if (form.dateResponded!.getTime() > Date.now() + 5 * 60 * 1000) {
        Alert.alert("Check the date", "The cleanup date can't be in the future.");
        return;
      }
    } else if (form.dateResponded!.getTime() < form.dateObserved!.getTime()) {
      Alert.alert("Check the dates", "The response time can't be earlier than the time the problem was observed.");
      return;
    }
    setIsSubmitModalVisible(true);
  };

  const handleConfirmComplete = async () => {
    setIsSubmitting(true);
    try {
      const id = await ensureReportExists();
      await api.patch(`/api/canal-reports/${id}/`, buildPayload(true));
      await api.post(`/api/canal-reports/${id}/complete/`, {});
      setIsSubmitModalVisible(false);
      router.replace({ pathname: "/view-report", params: { id: String(id) } } as any);
    } catch (err: any) {
      setIsSubmitModalVisible(false);
      Alert.alert("Can't complete yet", postErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // post-report: waste, photos and remarks are required; the canal condition comes from the sensors
  const getPostMissing = (): string[] => {
    const missing: string[] = [];
    if (wasteTotalKg <= 0) missing.push("Waste composition (at least one category)");
    form.customWaste.forEach((c) => {
      if (parseAmount(c.kg) <= 0) missing.push(`Weight for ${c.name}`);
    });
    if (form.beforePhotos.length === 0) missing.push("Before Cleanup photo");
    if (form.afterPhotos.length === 0) missing.push("After Cleanup photo");
    return missing;
  };

  const handleCompletePost = () => {
    if (hasUploadingPhotos) {
      Alert.alert("Please wait", "Photos are still uploading.");
      return;
    }
    const missing = getPostMissing();
    if (missing.length > 0) {
      setMissingFields(missing);
      setIsIncompleteVisible(true);
      return;
    }
    setCompleteOpen(true);
  };

  const confirmCompletePost = async () => {
    setIsCompleting(true);
    try {
      const id = await ensureReportExists();
      await api.patch(`/api/canal-reports/${id}/`, buildPayload(false));
      const done = await api.post(`/api/canal-reports/${id}/complete-post/`, {});

      setForm((prev) => ({
        ...prev,
        purok: done.purok ?? prev.purok,
        severity: done.severity ?? prev.severity,
        waterLevel: done.overall_water_level,
        obstructionCoverage: done.overall_obstruction_coverage,
        waterFlowCondition: done.overall_water_flow_condition,
      }));
      setReportStatus(done.status);
      setCompleteOpen(false);
      router.replace({ pathname: "/view-report", params: { id: String(id) } } as any);
    } catch (err: any) {
      setCompleteOpen(false);
      Alert.alert("Can't complete yet", postErrorMessage(err));
    } finally {
      setIsCompleting(false);
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
          {isPost ? "Post-Report" : isCleanup ? "Weekly Cleanup Report" : reportId ? "Continue Report" : "New Canal Report"}
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
          {isPost ? (
            <PostReportSummary
              barangay={barangayName}
              purok={form.purok}
              detectedAt={form.dateObserved}
              severity={form.severity}
              personnel={form.assignedPersonnel}
              respondedAt={form.dateResponded}
              action={form.actionTaken}
              condition={{
                waterLevel: form.waterLevel,
                obstruction: form.obstructionCoverage,
                flow: form.waterFlowCondition,
              }}
              system={systemData}
              systemLoading={systemLoading}
              completed={reportStatus === "Ready_To_Verify"}
            />
          ) : isCleanup ? (
            <>
              <SectionHeader icon="broom" title="CLEANUP DETAILS" />

              <View className="mb-3 flex-row gap-2.5">
                <LockedField label="Barangay" value={barangayName} />
                <LockedField label="Municipality" value="Rosario, La Union" />
              </View>

              <DateTimeField
                label="Date / Time of the Cleanup"
                required
                value={form.dateResponded}
                onChange={(d) => update("dateResponded", d)}
              />
              {form.dateResponded && form.dateResponded.getDay() !== 6 && (
                <Text className="mt-1.5 text-[11px] text-[#b45309]">
                  This date is not a Saturday. You can still continue.
                </Text>
              )}

              <View className="my-3 h-px bg-[#f1f5f9]" />

              <SectionHeader icon="waves" title="OVERALL CANAL CONDITION" />
              <Text className="mb-3 -mt-1 text-[11px] text-[#94a3b8]">
                Taken from your sensors for the 7 days before the cleanup. Puroks without sensors are not counted.
              </Text>
              {previewError && (
                <Text className="mb-2 text-[12px] text-[#dc2626]">
                  Couldn't load the purok data. Check your connection, then change the date to try again.
                </Text>
              )}
              <CleanupSummary
                puroks={cleanupPreview?.puroks ?? []}
                loading={previewLoading}
                manual={{ water: form.waterLevel, obstruction: form.obstructionCoverage, flow: form.waterFlowCondition }}
                onManualChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />

              <View className="mb-3 mt-1.5 h-px bg-[#f1f5f9]" />
            </>
          ) : (
            <>
              {/* MONITORING SITE INFORMATION */}
              <SectionHeader icon="map-marker-radius-outline" title="MONITORING SITE INFORMATION" />

              <View className="mb-3 flex-row gap-2.5">
                <LockedField label="Barangay" value={barangayName} />
                <LockedField label="Municipality" value="Rosario, La Union" />
              </View>

              <ChipSelect
                label="Purok"
                required
                options={PUROK_OPTIONS}
                value={form.purok != null ? String(form.purok) : null}
                onChange={(v) => update("purok", Number(v))}
              />

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

              {/* OVERALL CANAL CONDITION */}
              <SectionHeader icon="waves" title="OVERALL CANAL CONDITION" />
              <Text className="mb-3 -mt-1 text-[11px] text-[#94a3b8]">
                Describe the purok as a whole: the highest water level, the worst flow, and how much of its canals were obstructed.
              </Text>

              <ChipSelect
                label="Overall Water Level"
                required
                options={WATER_LEVEL_OPTIONS}
                value={form.waterLevel}
                onChange={(v) => update("waterLevel", v)}
              />

              <ChipSelect
                label="Overall Obstruction"
                required
                options={OBSTRUCTION_COVERAGE_OPTIONS}
                value={form.obstructionCoverage}
                onChange={(v) => update("obstructionCoverage", v)}
              />

              <ChipSelect
                label="Overall Water Flow"
                required
                options={WATER_FLOW_OPTIONS}
                value={form.waterFlowCondition}
                onChange={(v) => update("waterFlowCondition", v)}
              />

              <View className="mb-3 h-px bg-[#f1f5f9]" />
            </>
          )}

          {/* WASTE COMPOSITION */}
          <SectionHeader icon="trash-can-outline" title="WASTE COMPOSITION" />
          <Text className="mb-3 -mt-1 text-[11px] text-[#94a3b8]">
            Estimate what was in the canal. Anything left blank is recorded as 0 when you submit. Waste Collected is totaled automatically.
          </Text>

          {/* By category */}
          <View className="mb-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <Text className="mb-1 text-xs font-bold text-[#334155]">By Category (kg)</Text>
            <Text className="mb-2.5 text-[11px] leading-4 text-[#94a3b8]">
              Plastic: bottles, bags, containers · Food Wrapper: snack and junk-food packaging · Clothes / Textiles: shirts, shorts, towels · E-waste: batteries, vapes, electronics · Sanitary / Hygiene: diapers, pads, wet wipes · Footwear / Rubber: slippers, rubber scraps · Medical: facemasks, gloves, syringes, medicine packs
            </Text>

            <FieldPairs
              items={WASTE_GRID_FIELDS}
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

            <View className="mt-1 border-t border-[#e2e8f0] pt-2.5">
              <Text className="mb-1 text-xs font-bold text-[#334155]">Other Waste (kg)</Text>
              <Text className="mb-2 text-[11px] leading-4 text-[#94a3b8]">
                Anything not listed above, like wood or a mattress. Types you add are saved for your next report, and other barangays see them once MENRO approves.
              </Text>

              {form.customWaste.map((c) => (
                <View key={c.wasteTypeId} className="mb-2 flex-row items-end gap-2">
                  <View className="flex-1">
                    <Field
                      label={c.status === "Pending" ? `${c.name} (kg) · pending approval` : `${c.name} (kg)`}
                      value={c.kg}
                      onChangeText={(t) => updateCustomKg(c.wasteTypeId, sanitizeDecimal(t))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => removeCustomWaste(c.wasteTypeId)}
                    className="mb-0.5 h-10 w-10 items-center justify-center rounded-xl bg-[#fee2e2]"
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setIsAddWasteVisible(true)}
                className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#94a3b8] py-2.5"
              >
                <MaterialCommunityIcons name="plus" size={16} color="#475569" />
                <Text className="text-[13px] font-semibold text-[#475569]">Add other waste</Text>
              </TouchableOpacity>

              {(form.wasteOtherKg.trim() !== "" || form.wasteOtherLabel.trim() !== "") && (
                <View className="mt-2.5">
                  <Text className="mb-1 text-[11px] text-[#94a3b8]">From your earlier draft:</Text>
                  <Field
                    label="Other (kg)"
                    value={form.wasteOtherKg}
                    onChangeText={(t) => update("wasteOtherKg", sanitizeDecimal(t))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  <View className="mt-2">
                    <Field
                      label="Other — specify"
                      value={form.wasteOtherLabel}
                      onChangeText={(t) => update("wasteOtherLabel", t)}
                      placeholder="e.g. wood"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          <View className="mb-3 h-px bg-[#f1f5f9]" />

          {/* BARANGAY RESPONSE */}
          <SectionHeader icon="account-hard-hat-outline" title="BARANGAY RESPONSE" />

          {!isPost && (
            <>
              <View className="mb-3">
                <Field
                  stacked 
                  label="Assigned Personnel"
                  required
                  value={form.assignedPersonnel}
                  onChangeText={(t) => update("assignedPersonnel", t)}
                  placeholder="Who carried out the cleanup"
                />
              </View>

              {!isCleanup && (
                <View className="mb-3">
                  <DateTimeField
                    label="Date / Time Responded"
                    required
                    value={form.dateResponded}
                    onChange={(d) => update("dateResponded", d)}
                  />
                </View>
              )}

              <Field
                stacked 
                label="Action Taken"
                required
                value={form.actionTaken}
                onChangeText={(t) => update("actionTaken", t)}
                placeholder="Describe what was done to clear the canal..."
                multiline
                numberOfLines={3}
              />
            </>
          )}

          <View className="mb-3">
            <LockedField stacked label="Waste Collected (auto total)" value={`${wasteTotalKg.toFixed(2)} kg`} />
          </View>

          {isCleanup && (
            <Text className="mb-1.5 text-[11px] leading-4 text-[#94a3b8]">
              Puroks without sensors aren't part of the summary above. If you want to report on them, describe their canal condition here, along with anything else worth noting.
            </Text>
          )}
          <Field
            stacked
            label="Remarks"
            value={form.remarks}
            onChangeText={(t) => update("remarks", t)}
            placeholder={
              isCleanup
                ? "e.g. Purok 5 has no sensor. Canal was mostly clear, only a few leaves."
                : "Anything else worth noting (optional)"
            }
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

          <View className="mt-4 gap-2.5">
            {isPost ? (
              <TouchableOpacity
                onPress={handleCompletePost}
                disabled={isSavingDraft || isCompleting}
                className={`flex-row items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3.5 ${
                  isCompleting ? "opacity-60" : "opacity-100"
                }`}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="white" />
                )}
                <Text className="text-sm font-bold text-white">
                  {reportStatus === "Ready_To_Verify" ? "Save & Review" : "Complete Post-Report"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleOpenCompleteModal}
                disabled={isSavingDraft || isSubmitting}
                className={`flex-row items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3.5 ${
                  isSubmitting ? "opacity-60" : "opacity-100"
                }`}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="white" />
                <Text className="text-sm font-bold text-white">
                  {reportStatus === "Ready_To_Verify" ? "Save & Review" : "Complete & Review"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting || isCheckingSignatories || isCompleting}
              className={`flex-row items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white py-3 ${
                isSavingDraft ? "opacity-60" : "opacity-100"
              }`}
            >
              {isSavingDraft ? (
                <ActivityIndicator color="#475569" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#475569" />
                  <Text className="text-sm font-semibold text-[#475569]">Save Draft</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

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

      <ConfirmActionModal
        visible={isSubmitModalVisible}
        loading={isSubmitting}
        title="Complete this report?"
        icon="clipboard-check-outline"
        message="Your report will be saved and shown in a preview, where you can verify it. You can still edit it until you verify."
        confirmLabel="Complete"
        onClose={() => setIsSubmitModalVisible(false)}
        onConfirm={handleConfirmComplete}
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

      <IncompleteSignatoriesModal
        visible={isSignatoriesVisible}
        missingPositions={missingSignatories}
        onClose={() => setIsSignatoriesVisible(false)}
      />

      <DraftSavedModal visible={isDraftSavedVisible} onClose={handleDraftSavedClose} />

      <AddOtherWasteModal
        visible={isAddWasteVisible}
        onClose={() => setIsAddWasteVisible(false)}
        wasteTypes={wasteTypes}
        excludeIds={form.customWaste.map((c) => c.wasteTypeId)}
        onPick={addCustomWaste}
        onCreated={addCustomWaste}
      />

      <CompletePostModal
        visible={completeOpen}
        loading={isCompleting}
        wasteKg={wasteTotalKg}
        photoCount={form.beforePhotos.length + form.afterPhotos.length + form.evidencePhotos.length}
        onClose={() => setCompleteOpen(false)}
        onConfirm={confirmCompletePost}
      />
    </SafeAreaView>
  );
}