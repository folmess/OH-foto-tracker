"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, X, MapPin, Clock, MoreHorizontal, MessageSquare } from "lucide-react";
import type { ActivityLog, LocationPoint, Place, Priority, Profile } from "@/types";
import { AssignmentNoticeChip, CoverageChips, PriorityBadge, StatusBadge } from "./badges";
import { ActivityLogView } from "./activity-log";
import { supabase } from "@/lib/supabase";
import { calculateDistance, formatDistance, formatOpeningHours, getActiveAssignments, getOpeningSlots, getPhotoSessions, isAssignedToProfile, todayHours, isOpenNow } from "@/lib/place-utils";

export function PlaceDetailSheetContent({
  place,
  currentProfile,
  profiles,
  profileById,
  activity,
  userLocation,
  onChangePriority,
  refresh,
  onClose,
  onBack
}: {
  place: Place | null;
  currentProfile: Profile;
  profiles: Profile[];
  profileById: Map<string, Profile>;
  activity: ActivityLog[];
  userLocation?: LocationPoint | null;
  onChangePriority: (place: Place, priority: Priority) => Promise<void>;
  refresh: () => Promise<void>;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeActivity = useMemo(() => activity.filter((item) => item.place_id === place?.id), [activity, place?.id]);
  const activePhotographers = useMemo(
    () => profiles.filter((profile) => profile.active && (profile.role === "photographer" || profile.role === "admin")).sort((a, b) => a.full_name.localeCompare(b.full_name, "es")),
    [profiles]
  );
  if (!place) return null;
  const currentPlace = place;

  const activeAssignments = getActiveAssignments(currentPlace);
  const photoSessions = getPhotoSessions(currentPlace);
  const assignedToMe = isAssignedToProfile(currentPlace, currentProfile.id);
  const canUnassign = assignedToMe;
  const isAdmin = currentProfile.role === "admin";
  const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) : null;
  const open = isOpenNow(place);

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
    setShowNoteInput(false);
  }

  async function assignTo(photographerId: string) {
    if (!isAdmin || !photographerId) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.rpc("assign_place_to", {
      target_place_id: currentPlace.id,
      photographer_uuid: photographerId,
      note_text: note || null
    });
    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function unassignPhotographer(photographerId: string) {
    if (!isAdmin && photographerId !== currentProfile.id) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.rpc("unassign_place", {
      target_place_id: currentPlace.id,
      note_text: note || null,
      photographer_uuid: photographerId
    });
    if (updateError) setError(updateError.message);
    await refresh();
    setBusy(false);
  }

  async function changePriority(priority: Priority) {
    if (!isAdmin || currentPlace.priority === priority) return;
    setBusy(true);
    setError(null);
    try {
      await onChangePriority(currentPlace, priority);
    } finally {
      setBusy(false);
    }
  }

  const primary =
    place.status === "pending"
      ? { label: "Asignarme", action: "assign" as const }
      : assignedToMe && place.status === "assigned"
        ? { label: "Marcar en progreso", action: "in_progress" as const }
        : activeAssignments.length > 0 && !assignedToMe
          ? { label: "Fotografiar igual", action: "completed" as const }
          : place.status === "in_progress"
          ? { label: "Marcar fotografiado", action: "completed" as const }
          : null;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        {onBack && (
          <button onClick={onBack} className="mr-1 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mist text-ink transition active:scale-95" aria-label="Volver a la lista">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-river opacity-75"></span>}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${open ? "bg-river" : "bg-coral"}`}></span>
            </span>
            <h2 className="text-xl font-extrabold text-ink leading-tight">{place.place_number ? `${place.place_number} · ` : ""}{place.name}</h2>
          </div>
          <div className="mt-1.5 flex items-start gap-2">
            <p className="text-sm font-medium text-ink/65 leading-snug flex-1">{place.full_address || place.address}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`} target="_blank" rel="noreferrer" className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-field text-ink transition hover:bg-mist active:scale-95" title="Abrir en Maps">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full bg-mist p-2 transition active:scale-95" aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={place.status} />
        <AssignmentNoticeChip place={place} currentProfileId={currentProfile.id} />
        <PriorityBadge priority={place.priority} />
        <CoverageChips place={place} profileById={profileById} showEmpty />
      </div>

      {error && <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p>}

      <div className="mt-5 space-y-3">
        {primary && (
          <button disabled={busy} onClick={() => run(primary.action)} className="w-full rounded-xl bg-river px-4 py-4 text-center font-bold text-white shadow-lg shadow-river/20 transition active:scale-[0.98] disabled:opacity-60">
            {primary.label}
          </button>
        )}

        {showNoteInput && (
          <div className="animate-fade-in rounded-xl border border-black/10 bg-white p-2 shadow-sm">
            <textarea
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-24 w-full resize-none rounded-lg bg-field p-3 text-sm outline-none placeholder:text-ink/40"
              placeholder="Escribir una nota sobre el lugar..."
            />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setShowNoteInput(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-ink/60">Cancelar</button>
              <button disabled={busy || !note.trim()} onClick={() => run("note")} className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Guardar</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {!showNoteInput && (
            <button disabled={busy} onClick={() => setShowNoteInput(true)} className="flex items-center justify-center gap-2 rounded-xl bg-mist px-3 py-3.5 text-sm font-bold text-ink transition active:scale-[0.98] disabled:opacity-60">
              <MessageSquare size={16} />
              Agregar nota
            </button>
          )}
          
          <button onClick={() => setShowMoreActions(!showMoreActions)} className={`flex items-center justify-center gap-2 rounded-xl bg-mist px-3 py-3.5 text-sm font-bold text-ink transition active:scale-[0.98] ${showNoteInput ? "col-span-2" : ""}`}>
            <MoreHorizontal size={16} />
            {showMoreActions ? "Ocultar acciones" : "Más acciones"}
          </button>
        </div>

        {showMoreActions && (
          <div className="animate-slide-up grid grid-cols-2 gap-2 pt-2">
            {isAdmin && (
              <div className="col-span-2 grid gap-2 rounded-xl border border-black/10 bg-field p-3">
                <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-ink/50">
                  Asignar a
                  <select
                    disabled={busy}
                    value=""
                    onChange={(event) => void assignTo(event.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-ink disabled:opacity-60"
                  >
                    <option value="">Sumar fotografo</option>
                    {activePhotographers.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                {activeAssignments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeAssignments.map((assignment) => {
                      const assignedProfile = profileById.get(assignment.photographer_id);
                      return (
                        <button
                          key={assignment.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void unassignPhotographer(assignment.photographer_id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10 disabled:opacity-60"
                          title="Liberar asignacion"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: assignedProfile?.color ?? "#65706d" }} />
                          {assignedProfile?.full_name ?? "Fotografo"}
                          <X size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}
                <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-ink/50">
                  Prioridad
                  <select
                    disabled={busy}
                    value={currentPlace.priority}
                    onChange={(event) => void changePriority(event.target.value as Priority)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-ink disabled:opacity-60"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </label>
              </div>
            )}
            <button disabled={busy} onClick={() => run("in_progress")} className="rounded-xl border border-amber/30 bg-amber/5 px-3 py-3 text-sm font-bold text-amber-700 transition active:scale-95 disabled:opacity-50">En progreso</button>
            <button disabled={busy} onClick={() => run("completed")} className="rounded-xl border border-river/30 bg-river/5 px-3 py-3 text-sm font-bold text-river transition active:scale-95 disabled:opacity-50">Fotografiado</button>
            <button disabled={busy} onClick={() => run("issue")} className="rounded-xl border border-coral/30 bg-coral/5 px-3 py-3 text-sm font-bold text-coral transition active:scale-95 disabled:opacity-50">Reportar problema</button>
            <button disabled={busy} onClick={() => run("skipped")} className="rounded-xl border border-ink/20 bg-ink/5 px-3 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50">Descartar</button>
            {canUnassign && <button disabled={busy} onClick={() => run("unassign")} className="col-span-2 rounded-xl border border-ink/10 bg-field px-3 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50">Liberar asignación</button>}
            {isAdmin && <button disabled={busy} onClick={() => run("reopen")} className="col-span-2 rounded-xl border border-ink/10 bg-field px-3 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50">Reabrir lugar (Admin)</button>}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-field p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/50">Información del lugar</h4>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-ink/40" />
            <div>
              <p className="text-sm font-semibold text-ink">{distance === null ? "Distancia desconocida" : `A ${formatDistance(distance)}`}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-ink/40" />
            <div>
              <p className="text-sm font-semibold text-ink">{todayHours(place)}</p>
              <p className="mt-0.5 text-xs font-medium text-ink/65">{formatOpeningHours(getOpeningSlots(place))}</p>
            </div>
          </div>
        </div>
      </div>

      {photoSessions.length > 0 && (
        <div className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm font-medium text-ink">
          <p className="font-bold">{photoSessions.length === 1 ? "1 sesion fotografica" : `${photoSessions.length} sesiones fotograficas`}</p>
          <div className="mt-2 space-y-1">
            {photoSessions.map((session, index) => (
              <p key={session.id}>
                #{photoSessions.length - index} por {profileById.get(session.photographer_id)?.full_name ?? "usuario"} el {new Date(session.photographed_at).toLocaleString("es-AR")}.
              </p>
            ))}
          </div>
        </div>
      )}

      {place.notes && (
        <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/5 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-900/60">Notas públicas</h4>
          <p className="whitespace-pre-wrap text-sm font-medium text-amber-900">{place.notes}</p>
        </div>
      )}

      <h3 className="mt-8 font-extrabold text-ink">Historial reciente</h3>
      <div className="mt-3">
        <ActivityLogView items={placeActivity} profileById={profileById} />
      </div>
    </div>
  );
}

export function PlaceDrawer(props: {
  place: Place | null;
  currentProfile: Profile;
  profiles: Profile[];
  profileById: Map<string, Profile>;
  activity: ActivityLog[];
  userLocation?: LocationPoint | null;
  onChangePriority: (place: Place, priority: Priority) => Promise<void>;
  refresh: () => Promise<void>;
  onClose: () => void;
}) {
  if (!props.place) return null;
  return (
    <aside className="fixed inset-x-0 bottom-0 z-[900] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-sheet md:absolute md:inset-y-0 md:right-0 md:left-auto md:w-[430px] md:rounded-none">
      <PlaceDetailSheetContent {...props} />
    </aside>
  );
}
