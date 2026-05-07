"use client";

import { useMemo, useState } from "react";
import type { City, GeocodeResult } from "@/types";
import { geocodeAddress } from "@/lib/geocoding";
import { supabase } from "@/lib/supabase";

export function AddressGeocoder({
  streetAddress,
  city,
  lat,
  lng,
  onAddressChange,
  onCityChange,
  onCoordinatesChange
}: {
  streetAddress: string;
  city: City;
  lat?: number | null;
  lng?: number | null;
  onAddressChange: (value: string) => void;
  onCityChange: (value: City) => void;
  onCoordinatesChange: (lat: number, lng: number, fullAddress: string) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const fullAddress = useMemo(() => `${streetAddress.trim()}, ${city}, Santa Fe, Argentina`, [streetAddress, city]);

  async function search() {
    setResults([]);
    if (!streetAddress.trim() || !city) {
      setStatus("Completa direccion y ciudad.");
      return;
    }
    if ((lat || lng) && !window.confirm("Ya hay coordenadas cargadas. Queres reemplazarlas con el resultado de geocoding?")) return;
    setStatus("Buscando coordenadas...");
    try {
      const { data } = await supabase.auth.getSession();
      const payload = await geocodeAddress(fullAddress, data.session?.access_token);
      if (!payload.results?.length) {
        setStatus("No se encontro la direccion.");
        return;
      }
      if (payload.results.length > 1) {
        setResults(payload.results);
        setStatus("Hubo mas de un resultado posible.");
        return;
      }
      choose(payload.results[0]);
      setStatus(payload.results[0].from_cache ? "Coordenadas encontradas en cache." : "Coordenadas encontradas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo buscar coordenadas.");
    }
  }

  function choose(result: GeocodeResult) {
    onCoordinatesChange(result.lat, result.lng, fullAddress);
    setResults([]);
  }

  return (
    <div className="space-y-2 rounded-md border border-black/10 bg-field p-3 md:col-span-6">
      <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
        <input placeholder="Balcarce 17" className="rounded-md border p-2" value={streetAddress} onChange={(event) => onAddressChange(event.target.value)} required />
        <select className="rounded-md border p-2" value={city} onChange={(event) => onCityChange(event.target.value as City)}>
          <option value="Rosario">Rosario</option>
          <option value="Funes">Funes</option>
        </select>
        <button type="button" onClick={search} className="rounded-md bg-river px-4 py-2 font-semibold text-white">
          Buscar coordenadas
        </button>
      </div>
      <p className="text-xs font-semibold text-ink/60">{fullAddress}</p>
      {status && <p className="rounded-md bg-white p-2 text-sm font-semibold text-ink">{status}</p>}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <button key={`${result.lat}:${result.lng}`} type="button" onClick={() => choose(result)} className="block w-full rounded-md bg-white p-2 text-left text-sm ring-1 ring-black/10">
              <strong>{result.display_name}</strong>
              <span className="block text-xs text-ink/60">{result.lat.toFixed(6)}, {result.lng.toFixed(6)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
