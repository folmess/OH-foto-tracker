"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { FilterKey, Profile, SortKey } from "@/types";

type FilterOption = { key: FilterKey; label: string };
type FilterSection = { title: string; options: FilterOption[] };

const filterSections: FilterSection[] = [
  {
    title: "Estado",
    options: [
      { key: "pending", label: "Pendientes" },
      { key: "unassigned", label: "Sin asignar" },
      { key: "assigned", label: "Asignados" },
      { key: "mine", label: "Asignados a mí" },
      { key: "assigned_other", label: "Asignados a otros" },
      { key: "in_progress", label: "En progreso" },
      { key: "completed", label: "Fotografiados" },
      { key: "issue", label: "Problema" },
      { key: "skipped", label: "Descartados" }
    ]
  },
  {
    title: "Día y horario",
    options: [
      { key: "saturday", label: "Sábado" },
      { key: "saturday_morning", label: "Sábado mañana" },
      { key: "saturday_afternoon", label: "Sábado tarde" },
      { key: "sunday", label: "Domingo" },
      { key: "sunday_morning", label: "Domingo mañana" },
      { key: "sunday_afternoon", label: "Domingo tarde" },
      { key: "open_now", label: "Abierto ahora" },
      { key: "closing", label: "Cierran pronto" }
    ]
  },
  {
    title: "Prioridad",
    options: [
      { key: "high", label: "Alta" },
      { key: "medium", label: "Media" },
      { key: "low", label: "Baja" }
    ]
  },
  {
    title: "Cercanía",
    options: [{ key: "nearby", label: "Cerca de mí" }]
  }
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recomendado" },
  { key: "distance", label: "Distancia" },
  { key: "priority", label: "Prioridad" },
  { key: "closing", label: "Cierre" },
  { key: "status", label: "Estado" },
  { key: "place_number", label: "Número" },
  { key: "name", label: "Nombre" }
];

const filterLabels = new Map(filterSections.flatMap((section) => section.options.map((option) => [option.key, option.label] as const)));

function toggleSet<T>(items: Set<T>, item: T) {
  const next = new Set(items);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

function normalizeFilters(filters: Set<FilterKey>) {
  return filters.size ? filters : new Set<FilterKey>(["all"]);
}

function FilterChip({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold transition active:scale-[0.98] ${
        selected ? "border-ink bg-ink text-white" : "border-black/10 bg-field text-ink"
      }`}
      aria-pressed={selected}
      type="button"
    >
      {children}
    </button>
  );
}

export function FiltersBar({
  active,
  onChange,
  sort,
  onSortChange,
  profiles = [],
  photographerFilters = new Set<string>(),
  onPhotographerFiltersChange,
  showHeader = true,
  showSort = true
}: {
  active: Set<FilterKey>;
  onChange: (next: Set<FilterKey>) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  profiles?: Profile[];
  photographerFilters?: Set<string>;
  onPhotographerFiltersChange?: (next: Set<string>) => void;
  showHeader?: boolean;
  showSort?: boolean;
}) {
  const activeFilters = Array.from(active).filter((key) => key !== "all");
  const activePhotographers = profiles.filter((profile) => photographerFilters.has(profile.id));
  const hasActive = activeFilters.length > 0 || photographerFilters.size > 0;

  function toggle(key: FilterKey) {
    if (key === "all") {
      onChange(new Set(["all"]));
      return;
    }
    const next = new Set(active);
    next.delete("all");
    onChange(normalizeFilters(toggleSet(next, key)));
  }

  function clearFilter(key: FilterKey) {
    const next = new Set(active);
    next.delete(key);
    onChange(normalizeFilters(next));
  }

  function togglePhotographer(profileId: string) {
    if (!onPhotographerFiltersChange) return;
    onPhotographerFiltersChange(toggleSet(photographerFilters, profileId));
  }

  function clearAll() {
    onChange(new Set(["all"]));
    onPhotographerFiltersChange?.(new Set());
  }

  return (
    <div className="space-y-3 border-b border-black/10 bg-white px-3 py-3">
      {(showHeader || hasActive) && (
        <div className="flex items-center justify-between gap-3">
          {showHeader && (
            <div>
              <p className="text-sm font-extrabold text-ink">Filtros</p>
              <p className="text-[11px] font-semibold text-ink/55">Combina estado, horarios, fotógrafos y prioridad</p>
            </div>
          )}
          {hasActive && (
            <button onClick={clearAll} className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-extrabold text-ink" type="button">
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {hasActive && (
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
          {activeFilters.map((key) => (
            <button
              key={key}
              onClick={() => clearFilter(key)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-river/10 px-2.5 py-1 text-xs font-extrabold text-river"
              type="button"
            >
              {filterLabels.get(key) ?? key}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          {activePhotographers.map((profile) => (
            <button
              key={profile.id}
              onClick={() => togglePhotographer(profile.id)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-river/10 px-2.5 py-1 text-xs font-extrabold text-river"
              type="button"
            >
              {profile.full_name}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filterSections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">{section.title}</p>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
              {section.options.map((filter) => (
                <FilterChip key={filter.key} selected={active.has(filter.key)} onClick={() => toggle(filter.key)}>
                  {filter.label}
                </FilterChip>
              ))}
            </div>
          </section>
        ))}

        {!!profiles.length && onPhotographerFiltersChange && (
          <section className="space-y-1.5">
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">Fotógrafos</p>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
              {profiles.map((profile) => (
                <FilterChip key={profile.id} selected={photographerFilters.has(profile.id)} onClick={() => togglePhotographer(profile.id)}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: profile.color }} aria-hidden="true" />
                    {profile.full_name}
                  </span>
                </FilterChip>
              ))}
            </div>
          </section>
        )}
      </div>

      {showSort && (
        <section className="space-y-1.5">
          <p className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">Orden</p>
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
            {sortOptions.map((option) => (
              <FilterChip key={option.key} selected={sort === option.key} onClick={() => onSortChange(option.key)}>
                {option.label}
              </FilterChip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
