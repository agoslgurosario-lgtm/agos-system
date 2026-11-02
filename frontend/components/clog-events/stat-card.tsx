import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor: string; // hex
  bg: string; // tailwind class, e.g. "bg-[#B2FBC1]"
}

export function StatCard({ label, value, icon: Icon, iconColor, bg }: StatCardProps) {
  return (
    <div className="rounded-lg border-2 border-[#C6C6C8] h-17 w-full flex items-center p-6 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
      <div className={`${bg} rounded-lg p-2`}>
        <Icon size={17} color={iconColor} />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold leading-tight">{value}</span>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}