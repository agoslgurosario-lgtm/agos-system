export const DIALOG_COLOR = {
  primary: '#122A48',
  gray: '#727272',
  lightgray: '#72727247',

  green: '#347D43',
  red: '#CC251F',
  lightgreen: '#58D07159',
  lightred: '#FDD1D2',
  yellow: '#D27000',
  lightyellow: '#EE9E4342',
  blue: '#1565BC',
  lightblue: '#1565BC29',
  lightorange: '#FFF3E0',
  orange: '#E65100',
}

// waste style
export const WASTE_STYLE: Record<string, { border: string; icon: string; shadow: string }> = {
  Recyclable: {
    border: "border-[#B9D9F5]",
    icon: "bg-[#E1EEFB] text-[#1565BC]",
    
    shadow: "shadow-[0_0_3px_rgba(21,101,188,0.35)]",
    
  },
  Biodegradable: {
    border: "border-[#B7E8C6]",
    icon: "bg-[#DFF7E6] text-[#2C7B3C]",
    shadow: "shadow-[0_0_3px_rgba(44,123,60,0.35)]",
  },
  Residual: {
    border: "border-[#F0D6B0]",
    icon: "bg-[#FBEBD6] text-[#B9770E]",
    shadow: "shadow-[0_0_3px_rgba(185,119,14,0.35)]",
  },
  'Special Waste': {
    border: "border-[#F3B9B9]",
    icon: "bg-[#FBDEDE] text-[#D81010]",
    shadow: "shadow-[0_0_3px_rgba(216,16,16,0.35)]",
  },
  None: {
    border: "border-[#C6C6C8]",
    icon: "bg-[#E5E5E6] text-[#727272]",
    shadow: "shadow-[0_0_3px_rgba(114,114,114,0.25)]",
  },
}

// alert styles
export const ALERT_STYLE: Record<string, { border: string; icon: string; shadow: string }> = {
  // Water — blue
  Water_Level_Rising: {
    border: "border-[#A0C8FF]",
    icon: "bg-[#D6E8FF] text-[#1565BC]",
    shadow: "shadow-[0_0_3px_rgba(21,101,188,0.45)]"
  },
  // Clog severity - yellow - orange - red
  Low_Clog_Alert: {
    border: "border-[#F4E4A7]",
    icon: "bg-[#FFF9DC] text-[#D2A000]",
    shadow: "shadow-[0_0_3px_rgba(210,160,0,0.45)]"
  },
  Moderate_Clog_Alert: {
    border: "border-[#FFD6A0]",
    icon: "bg-[#FFF0D6] text-[#E65100]",
    shadow: "shadow-[0_0_3px_rgba(230,81,0,0.45)]"
  },
  Critical_Clog: {
    border: "border-[#FFD6D6]",
    icon: "bg-[#FFE5E5] text-[#D81010]",
    shadow: "shadow-[0_0_3px_rgba(216,16,16,0.45)]"
  },
  // Device / node health — purple
  Node_Offline: {
    border: "border-[#DACDE3]",
    icon: "bg-[#DACDE3] text-[#582579]",
    shadow: "shadow-[0_0_3px_rgba(88,37,121,0.45)]"
  },
  Low_Battery: {
    border: "border-[#DACDE3]",
    icon: "bg-[#DACDE3] text-[#582579]",
    shadow: "shadow-[0_0_3px_rgba(88,37,121,0.45)]"
  },
  Weak_Signal: {
    border: "border-[#DACDE3]",
    icon: "bg-[#DACDE3] text-[#582579]",
    shadow: "shadow-[0_0_3px_rgba(88,37,121,0.45)]"
  },
  Sensor_Failure: {
    border: "border-[#DACDE3]",
    icon: "bg-[#DACDE3] text-[#582579]",
    shadow: "shadow-[0_0_3px_rgba(88,37,121,0.45)]"
  },
  Report_Submitted: {
    border: "border-[#A7E3C4]",
    icon: "bg-[#D6F5E3] text-[#1E8A5F]",
    shadow: "shadow-[0_0_3px_rgba(30,138,95,0.45)]"
  },
  default: {
    border: "border-[#C6C6C8]",
    icon: "bg-[#E5E5E6] text-[#727272]",
    shadow: "shadow-[0_0_3px_rgba(114,114,114,0.25)]"
  },
}

export function getConditionClass(condition: string) {
  switch (condition) {
    case "Critical": return "text-[#D81010]"
    case "Warning":  return "text-[#FF9705]"
    case "Normal":   return "text-[#1565BC]"
    default:         return "text-[#727272]"
  }
}

export function getClogClass(clog: number | null) {
  if (clog == null) return "text-[#727272]"
  if (clog >= 75)   return "text-[#D81010] font-semibold"
  if (clog >= 50)   return "text-[#FF9705] font-semibold"
  return "text-[#1565BC]"
}

export function getStatusClass(status: string) {
  switch (status) {
    case "Active":      return "text-[#2C7B3C] bg-[#58D07159]"
    case "Inactive":    return "text-[#727272] bg-[#D9D9D9]"
    case "Maintenance": return "text-[#582579] bg-[#DACDE3]"
    default:            return "text-[#2C7B3C] bg-[#58D07159]"
  }
}

export function getDotClass(status: string) {
  switch (status) {
    case "Active":      return "bg-[#2C7B3C]"
    case "Inactive":    return "bg-[#727272]"
    case "Maintenance": return "bg-[#582579]"
    default:            return "bg-[#2C7B3C]"
  }
}