import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

function normalizeQuery(address: string) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!address) return NextResponse.json({ error: "Falta address." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authHeader = request.headers.get("authorization") ?? undefined;
  const query = normalizeQuery(address);

  const supabase =
    url && anonKey
      ? createClient(url, anonKey, {
          global: { headers: authHeader ? { Authorization: authHeader } : {} },
          auth: { persistSession: false }
        })
      : null;

  if (supabase) {
    const { data: cached } = await supabase.from("geocoding_cache").select("*").eq("query", query).maybeSingle();
    if (cached) {
      return NextResponse.json({
        status: "cached",
        results: [
          {
            full_address: cached.full_address,
            lat: cached.lat,
            lng: cached.lng,
            provider: cached.provider,
            display_name: cached.full_address,
            from_cache: true
          }
        ]
      });
    }
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", address);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("limit", "5");
  nominatimUrl.searchParams.set("countrycodes", "ar");
  nominatimUrl.searchParams.set("addressdetails", "1");

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "OpenHouseFotoTracker/1.0 admin-geocoder",
      Accept: "application/json"
    },
    next: { revalidate: 60 * 60 * 24 * 30 }
  });

  if (!response.ok) return NextResponse.json({ error: "El proveedor de geocoding no respondio." }, { status: 502 });
  const rawResults = (await response.json()) as NominatimResult[];
  if (!rawResults.length) return NextResponse.json({ status: "not_found", results: [] });

  const results = rawResults.map((item) => ({
    full_address: address,
    lat: Number(item.lat),
    lng: Number(item.lon),
    provider: "nominatim",
    display_name: item.display_name,
    from_cache: false
  }));

  if (supabase && results.length === 1) {
    await supabase.from("geocoding_cache").upsert({
      query,
      full_address: address,
      lat: results[0].lat,
      lng: results[0].lng,
      provider: "nominatim",
      raw_response: rawResults
    });
  }

  return NextResponse.json({ status: results.length > 1 ? "multiple" : "found", results });
}
