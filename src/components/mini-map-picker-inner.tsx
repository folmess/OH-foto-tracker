"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { MiniMapPickerProps } from "./mini-map-picker";

const icon = L.divIcon({
  className: "",
  html: '<div class="place-marker" style="width:24px;height:24px;background:#147a73;border-color:#ffffff"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function ClickToMove({ onChange }: { onChange: MiniMapPickerProps["onChange"] }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export function MiniMapPickerInner({ value, onChange }: MiniMapPickerProps) {
  return (
    <div className="h-64 overflow-hidden rounded-md border border-black/10">
      <MapContainer center={[value.lat, value.lng]} zoom={17} scrollWheelZoom className="h-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToMove onChange={onChange} />
        <Marker
          position={[value.lat, value.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker = event.target as L.Marker;
              const next = marker.getLatLng();
              onChange({ lat: next.lat, lng: next.lng });
            }
          }}
        />
      </MapContainer>
    </div>
  );
}
