"use client";

import type { LocationPoint, Place, Profile } from "@/types";
import { calculateDistance, closesSoon, formatDistance, isAssignedToProfile, sortPlacesByDistance, todayHours } from "@/lib/place-utils";
import { CoverageChips, PriorityBadge, StatusBadge } from "./badges";

function RouteSection({
  title,
  places,
  userLocation,
  profileById,
  onSelect
}: {
  title: string;
  places: Place[];
  userLocation?: LocationPoint | null;
  profileById: Map<string, Profile>;
  onSelect: (place: Place) => void;
}) {
  return (
    <section className="rounded-lg bg-white p-3 shadow-sm">
      <h3 className="font-bold text-ink">{title}</h3>
      <div className="mt-2 space-y-2">
        {places.slice(0, 8).map((place) => {
          const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
          return (
            <button key={place.id} onClick={() => onSelect(place)} className="w-full rounded-md bg-field p-3 text-left">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</p>
                  <p className="text-xs text-ink/60">{place.full_address || place.address}</p>
                </div>
                {distance !== null && <span className="text-sm font-bold text-river">{formatDistance(distance)}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={place.status} />
                <PriorityBadge priority={place.priority} />
                <CoverageChips place={place} profileById={profileById} />
                <span className="text-xs font-semibold text-ink/60">{todayHours(place)}</span>
                {closesSoon(place) && <span className="rounded-full bg-coral px-2 py-1 text-xs font-bold text-white">Cierra pronto</span>}
              </div>
            </button>
          );
        })}
        {!places.length && <p className="text-sm text-ink/55">Sin lugares en esta seccion.</p>}
      </div>
    </section>
  );
}

export function MyRouteView({
  places,
  profile,
  userLocation,
  profileById,
  onSelect,
  onUseLocation
}: {
  places: Place[];
  profile: Profile;
  userLocation?: LocationPoint | null;
  profileById: Map<string, Profile>;
  onSelect: (place: Place) => void;
  onUseLocation: () => void;
}) {
  const activeStatuses = new Set(["pending", "assigned", "in_progress", "issue"]);
  const assignedToMe = places.filter((place) => isAssignedToProfile(place, profile.id) && place.status !== "completed" && place.status !== "skipped");
  const pending = places.filter((place) => activeStatuses.has(place.status) && place.status !== "completed" && place.status !== "skipped");
  const nearbyPending = userLocation ? sortPlacesByDistance(pending, userLocation).filter((place) => calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) <= 1000) : [];
  const highPriorityNearby = nearbyPending.filter((place) => place.priority === "high");
  const recommended = [...highPriorityNearby, ...nearbyPending.filter((place) => place.priority !== "high")].slice(0, 3);

  return (
    <div className="h-full overflow-y-auto bg-field p-3">
      <div className="mx-auto max-w-3xl space-y-3">
        <section className="rounded-lg bg-ink p-4 text-white">
          <p className="text-sm font-semibold text-white/70">Mi recorrido</p>
          <h2 className="mt-1 text-2xl font-bold">Estoy aca. Que conviene cubrir ahora?</h2>
          {!userLocation && <button onClick={onUseLocation} className="mt-3 rounded-md bg-river px-4 py-3 font-bold text-white">Usar mi ubicacion</button>}
          {userLocation && (
            <p className="mt-3 text-sm font-semibold text-white/80">
              {nearbyPending.length} pendientes cerca · {highPriorityNearby.length} alta prioridad · {assignedToMe.length} asignados a mi
            </p>
          )}
        </section>
        <RouteSection title="Recomendados ahora" places={recommended} userLocation={userLocation} profileById={profileById} onSelect={onSelect} />
        <RouteSection title="Asignados a mi" places={userLocation ? sortPlacesByDistance(assignedToMe, userLocation) : assignedToMe} userLocation={userLocation} profileById={profileById} onSelect={onSelect} />
        <RouteSection title="Pendientes cercanos" places={nearbyPending} userLocation={userLocation} profileById={profileById} onSelect={onSelect} />
        <RouteSection title="Alta prioridad cerca" places={highPriorityNearby} userLocation={userLocation} profileById={profileById} onSelect={onSelect} />
      </div>
    </div>
  );
}
