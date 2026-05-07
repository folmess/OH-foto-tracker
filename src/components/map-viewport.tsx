"use client";

import type { LocationPoint, Place, Profile } from "@/types";
import { MapViewDynamic } from "./map-view-dynamic";

export function MapViewport({
  places,
  profileById,
  selectedPlace,
  userLocation,
  fitBoundsKey,
  focusBottomInset,
  onSelect
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  selectedPlace?: Place | null;
  userLocation?: LocationPoint | null;
  fitBoundsKey?: number;
  focusBottomInset?: number;
  onSelect: (place: Place) => void;
}) {
  return (
    <div className="absolute inset-0 z-0">
      <MapViewDynamic places={places} profileById={profileById} selectedPlace={selectedPlace} userLocation={userLocation} fitBoundsKey={fitBoundsKey} focusBottomInset={focusBottomInset} onSelect={onSelect} />
    </div>
  );
}
