"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { LocationPoint, Place, Profile } from "@/types";
import { getMarkerStyle } from "@/lib/place-utils";

function markerIcon(color: string, borderColor: string, label?: string | null) {
  return L.divIcon({
    className: "",
    html: `<div class="place-marker" style="width:28px;height:28px;background:${color};border-color:${borderColor}">${label ?? ""}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function FlyTo({ center }: { center?: LocationPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [center, map]);
  return null;
}

export function MapView({
  places,
  profileById,
  selectedPlace,
  userLocation,
  onSelect
}: {
  places: Place[];
  profileById: Map<string, Profile>;
  selectedPlace?: Place | null;
  userLocation?: LocationPoint | null;
  onSelect: (place: Place) => void;
}) {
  const center = selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : userLocation;
  const initialCenter = useMemo<[number, number]>(() => {
    const first = places[0];
    return first ? [first.lat, first.lng] : [-32.9442, -60.6505];
  }, [places]);

  return (
    <MapContainer center={initialCenter} zoom={13} scrollWheelZoom className="z-0">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FlyTo center={center} />
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={markerIcon("#17201f", "#ffffff", "YO")} />}
      {places.map((place) => {
        const photographer = place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id) : null;
        const style = getMarkerStyle(place, photographer);
        return (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={markerIcon(style.color, style.borderColor, place.place_number)} eventHandlers={{ click: () => onSelect(place) }} />
        );
      })}
    </MapContainer>
  );
}
