"use client";

import type { LocationPoint, Place, Profile } from "@/types";
import { calculateDistance, formatDistance, todayHours } from "@/lib/place-utils";
import { PriorityBadge, StatusBadge } from "./badges";

export function PlacesPreview({
  places,
  profileById,
  userLocation,
  selectedId,
  onSelect
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  userLocation?: LocationPoint | null;
  selectedId?: string | null;
  onSelect: (place: Place) => void;
}) {
  const preview = places.slice(0, 2);
  return (
    <div className="space-y-2 px-4">
      {preview.map((place) => {
        const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
        const photographer = place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id)?.full_name : null;
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm transition active:scale-[0.99] ${
              selectedId === place.id ? "border-river ring-2 ring-river/20" : "border-black/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold text-ink">{place.place_number ? `${place.place_number} - ` : ""}{place.name}</h3>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink/55">{place.full_address || place.address || "Sin direccion"}</p>
              </div>
              {distance !== null && <span className="shrink-0 text-sm font-extrabold text-river">{formatDistance(distance)}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={place.status} />
              <PriorityBadge priority={place.priority} />
              <span className="text-xs font-bold text-ink/55">{todayHours(place)}</span>
              {photographer && <span className="text-xs font-bold text-ink/55">{photographer}</span>}
            </div>
          </button>
        );
      })}
      {!preview.length && <p className="rounded-lg bg-field p-4 text-sm font-semibold text-ink/60">No hay lugares para esos filtros.</p>}
    </div>
  );
}
