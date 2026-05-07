"use client";

import type { LocationPoint, Place, Profile } from "@/types";
import { PhotographerBadge, PriorityBadge, StatusBadge } from "./badges";
import { calculateDistance, closesSoon, formatDistance, todayHours } from "@/lib/place-utils";

export function PlaceList({
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
  return (
    <div className="h-full overflow-y-auto bg-field">
      {places.map((place) => {
        const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className={`w-full border-b border-black/10 bg-white p-3 text-left ${selectedId === place.id ? "ring-2 ring-inset ring-river" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</h3>
                <p className="mt-1 text-sm text-ink/65">{place.full_address || place.address || "Sin direccion"}</p>
              </div>
              {distance !== null && <span className="shrink-0 text-sm font-semibold text-river">{formatDistance(distance)}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={place.status} />
              <PriorityBadge priority={place.priority} />
              <PhotographerBadge profile={place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id) : null} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink/60">
              <span>{todayHours(place)}</span>
              {closesSoon(place) && <span className="rounded-full bg-coral px-2 py-0.5 text-white">Cierra pronto</span>}
            </div>
          </button>
        );
      })}
      {!places.length && <p className="p-5 text-sm text-ink/60">No hay lugares para esos filtros.</p>}
    </div>
  );
}
