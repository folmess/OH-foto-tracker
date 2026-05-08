"use client";

import { useState } from "react";
import type { HTMLAttributes } from "react";
import { MapPin } from "lucide-react";
import type { LocationPoint, Place, Profile } from "@/types";
import { calculateDistance, formatDistance, isPlaceFullyCompleted } from "@/lib/place-utils";
import { supabase } from "@/lib/supabase";
import { CoverageChips } from "./badges";

export function NearbySuggestions({
  places,
  profileById,
  userLocation,
  onSelect,
  className = ""
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  userLocation?: LocationPoint | null;
  onSelect: (place: Place) => void;
  className?: HTMLAttributes<HTMLElement>["className"];
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!userLocation) return null;

  const nearby = places
    .filter((place) => !isPlaceFullyCompleted(place) && place.status !== "skipped")
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

  if (collapsed) {
    return (
      <div className={`rounded-lg border border-black/10 bg-white p-3 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setCollapsed(false)} className="min-w-0 text-left" aria-label="Mostrar sugerencias cercanas">
            <p className="truncate text-sm font-extrabold text-ink">{nearby.length} sugerencias cercanas</p>
            <p className="mt-0.5 text-xs font-semibold text-ink/55">Toca para desplegar</p>
          </button>
          <button onClick={() => setCollapsed(false)} className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink">
            Mostrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className={`rounded-lg border border-black/10 bg-white p-3 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-ink">Sugerencias cercanas</p>
          <p className="mt-0.5 text-xs font-semibold text-ink/55">{nearby.length} pendientes a menos de 500 m</p>
        </div>
        <button onClick={() => setCollapsed(true)} className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink">
          Contraer
        </button>
      </div>
      {closest && (
        <div className="mb-3 rounded-xl bg-river p-4 text-white animate-slide-up shadow-md">
          <div className="flex items-start gap-3">
            <MapPin size={24} className="shrink-0 mt-0.5 text-white/80" />
            <div>
              <p className="text-sm font-bold leading-tight">Estás cerca de {closest.place.place_number ? `${closest.place.place_number} - ` : ""}{closest.place.name}.</p>
              <p className="mt-1 text-xs font-semibold text-white/80">Está a {formatDistance(closest.distance)}. ¿Querés marcarlo ahora?</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setStatus(closest.place, "in_progress")} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-river transition active:scale-95">En progreso</button>
            <button onClick={() => setStatus(closest.place, "completed")} className="rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white transition active:scale-95">Fotografiado</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {nearby.map(({ place, distance }) => (
          <button key={place.id} onClick={() => onSelect(place)} className="block w-full rounded-md bg-field p-2 text-left text-sm">
            <span className="font-semibold">{place.place_number ? `${place.place_number} - ` : ""}{place.name}</span>
            <span className="ml-2 text-river">{formatDistance(distance)}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              <CoverageChips place={place} profileById={profileById} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
