"use client";

import { useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { ActivityLog, LocationPoint, Place, Profile } from "@/types";
import { PhotographerBadge, PriorityBadge, StatusBadge } from "./badges";
import { ActivityLogView } from "./activity-log";
import { supabase } from "@/lib/supabase";
import { calculateDistance, formatDistance, formatOpeningHours, getOpeningSlots, todayHours } from "@/lib/place-utils";

export function PlaceDrawer({
  place,
  currentProfile,
  profileById,
  activity,
  userLocation,
  onClose
}: {
  place: Place | null;
  currentProfile: Profile;
  profileById: Map<string, Profile>;
  activity: ActivityLog[];
  userLocation?: LocationPoint | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeActivity = useMemo(() => activity.filter((item) => item.place_id === place?.id), [activity, place?.id]);
  if (!place) return null;
  const currentPlace = place;

  const assignedToMe = currentPlace.assigned_photographer_id === currentProfile.id;
  const canUnassign = assignedToMe || currentProfile.role === "admin";
  const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;

  async function run(action: "assign" | "unassign" | "in_progress" | "completed" | "issue" | "skipped" | "note" | "reopen") {
    setBusy(true);
    setError(null);
    const locationArgs = userLocation ? { latitude_value: userLocation.lat, longitude_value: userLocation.lng } : {};
    const result =
      action === "assign"
        ? await supabase.rpc("assign_place", { target_place_id: currentPlace.id, note_text: note || null })
        : action === "unassign"
          ? await supabase.rpc("unassign_place", { target_place_id: currentPlace.id, note_text: note || null })
          : action === "note"
            ? await supabase.rpc("add_place_note", { target_place_id: currentPlace.id, note_text: note })
            : await supabase.rpc("set_place_status", {
                target_place_id: currentPlace.id,
                status_value: action === "reopen" ? "pending" : action,
                note_text: note || null,
                ...locationArgs
              });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNote("");
  }

  const primary =
    place.status === "pending"
      ? { label: "Asignarme", action: "assign" as const }
      : assignedToMe && place.status === "assigned"
        ? { label: "Marcar en progreso", action: "in_progress" as const }
        : place.status === "in_progress"
          ? { label: "Marcar fotografiado", action: "completed" as const }
          : null;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[900] max-h-[82vh] overflow-y-auto rounded-t-lg bg-white p-4 shadow-panel md:absolute md:inset-y-0 md:right-0 md:left-auto md:w-[430px] md:rounded-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</h2>
          <p className="mt-1 text-sm text-ink/65">{place.full_address || place.address}</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-mist p-2" aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={place.status} />
        <PriorityBadge priority={place.priority} />
        <PhotographerBadge profile={place.assigned_photographer_id ? profileById.get(place.assigned_photographer_id) : null} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-field p-3">
          <p className="font-semibold">Horario</p>
          <p className="text-ink/70">{todayHours(place)}</p>
        </div>
        <div className="rounded-md bg-field p-3">
          <p className="font-semibold">Distancia</p>
          <p className="text-ink/70">{distance === null ? "Sin ubicacion" : formatDistance(distance)}</p>
        </div>
      </div>
      <p className="mt-3 rounded-md bg-field p-3 text-sm font-semibold text-ink/75">{formatOpeningHours(getOpeningSlots(place))}</p>
      {place.completed_at && (
        <p className="mt-3 rounded-md bg-mist p-3 text-sm">
          Fotografiado por {place.completed_by ? profileById.get(place.completed_by)?.full_name : "usuario"} el {new Date(place.completed_at).toLocaleString("es-AR")}.
        </p>
      )}
      <a className="mt-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`} target="_blank" rel="noreferrer">
        <ExternalLink size={16} />
        Abrir en Google Maps
      </a>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="mt-4 min-h-24 w-full rounded-md border border-black/15 p-3 text-sm"
        placeholder="Nota para problema, descarte o actividad"
      />
      {error && <p className="mt-2 rounded-md bg-coral/10 p-2 text-sm text-coral">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {primary && (
          <button disabled={busy} onClick={() => run(primary.action)} className="col-span-2 rounded-md bg-river px-4 py-3 font-bold text-white disabled:opacity-60">
            {primary.label}
          </button>
        )}
        <button disabled={busy} onClick={() => run("in_progress")} className="rounded-md bg-amber px-3 py-3 font-semibold text-white disabled:opacity-60">En progreso</button>
        <button disabled={busy} onClick={() => run("completed")} className="rounded-md bg-river px-3 py-3 font-semibold text-white disabled:opacity-60">Fotografiado</button>
        <button disabled={busy} onClick={() => run("issue")} className="rounded-md bg-coral px-3 py-3 font-semibold text-white disabled:opacity-60">Problema</button>
        <button disabled={busy} onClick={() => run("skipped")} className="rounded-md bg-ink/70 px-3 py-3 font-semibold text-white disabled:opacity-60">Descartar</button>
        <button disabled={busy || !note.trim()} onClick={() => run("note")} className="rounded-md bg-mist px-3 py-3 font-semibold text-ink disabled:opacity-60">Agregar nota</button>
        {canUnassign && <button disabled={busy} onClick={() => run("unassign")} className="rounded-md bg-mist px-3 py-3 font-semibold text-ink disabled:opacity-60">Liberar</button>}
        {currentProfile.role === "admin" && <button disabled={busy} onClick={() => run("reopen")} className="rounded-md bg-mist px-3 py-3 font-semibold text-ink disabled:opacity-60">Reabrir</button>}
      </div>
      {place.notes && <p className="mt-4 whitespace-pre-wrap rounded-md bg-field p-3 text-sm text-ink/75">{place.notes}</p>}
      <h3 className="mt-5 font-bold">Historial reciente</h3>
      <div className="mt-2">
        <ActivityLogView items={placeActivity} profileById={profileById} />
      </div>
    </aside>
  );
}
