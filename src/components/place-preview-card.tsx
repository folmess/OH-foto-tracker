"use client";

import { X } from "lucide-react";
import type { Place, Priority } from "@/types";
import { getPlaceStatusLabel } from "@/lib/labels";
import { isOpenNow } from "@/lib/place-utils";
import { StatusBadge } from "./badges";

export function PlacePreviewCard({
  place,
  canChangePriority = false,
  onChangePriority,
  onClose,
  onDetails
}: {
  place: Place | null;
  canChangePriority?: boolean;
  onChangePriority?: (place: Place, priority: Priority) => Promise<void>;
  onClose: () => void;
  onDetails: (place: Place) => void;
}) {
  if (!place) return null;
  const open = isOpenNow(place);

  return (
    <div className="absolute left-3 right-3 top-3 z-[820] rounded-lg bg-white p-3 shadow-panel md:left-auto md:right-[450px] md:w-96">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-ink">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</p>
            <StatusBadge status={place.status} />
          </div>
          <p className="mt-1 text-sm text-ink/65">{getPlaceStatusLabel(place.status)}</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-mist p-2" aria-label="Cerrar seleccion">
          <X size={16} />
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/65">{place.full_address || place.address || "Sin direccion"}</p>
      <p className={`mt-1 text-xs font-bold ${open ? "text-river" : "text-coral"}`}>{open ? "Abierto ahora" : "No figura abierto ahora"}</p>
      {canChangePriority && onChangePriority && (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-field px-3 py-2 text-sm font-bold text-ink">
          Prioridad
          <select
            value={place.priority}
            onChange={(event) => void onChangePriority(place, event.target.value as Priority)}
            className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm font-bold"
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
      )}
      <button onClick={() => onDetails(place)} className="mt-3 w-full rounded-md bg-ink px-4 py-3 text-sm font-bold text-white">
        Detalles
      </button>
    </div>
  );
}
