import { formatWeightIn, type WeightUnit } from "@/lib/formatWeight";
import type { TopBarangay } from "@/lib/analytics";
import { WasteIconTile } from "./WasteIcon";

interface Props {
  rows: TopBarangay[];
  unit: WeightUnit;
}

export default function TopBarangays({ rows, unit }: Props) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-[12px] text-slate-400">No barangay data yet.</p>;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
          <th className="w-8 py-1.5 font-semibold">#</th>
          <th className="py-1.5 font-semibold">Barangay</th>
          <th className="py-1.5 font-semibold">Total Waste</th>
          <th className="py-1.5 font-semibold">Most Common Type</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name} className="border-b border-slate-100 text-[13px] text-slate-700 last:border-b-0">
            <td className="py-2 text-slate-500">{i + 1}</td>
            <td className="py-2 font-medium">{r.name}</td>
            <td className="py-2">{formatWeightIn(r.total, unit)}</td>
            <td className="py-2">
              <span className="flex items-center gap-2">
                <WasteIconTile icon={r.icon} size={22} />
                {r.topType}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}