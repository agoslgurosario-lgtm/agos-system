import { WasteIconTile } from "./WasteIcon";

interface Props {
  type: string;
  percent: number;
  color: string;
  icon: string;
}

export default function WasteProgress({ type, percent, color, icon }: Props) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <WasteIconTile icon={icon} size={28} />

      <span className="w-28 shrink-0 text-[13px] font-medium text-slate-700">{type}</span>

      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>

      <span className="w-12 text-right text-[13px] font-semibold text-slate-700">{percent}%</span>
    </div>
  );
}