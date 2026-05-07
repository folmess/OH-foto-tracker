import type { Place } from "@/types";

export function GlobalStatsChips({ places }: { places: Place[] }) {
  const total = places.length;
  const assigned = places.filter((place) => place.assigned_photographer_id && place.status !== "completed" && place.status !== "skipped").length;
  const completed = places.filter((place) => place.status === "completed").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-black/10 bg-white px-3 py-2">
      <span className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink">Total {total}</span>
      <span className="shrink-0 rounded-full bg-river/10 px-3 py-1.5 text-xs font-bold text-river">Asignados {assigned}</span>
      <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">{percent}% completado</span>
    </div>
  );
}
