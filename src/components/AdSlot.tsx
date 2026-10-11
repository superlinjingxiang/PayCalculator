type AdSlotProps = { enabled?: boolean };

export default function AdSlot({ enabled = false }: AdSlotProps) {
  if (!enabled || process.env.NODE_ENV !== "development") return null;
  return <aside aria-label="广告占位" className="ad-slot">广告占位 · 当前未接入投放</aside>;
}
