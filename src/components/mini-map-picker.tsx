"use client";

import dynamic from "next/dynamic";
import type { LocationPoint } from "@/types";

export const MiniMapPicker = dynamic(() => import("./mini-map-picker-inner").then((mod) => mod.MiniMapPickerInner), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center rounded-md bg-mist text-sm font-semibold text-ink/60">Cargando mapa...</div>
});

export type MiniMapPickerProps = {
  value: LocationPoint;
  onChange: (value: LocationPoint) => void;
};
