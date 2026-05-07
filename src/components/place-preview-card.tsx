"use client";

import { X } from "lucide-react";
import type { Place } from "@/types";
import { getPlaceStatusLabel } from "@/lib/labels";
import { isOpenNow } from "@/lib/place-utils";
import { StatusBadge } from "./badges";

export function PlacePreviewCard({
  place,
  onClose,
  onDetails
}: {
  place: Place | null;
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
      <button onClick={() => onDetails(place)} className="mt-3 w-full rounded-md bg-ink px-4 py-3 text-sm font-bold text-white">
        Detalles
      </button>
    </div>
  );
}
