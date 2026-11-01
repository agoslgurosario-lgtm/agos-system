import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  /** Extra context, shown on hover */
  note?: string;
  icon: ReactNode;
  /** Background class for the icon tile, e.g. "bg-[#E1CDE3]" */
  bg: string;
}

// Same card as the summary cards on the Waste Classification page
export default function StatCard({ label, value, note, icon, bg }: Props) {
  return (
    <div
      title={note}
      className="relative flex h-17 w-full items-center gap-3 rounded-lg border-2 border-[#C6C6C8] bg-[#FAFCFD] p-3 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] min-[2560px]:h-20 min-[3840px]:h-24"
    >
      <div className={`${bg} rounded-lg p-2`}>{icon}</div>
      <div className="flex min-w-0 flex-col">
        <span className="text-xl font-bold leading-tight text-[#122A48]">{value}</span>
        <p className="truncate text-xs text-[#122A48]">{label}</p>
      </div>
    </div>
  );
}