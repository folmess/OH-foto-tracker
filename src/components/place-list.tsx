"use client";

import { SearchX } from "lucide-react";

import type { LocationPoint, Place, Priority, Profile } from "@/types";
import { PhotographerBadge, PriorityBadge, StatusBadge } from "./badges";
import { calculateDistance, closesSoon, formatDistance, todayHours } from "@/lib/place-utils";

export function PlaceList({
  places,
  profileById,
  currentProfile,
  userLocation,
  selectedId,
  onSelect,
  onChangePriority
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  currentProfile?: Profile;
  userLocation?: LocationPoint | null;
  selectedId?: string | null;
  onSelect: (place: Place) => void;
  onChangePriority?: (place: Place, priority: Priority) => Promise<void>;
}) {
  const canChangePriority = currentProfile?.role === "admin" && !!onChangePriority;
  return (
    <div className="h-full overflow-y-auto bg-field">
      {places.map((place) => {
        const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
        return (
          <div
            key={place.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(place)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(place);
            }}
            className={`w-full border-b border-black/10 bg-white p-3 text-left transition active:bg-mist ${selectedId === place.id ? "bg-river/5 ring-2 ring-inset ring-river" : ""}`}
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
              {canChangePriority ? (
                <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="inline-flex items-center rounded-full bg-mist px-2 py-1">
                  <select
                    value={place.priority}
                    onChange={(event) => void onChangePriority(place, event.target.value as Priority)}
                    className="bg-transparent text-xs font-bold text-ink outline-none"
                    aria-label={`Cambiar prioridad de ${place.name}`}
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </span>
              ) : (
                <PriorityBadge priority={place.priority} />
              )}
              <PhotographerBadge profile={place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id) : null} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink/60">
              <span>{todayHours(place)}</span>
              {closesSoon(place) && <span className="rounded-full bg-coral px-2 py-0.5 text-white">Cierra pronto</span>}
            </div>
          </div>
        );
      })}
      {!places.length && (
        <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-mist text-ink/40">
            <SearchX size={28} />
          </div>
          <p className="mt-4 font-bold text-ink">No hay resultados</p>
          <p className="mt-1 text-sm text-ink/55">Intenta con otros filtros o términos de búsqueda.</p>
        </div>
      )}
    </div>
  );
}
