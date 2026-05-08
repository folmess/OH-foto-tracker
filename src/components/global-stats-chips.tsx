import type { Place } from "@/types";
import { getActiveAssignments, getPhotoSessions, isPlaceFullyCompleted } from "@/lib/place-utils";

export function GlobalStatsChips({ places }: { places: Place[] }) {
  const total = places.length;
  const assigned = places.filter((place) => getActiveAssignments(place).length > 0 && place.status !== "skipped").length;
  const completed = places.filter(isPlaceFullyCompleted).length;
  const sessions = places.reduce((sum, place) => sum + getPhotoSessions(place).length, 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-black/10 bg-white px-3 py-2">
      <span className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink">Total {total}</span>
      <span className="shrink-0 rounded-full bg-river/10 px-3 py-1.5 text-xs font-bold text-river">Asignados {assigned}</span>
      <span className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink">Sesiones {sessions}</span>
      <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">{percent}% completado</span>
    </div>
  );
}
