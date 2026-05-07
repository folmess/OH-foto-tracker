"use client";

import dynamic from "next/dynamic";

export const MapViewDynamic = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-mist text-sm font-semibold text-ink/60">Cargando mapa...</div>
});
