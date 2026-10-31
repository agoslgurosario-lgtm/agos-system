import { Leaf, Recycle, Trash2, Package } from "lucide-react";

const ICONS: Record<string, { Icon: typeof Leaf; color: string }> = {
  leaf: { Icon: Leaf, color: "#22A55B" },
  recycle: { Icon: Recycle, color: "#3B82F6" },
  trash: { Icon: Trash2, color: "#6B7280" },
  package: { Icon: Package, color: "#F59E0B" },
};

export default function WasteIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const { Icon, color } = ICONS[icon] ?? ICONS.package;
  return <Icon size={size} color={color} />;
}

/** Icon inside a soft tinted circle, as in the design mockup. */
export function WasteIconTile({ icon, size = 36 }: { icon: string; size?: number }) {
  const { color } = ICONS[icon] ?? ICONS.package;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: `${color}1F` }}
    >
      <WasteIcon icon={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}
