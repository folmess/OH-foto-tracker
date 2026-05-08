import type { Place, Profile } from "@/types";
import { getPhotoSessions, isPlaceFullyCompleted } from "@/lib/place-utils";

export function StatsPanel({ places, profiles }: { places: Place[]; profiles: Profile[] }) {
  const total = places.length;
  const count = (status: string) => places.filter((place) => place.status === status).length;
  const completed = places.filter(isPlaceFullyCompleted).length;
  const sessions = places.flatMap(getPhotoSessions);
  const pendingByPriority = {
    high: places.filter((place) => place.priority === "high" && place.status !== "completed" && place.status !== "skipped").length,
    medium: places.filter((place) => place.priority === "medium" && place.status !== "completed" && place.status !== "skipped").length,
    low: places.filter((place) => place.priority === "low" && place.status !== "completed" && place.status !== "skipped").length
  };
  const byPhotographer = profiles.map((profile) => ({
    profile,
    total: sessions.filter((session) => session.photographer_id === profile.id).length
  }));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["Total", total],
        ["Pendientes", count("pending")],
        ["Asignados", count("assigned")],
        ["En progreso", count("in_progress")],
        ["Completados", completed],
        ["Sesiones", sessions.length],
        ["Problemas abiertos", count("issue")],
        ["Alta pendiente", pendingByPriority.high],
        ["% completado", total ? `${Math.round((completed / total) * 100)}%` : "0%"]
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-ink/60">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
        </div>
      ))}
      <div className="rounded-lg bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-4">
        <p className="font-bold">Pendientes por prioridad</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-coral px-3 py-2 text-sm font-semibold text-white">Alta: {pendingByPriority.high}</span>
          <span className="rounded-full bg-amber px-3 py-2 text-sm font-semibold text-white">Media: {pendingByPriority.medium}</span>
          <span className="rounded-full bg-mist px-3 py-2 text-sm font-semibold text-ink">Baja: {pendingByPriority.low}</span>
        </div>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-4">
        <p className="font-bold">Completados por fotografo</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {byPhotographer.map(({ profile, total }) => (
            <span key={profile.id} className="rounded-full bg-mist px-3 py-2 text-sm font-semibold">
              {profile.full_name}: {total}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
