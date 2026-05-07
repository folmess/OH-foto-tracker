import type { GeocodeResult } from "@/types";

export async function geocodeAddress(fullAddress: string, accessToken?: string) {
  const response = await fetch(`/api/geocode?address=${encodeURIComponent(fullAddress)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  });
  const payload = (await response.json()) as { results?: GeocodeResult[]; error?: string; status?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo geocodificar la direccion.");
  return payload;
}
