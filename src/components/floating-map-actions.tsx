"use client";

import { LocateFixed, LogOut, Maximize2, Search, SlidersHorizontal } from "lucide-react";

export function FloatingMapActions({
  onUseLocation,
  onFitPlaces,
  onOpenSearch,
  onOpenFilters,
  onLogout
}: {
  onUseLocation: () => void;
  onFitPlaces: () => void;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <button onClick={onUseLocation} className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-panel ring-1 ring-black/5 active:scale-95" aria-label="Mi ubicacion">
        <LocateFixed size={21} />
      </button>
      <button onClick={onFitPlaces} className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-panel ring-1 ring-black/5 active:scale-95" aria-label="Recentrar todos los lugares">
        <Maximize2 size={20} />
      </button>
      <button onClick={onOpenSearch} className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-panel ring-1 ring-black/5 active:scale-95" aria-label="Buscar lugares">
        <Search size={20} />
      </button>
      <button onClick={onOpenFilters} className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-panel active:scale-95" aria-label="Abrir filtros avanzados">
        <SlidersHorizontal size={20} />
      </button>
      <button onClick={onLogout} className="grid h-11 w-11 place-items-center self-center rounded-full bg-white/95 text-ink/65 shadow-panel ring-1 ring-black/5 active:scale-95" aria-label="Salir">
        <LogOut size={18} />
      </button>
    </div>
  );
}
