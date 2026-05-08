"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { LocationPoint, Place, Profile } from "@/types";
import { getMarkerStyle } from "@/lib/place-utils";

function isValidPoint(point?: LocationPoint | null): point is LocationPoint {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function markerIcon(color: string, borderColor: string, label?: string | null, selected = false, isHigh = false) {
  const size = selected ? 42 : 34;
  const extraClass = selected ? " place-marker-selected" : isHigh ? " place-marker-high" : "";
  return L.divIcon({
    className: "",
    html: `<div class="place-marker${extraClass}" style="width:${size}px;height:${size}px;background:${color};border-color:${borderColor}">${label ?? ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="user-marker" style="width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:999px;box-shadow:0 2px 8px rgba(66,133,244,0.45)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function RecenterMap({ center, focusBottomInset = 0 }: { center?: LocationPoint | null; focusBottomInset?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidPoint(center)) return;
    const target = center;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      const size = map.getSize();
      if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0 || size.y <= 0) return;
      map.invalidateSize({ animate: false });
      const currentZoom = map.getZoom();
      const zoom = Number.isFinite(currentZoom) ? Math.max(currentZoom, 16) : 16;
      
      const targetPoint = map.project([target.lat, target.lng], zoom);
      const offset = Math.max(0, Math.min(focusBottomInset * 0.58, size.y * 0.46));
      targetPoint.y += offset;
      const finalCenter = map.unproject(targetPoint, zoom);
      
      map.setView(finalCenter, zoom, { animate: true, duration: 0.45 });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [center, focusBottomInset, map]);
  return null;
}

function KeepMapSized() {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize({ animate: false });
    const timeout = window.setTimeout(refresh, 120);
    window.addEventListener("resize", refresh);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);
  return null;
}

function UserLocationMarker({ userLocation }: { userLocation?: LocationPoint | null }) {
  if (!isValidPoint(userLocation)) return null;
  return <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()} />;
}

function PlaceMarker({
  place,
  photographer,
  selected,
  onSelect
}: {
  place: Place;
  photographer?: Profile | null;
  selected: boolean;
  onSelect: (place: Place) => void;
}) {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const style = getMarkerStyle(place, photographer);
  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={markerIcon(style.color, style.borderColor, place.place_number, selected, place.priority === "high")}
      zIndexOffset={place.priority === "high" ? 200 : selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(place) }}
    />
  );
}

function FitPlaces({ places, fitBoundsKey, focusBottomInset = 0 }: { places: Place[]; fitBoundsKey: number; focusBottomInset?: number }) {
  const map = useMap();
  const previousKeyRef = useRef(-1);

  useEffect(() => {
    if (previousKeyRef.current === fitBoundsKey) return;
    previousKeyRef.current = fitBoundsKey;

    const validPlaces = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
    if (!validPlaces.length) return;
    const timeout = window.setTimeout(() => {
      const size = map.getSize();
      if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0 || size.y <= 0) return;
      const bounds = L.latLngBounds(validPlaces.map((place) => [place.lat, place.lng] as [number, number]));
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { animate: true, duration: 0.55, paddingTopLeft: [46, 46], paddingBottomRight: [46, 46 + focusBottomInset], maxZoom: 15 });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [fitBoundsKey, focusBottomInset, map, places]);
  return null;
}

function hasValidLocation(place: Place) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

function selectedCenter(place?: Place | null, userLocation?: LocationPoint | null) {
  if (place && hasValidLocation(place)) return { lat: place.lat, lng: place.lng };
  if (isValidPoint(userLocation)) return userLocation;
  return null;
}

function initialMapCenter(places: Place[]): [number, number] {
  const first = places.find(hasValidLocation);
  return first ? [first.lat, first.lng] : [-32.9442, -60.6505];
}

export function MapView({
  places,
  profileById,
  selectedPlace,
  userLocation,
  fitBoundsKey = 0,
  focusBottomInset = 0,
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
  const center = selectedCenter(selectedPlace, userLocation);
  const initialCenter = useMemo<[number, number]>(() => initialMapCenter(places), [places]);

  return (
    <MapContainer center={initialCenter} zoom={13} scrollWheelZoom className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <KeepMapSized />
      <RecenterMap center={center} focusBottomInset={focusBottomInset} />
      <FitPlaces places={places} fitBoundsKey={fitBoundsKey} focusBottomInset={focusBottomInset} />
      <UserLocationMarker userLocation={userLocation} />
      {places.filter(hasValidLocation).map((place) => {
        const photographer = place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id) : null;
        return <PlaceMarker key={place.id} place={place} photographer={photographer} selected={selectedPlace?.id === place.id} onSelect={onSelect} />;
      })}
    </MapContainer>
  );
}
