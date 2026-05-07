"use client";

import type { LocationPoint, Place } from "@/types";
import { calculateDistance, formatDistance } from "@/lib/place-utils";
import { supabase } from "@/lib/supabase";

export function NearbySuggestions({
  places,
  userLocation,
  onSelect
}: {
  places: Place[];
  userLocation?: LocationPoint | null;
  onSelect: (place: Place) => void;
}) {
  if (!userLocation) return null;
  const nearby = places
    .filter((place) => place.status !== "completed" && place.status !== "skipped")
    .map((place) => ({ place, distance: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) }))
    .filter((item) => item.distance <= 500)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  const closest = nearby.find((item) => item.distance <= 100);
  if (!nearby.length) return null;

  async function setStatus(place: Place, status: "in_progress" | "completed") {
    await supabase.rpc("set_place_status", {
      target_place_id: place.id,
      status_value: status,
      note_text: null,
      latitude_value: userLocation?.lat ?? null,
      longitude_value: userLocation?.lng ?? null
    });
  }

  return (
    <div className="absolute left-3 right-3 top-24 z-[800] rounded-lg bg-white p-3 shadow-panel md:left-auto md:right-[450px] md:w-80">
      {closest && (
        <div className="mb-3 rounded-md bg-river p-3 text-white">
          <p className="text-sm font-bold">Estas cerca de {closest.place.place_number ? `${closest.place.place_number} · ` : ""}{closest.place.name}.</p>
          <p className="mt-1 text-xs font-semibold text-white/80">Esta a {formatDistance(closest.distance)}. Queres marcarlo ahora?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => setStatus(closest.place, "in_progress")} className="rounded-md bg-white px-3 py-2 text-sm font-bold text-river">En progreso</button>
            <button onClick={() => setStatus(closest.place, "completed")} className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">Fotografiado</button>
          </div>
        </div>
      )}
      <p className="text-sm font-bold">Tenes {nearby.length} lugares pendientes a menos de 500 m.</p>
      <div className="mt-2 space-y-2">
        {nearby.map(({ place, distance }) => (
          <button key={place.id} onClick={() => onSelect(place)} className="block w-full rounded-md bg-field p-2 text-left text-sm">
            <span className="font-semibold">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</span>
            <span className="ml-2 text-river">{formatDistance(distance)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
