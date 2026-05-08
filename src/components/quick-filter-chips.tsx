"use client";

import { SlidersHorizontal } from "lucide-react";
import type { FilterKey } from "@/types";

const quickFilters: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "mine", label: "Asignados a mí" },
  { key: "unassigned", label: "Sin asignar" },
  { key: "high", label: "Alta prioridad" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
  { key: "completed", label: "Completados" },
  { key: "nearby", label: "Cerca de mí" }
];

export function toggleFilterChip(active: Set<FilterKey>, key: FilterKey) {
  const next = new Set(active);
  next.delete("all");
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next.size ? next : new Set<FilterKey>(["all"]);
}

export function QuickFilterChips({
  active,
  photographerFilters = new Set<string>(),
  onChange,
  onOpenAdvanced
}: {
  active: Set<FilterKey>;
  photographerFilters?: Set<string>;
  onChange: (next: Set<FilterKey>) => void;
  onOpenAdvanced?: () => void;
}) {
  const activeCount = Array.from(active).filter((key) => key !== "all").length + photographerFilters.size;

  return (
    <div className="scrollbar-none pointer-events-auto flex gap-1.5 overflow-x-auto px-1 py-1 [scroll-snap-type:x_proximity]">
      {onOpenAdvanced && (
        <button
          onClick={onOpenAdvanced}
          className={`inline-flex min-h-8 shrink-0 scroll-mx-1 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold shadow-sm transition active:scale-[0.98] ${
            activeCount ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"
          }`}
          type="button"
          aria-label="Abrir filtros desde chips"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filtros
          {activeCount > 0 && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{activeCount}</span>}
        </button>
      )}
      {quickFilters.map((filter) => {
        const selected = active.has(filter.key);
        return (
          <button
            key={filter.key}
            onClick={() => onChange(toggleFilterChip(active, filter.key))}
            className={`min-h-8 shrink-0 scroll-ml-4 scroll-mx-1 rounded-full border px-3 text-xs font-bold shadow-sm transition active:scale-[0.98] ${
              selected ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"
            }`}
            aria-pressed={selected}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
