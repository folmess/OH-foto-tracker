"use client";

import type { Profile } from "@/types";
import { statusColors, statusLabels } from "@/lib/labels";

export function MapLegend({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="absolute bottom-20 left-3 z-[800] max-w-[calc(100%-5.5rem)] rounded-lg bg-white p-3 text-xs shadow-panel md:bottom-4 md:max-w-sm">
      <p className="font-bold text-ink">Mapa</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1 rounded-full bg-field px-2 py-1 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }} />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {profiles.map((profile) => (
          <span key={profile.id} className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-1 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: profile.color }} />
            {profile.full_name}
          </span>
        ))}
      </div>
    </div>
  );
}
