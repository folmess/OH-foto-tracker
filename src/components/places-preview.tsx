"use client";

import type { LocationPoint, Place, Profile } from "@/types";
import { calculateDistance, formatDistance, todayHours } from "@/lib/place-utils";
import { AssignmentNoticeChip, CoverageChips, PriorityBadge, StatusBadge } from "./badges";

export function PlacesPreview({
  places,
  profileById,
  currentProfile,
  userLocation,
  selectedId,
  onSelect
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  currentProfile?: Profile;
  userLocation?: LocationPoint | null;
  selectedId?: string | null;
  onSelect: (place: Place) => void;
}) {
  const preview = places.slice(0, 2);
  return (
    <div className="space-y-1.5 px-4">
      {preview.map((place) => {
        const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition active:scale-[0.99] ${
              selectedId === place.id ? "border-river ring-2 ring-river/20" : "border-black/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold text-ink">{place.place_number ? `${place.place_number} - ` : ""}{place.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-ink/55">{place.full_address || place.address || "Sin direccion"}</p>
              </div>
              {distance !== null && <span className="shrink-0 text-xs font-extrabold text-river">{formatDistance(distance)}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={place.status} />
              <AssignmentNoticeChip place={place} currentProfileId={currentProfile?.id} />
              <PriorityBadge priority={place.priority} />
              <span className="text-xs font-bold text-ink/55">{todayHours(place)}</span>
              <CoverageChips place={place} profileById={profileById} />
            </div>
          </button>
        );
      })}
      {!preview.length && <p className="rounded-lg bg-field p-4 text-sm font-semibold text-ink/60">No hay lugares para esos filtros.</p>}
    </div>
  );
}
