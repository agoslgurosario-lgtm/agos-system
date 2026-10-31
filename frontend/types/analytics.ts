export interface WasteClassification {
  classification_id: number;
  node_details: {
    node_id: number;
    node_name: string;
    barangay_details: {
      barangay_id: number;
      barangay_name: string;
    } | null;
  };
  dominant_waste_type: string;
  timestamp: string;
  reading: number;
  confidence: number;
  estimated_volume: number;
  recyclable_pct: number;
  biodegradable_pct: number;
  residual_pct: number;
  special_waste_pct: number;
}

export interface WasteVolume {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
}

export interface WasteCompositionItem {
  type: string;
  percent: number;
  color: string;
  icon: string;
}

export type DetectionSeverity = "None" | "Low" | "Moderate" | "High";
export type DetectionStatus = "Detected" | "Clear";

export interface Detection {
  node_id: number;
  node: string;
  location: string;
  severity: DetectionSeverity;
  status: DetectionStatus;
  volume: number | null;
  timestamp: string | null;
}