"use client";

import { BarChart3, Footprints, List, Map, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MobileTab } from "@/types";

const baseItems: { key: MobileTab; label: string; icon: LucideIcon }[] = [
  { key: "map", label: "Mapa", icon: Map },
  { key: "list", label: "Lista", icon: List },
  { key: "route", label: "Mi recorrido", icon: Footprints },
  { key: "stats", label: "Estadisticas", icon: BarChart3 }
];

export function BottomNavigationBar({
  active,
  isAdmin,
  onChange
}: {
  active: MobileTab;
  isAdmin: boolean;
  onChange: (tab: MobileTab) => void;
}) {
  const items = isAdmin ? [...baseItems, { key: "admin" as MobileTab, label: "Admin", icon: Shield }] : baseItems;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[900] border-t border-black/10 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 shadow-[0_-8px_24px_rgba(23,32,31,0.08)]" aria-label="Navegacion principal">
      <div className="grid h-[72px] grid-flow-col auto-cols-fr">
        {items.map((item) => {
          const selected = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
                selected ? "text-river" : "text-ink/60"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              <span className={`grid h-8 min-w-14 place-items-center rounded-full ${selected ? "bg-river/10" : "bg-transparent"}`}>
                <Icon size={21} />
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
