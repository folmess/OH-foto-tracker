import type { Place, PlaceStatus, Priority, Profile } from "@/types";
import { getPlaceStatusLabel, getPriorityLabel, statusColors } from "@/lib/labels";
import { getActiveAssignments, getPhotoSessions, isAssignedToAnotherProfile, isAssignedToProfile } from "@/lib/place-utils";

export function StatusBadge({ status }: { status: PlaceStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: statusColors[status] }}
    >
      {getPlaceStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const className =
    priority === "high"
      ? "bg-coral text-white"
      : priority === "medium"
        ? "bg-amber text-white"
        : "bg-mist text-ink";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{getPriorityLabel(priority)}</span>;
}

export function PhotographerBadge({ profile }: { profile?: Profile | null }) {
  if (!profile) return <span className="text-xs text-ink/55">Sin asignar</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: profile.color }} />
      {profile.full_name}
    </span>
  );
}

export function CoverageChips({ place, profileById, showEmpty = false }: { place: Place; profileById: Map<string, Profile>; showEmpty?: boolean }) {
  const assignments = getActiveAssignments(place);
  const sessions = getPhotoSessions(place);
  const sessionCount = sessions.length;

  if (!assignments.length && !sessionCount && !showEmpty) return null;

  return (
    <>
      {assignments.map((assignment) => {
        const profile = profileById.get(assignment.photographer_id);
        return (
          <span
            key={assignment.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10"
            title={profile?.full_name ?? "Fotografo asignado"}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: profile?.color ?? "#65706d" }} />
            {profile?.full_name ?? "Fotografo"}
          </span>
        );
      })}
      {sessionCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
          {sessionCount} {sessionCount === 1 ? "sesion" : "sesiones"}
        </span>
      )}
      {sessionCount > 0 && assignments.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-river/10 px-2.5 py-1 text-xs font-semibold text-river">
          Ya fotografiado
        </span>
      )}
      {!assignments.length && !sessionCount && showEmpty && <span className="text-xs text-ink/55">Sin asignar</span>}
    </>
  );
}

export function AssignmentNoticeChip({ place, currentProfileId }: { place: Place; currentProfileId?: string }) {
  if (!isAssignedToAnotherProfile(place, currentProfileId)) return null;
  const assignedToMe = isAssignedToProfile(place, currentProfileId);
  return (
    <span className="inline-flex items-center rounded-full bg-amber/15 px-2.5 py-1 text-xs font-extrabold text-amber-900">
      {assignedToMe ? "Asignado a mi tambien" : "Asignado a otro"}
    </span>
  );
}
