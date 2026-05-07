import type { ActivityLog, Profile } from "@/types";

const actionLabels: Record<string, string> = {
  place_created: "Lugar creado",
  place_updated: "Lugar actualizado",
  assigned: "Asignado",
  unassigned: "Asignacion liberada",
  started: "En progreso",
  completed: "Fotografiado",
  issue_reported: "Problema reportado",
  skipped: "Descartado",
  note_added: "Nota agregada",
  priority_changed: "Prioridad cambiada",
  status_changed: "Estado cambiado",
  reopened: "Reabierto"
};

export function ActivityLogView({ items, profileById }: { items: ActivityLog[]; profileById: Map<string, Profile> }) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="rounded-md bg-mist p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{actionLabels[item.action] ?? item.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-ink/55">{new Date(item.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p className="text-xs text-ink/60">
            {item.photographer_id ? profileById.get(item.photographer_id)?.full_name : "Sistema"}
            {item.previous_status && item.new_status && item.previous_status !== item.new_status ? ` · ${item.previous_status} → ${item.new_status}` : ""}
          </p>
          {item.note && <p className="mt-1 text-ink/75">{item.note}</p>}
        </div>
      ))}
      {!items.length && <p className="text-sm text-ink/55">Sin actividad registrada.</p>}
    </div>
  );
}
