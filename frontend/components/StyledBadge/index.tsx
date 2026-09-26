type Props = {
  text: string
  style: { badge: string; dot: string }
  size?: "sm" | "md"
}

export default function StyledBadge({ text, style, size = "sm" }: Props) {
  const sizing = size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs"
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizing} ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {text}
    </span>
  )
}