"use client";

import { SlidersHorizontal, UserCircle, Search } from "lucide-react";

export function FloatingSearchBar({
  value,
  onChange,
  onOpenFilters,
  onProfilePress,
  profileName
}: {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters: () => void;
  onProfilePress: () => void;
  profileName: string;
}) {
  return (
    <div className="pointer-events-auto rounded-[28px] bg-white px-3 py-2 shadow-panel ring-1 ring-black/5">
      <div className="flex min-h-12 items-center gap-2">
        <Search size={21} className="shrink-0 text-ink/65" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:text-ink/45"
          placeholder="Buscar lugar o direccion"
          aria-label="Buscar lugares"
        />
        <button onClick={onOpenFilters} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mist text-ink" aria-label="Abrir filtros avanzados">
          <SlidersHorizontal size={20} />
        </button>
        <button onClick={onProfilePress} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white" aria-label={`Salir de ${profileName}`} title={profileName}>
          <UserCircle size={21} />
        </button>
      </div>
    </div>
  );
}
