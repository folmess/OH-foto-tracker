"use client";

import type { FilterKey } from "@/types";

const quickFilters: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "high", label: "Alta prioridad" },
  { key: "mine", label: "Asignados a mi" },
  { key: "saturday", label: "Abierto sabado" },
  { key: "sunday", label: "Abierto domingo" },
  { key: "nearby", label: "Cerca de mi" },
  { key: "completed", label: "Completados" },
  { key: "issue", label: "Problema" }
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
  onChange
}: {
  active: Set<FilterKey>;
  onChange: (next: Set<FilterKey>) => void;
}) {
  return (
    <div className="scrollbar-none pointer-events-auto flex gap-2 overflow-x-auto px-1 py-1 [scroll-snap-type:x_proximity]">
      {quickFilters.map((filter) => {
        const selected = active.has(filter.key);
        return (
          <button
            key={filter.key}
            onClick={() => onChange(toggleFilterChip(active, filter.key))}
            className={`min-h-10 shrink-0 scroll-ml-4 scroll-mx-1 rounded-full border px-4 text-sm font-bold shadow-sm transition active:scale-[0.98] ${
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
