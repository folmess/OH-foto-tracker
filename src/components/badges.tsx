import type { PlaceStatus, Priority, Profile } from "@/types";
import { getPlaceStatusLabel, getPriorityLabel, statusColors } from "@/lib/labels";

export function StatusBadge({ status }: { status: PlaceStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: statusColors[status] }}
    >
      {getPlaceStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const className =
    priority === "high"
      ? "bg-coral text-white"
      : priority === "medium"
        ? "bg-amber text-white"
        : "bg-mist text-ink";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{getPriorityLabel(priority)}</span>;
}

export function PhotographerBadge({ profile }: { profile?: Profile | null }) {
  if (!profile) return <span className="text-xs text-ink/55">Sin asignar</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: profile.color }} />
      {profile.full_name}
    </span>
  );
}
