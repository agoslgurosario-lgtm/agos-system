import { weightParts, type WeightUnit } from "@/lib/formatWeight";
import WasteIcon from "./WasteIcon";

interface Props {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  unit: WeightUnit;
}

export default function WasteVolumeCard({ title, value, subtitle, icon, unit }: Props) {
  const weight = weightParts(value, unit);

  return (
    <div className="flex-1 rounded-2xl bg-white p-4 shadow-md">
      <div className="flex items-center gap-2">
        <WasteIcon icon={icon} size={18} />
        <span className="text-[12px] text-slate-700">{title}</span>
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-800">
        ~ {weight.value} {weight.unit === "kg" ? "Kg" : "g"}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
    </div>
  );
}
