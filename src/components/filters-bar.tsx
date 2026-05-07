"use client";

import type { FilterKey, SortKey } from "@/types";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "unassigned", label: "Sin asignar" },
  { key: "assigned", label: "Asignados" },
  { key: "mine", label: "A mi" },
  { key: "in_progress", label: "En progreso" },
  { key: "completed", label: "Fotografiados" },
  { key: "issue", label: "Problema" },
  { key: "high", label: "Alta" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
  { key: "saturday_morning", label: "Sab manana" },
  { key: "saturday_afternoon", label: "Sab tarde" },
  { key: "sunday_morning", label: "Dom manana" },
  { key: "sunday_afternoon", label: "Dom tarde" },
  { key: "open_now", label: "Abierto ahora" },
  { key: "nearby", label: "Cercanos" },
  { key: "closing", label: "Cierran pronto" }
];

export function FiltersBar({
  active,
  onChange,
  sort,
  onSortChange,
  showSort = true
}: {
  active: Set<FilterKey>;
  onChange: (next: Set<FilterKey>) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  showSort?: boolean;
}) {
  function toggle(key: FilterKey) {
    if (key === "all") {
      onChange(new Set(["all"]));
      return;
    }
    const next = new Set(active);
    next.delete("all");
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next.size ? next : new Set(["all"]));
  }

  return (
    <div className="space-y-2 border-b border-black/10 bg-white px-3 py-2">
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {filters.map((filter) => {
          const selected = active.has(filter.key);
          return (
            <button
              key={filter.key}
              onClick={() => toggle(filter.key)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${selected ? "bg-ink text-white" : "bg-mist text-ink"}`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      {showSort && (
        <select value={sort} onChange={(event) => onSortChange(event.target.value as SortKey)} className="w-full rounded-md border border-black/10 bg-field px-3 py-2 text-sm font-semibold md:max-w-xs">
          <option value="recommended">Ordenar por recomendado</option>
          <option value="distance">Ordenar por distancia</option>
          <option value="priority">Ordenar por prioridad</option>
          <option value="closing">Ordenar por cierre</option>
          <option value="status">Ordenar por estado</option>
          <option value="place_number">Ordenar por numero</option>
          <option value="name">Ordenar por nombre</option>
        </select>
      )}
    </div>
  );
}
