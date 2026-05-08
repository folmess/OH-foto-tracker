import type { FilterKey, LocationPoint, OpeningDay, OpeningPeriod, OpeningSlot, Place, Priority, Profile, SortKey } from "@/types";
import { statusColors } from "./labels";

const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
export type ScheduleChipTone = "open" | "closed" | "skipped";
export type ScheduleChip = { label: string; tone: ScheduleChipTone };

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

export function getOpeningSlots(place: Place) {
  const slots = place.opening_slots ?? [];
  if (slots.length) return slots;
  const fallback: OpeningSlot[] = [];
  if (place.saturday_open && place.saturday_close) {
    fallback.push({ day_of_week: "saturday", period: "custom", open_time: place.saturday_open, close_time: place.saturday_close });
  }
  if (place.sunday_open && place.sunday_close) {
    fallback.push({ day_of_week: "sunday", period: "custom", open_time: place.sunday_open, close_time: place.sunday_close });
  }
  return fallback;
}

export function formatOpeningHours(slots: OpeningSlot[]) {
  if (!slots.length) return "Sin horarios";
  const dayLabels: Record<OpeningDay, string> = { saturday: "Sab", sunday: "Dom" };
  const byDay = (["saturday", "sunday"] as OpeningDay[])
    .map((day) => {
      const daySlots = slots
        .filter((slot) => slot.day_of_week === day)
        .sort((a, b) => a.open_time.localeCompare(b.open_time));
      if (!daySlots.length) return null;
      const ranges = daySlots.map((slot) => `${normalizeTime(slot.open_time)}-${normalizeTime(slot.close_time)}`).join(" / ");
      return `${dayLabels[day]} ${ranges}`;
    })
    .filter(Boolean);
  return byDay.join(" · ");
}

export function isOpenOnDay(slots: OpeningSlot[], day: OpeningDay) {
  return slots.some((slot) => slot.day_of_week === day);
}

export function isOpenInPeriod(slots: OpeningSlot[], day: OpeningDay, period: OpeningPeriod) {
  return slots.some((slot) => slot.day_of_week === day && slot.period === period);
}

export function isOpenOnSaturday(place: Place) {
  return isOpenOnDay(getOpeningSlots(place), "saturday");
}

export function isOpenOnSunday(place: Place) {
  return isOpenOnDay(getOpeningSlots(place), "sunday");
}

function getDayScheduleLabel(
  slots: OpeningSlot[],
  day: OpeningDay,
  labels: { full: string; morning: string; afternoon: string }
) {
  const daySlots = slots.filter((slot) => slot.day_of_week === day);
  if (!daySlots.length) return null;
  const hasMorning = daySlots.some((slot) => slot.period === "morning");
  const hasAfternoon = daySlots.some((slot) => slot.period === "afternoon");
  const hasCustom = daySlots.some((slot) => slot.period === "custom");
  if (hasMorning && !hasAfternoon && !hasCustom) return labels.morning;
  if (hasAfternoon && !hasMorning && !hasCustom) return labels.afternoon;
  return labels.full;
}

export function getScheduleChips(place: Place): ScheduleChip[] {
  if (place.status === "skipped") return [{ label: "Descartado", tone: "skipped" }];

  const slots = getOpeningSlots(place);
  if (!slots.length) return [{ label: "Cerrado", tone: "closed" }];

  const chips = [
    getDayScheduleLabel(slots, "saturday", { full: "Sábado", morning: "Sábado mañana", afternoon: "Sábado tarde" }),
    getDayScheduleLabel(slots, "sunday", { full: "Domingo", morning: "Domingo mañana", afternoon: "Domingo tarde" })
  ]
    .filter((label): label is string => Boolean(label))
    .map((label) => ({ label, tone: "open" as const }));

  return chips.length ? chips : [{ label: "Cerrado", tone: "closed" }];
}

function timeToMinutes(value: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDateDay(date: Date): OpeningDay | null {
  const day = date.getDay();
  if (day === 6) return "saturday";
  if (day === 0) return "sunday";
  return null;
}

export function isOpenNow(slotsOrPlace: OpeningSlot[] | Place, date = new Date()) {
  const slots = Array.isArray(slotsOrPlace) ? slotsOrPlace : getOpeningSlots(slotsOrPlace);
  const day = getDateDay(date);
  if (!day) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return slots.some((slot) => {
    if (slot.day_of_week !== day) return false;
    const openMinutes = timeToMinutes(slot.open_time);
    const closeMinutes = timeToMinutes(slot.close_time);
    return openMinutes !== null && closeMinutes !== null && now >= openMinutes && now <= closeMinutes;
  });
}

export function getNextClosingTime(slots: OpeningSlot[], date = new Date()) {
  const day = getDateDay(date);
  if (!day) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  const candidates = slots
    .filter((slot) => slot.day_of_week === day)
    .map((slot) => ({ slot, closeMinutes: timeToMinutes(slot.close_time), openMinutes: timeToMinutes(slot.open_time) }))
    .filter((item) => item.openMinutes !== null && item.closeMinutes !== null && now >= item.openMinutes && now <= item.closeMinutes)
    .sort((a, b) => (a.closeMinutes ?? 0) - (b.closeMinutes ?? 0));
  return candidates[0]?.slot ?? null;
}

export function getNextOpeningTime(slots: OpeningSlot[], date = new Date()) {
  const day = getDateDay(date);
  if (!day) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  const candidates = slots
    .filter((slot) => slot.day_of_week === day)
    .map((slot) => ({ slot, openMinutes: timeToMinutes(slot.open_time) }))
    .filter((item) => item.openMinutes !== null && now <= item.openMinutes)
    .sort((a, b) => (a.openMinutes ?? 0) - (b.openMinutes ?? 0));
  return candidates[0]?.slot ?? null;
}

export function closesSoon(slotsOrPlace: OpeningSlot[] | Place, date = new Date(), thresholdMinutes = 45) {
  const slots = Array.isArray(slotsOrPlace) ? slotsOrPlace : getOpeningSlots(slotsOrPlace);
  const closingSlot = getNextClosingTime(slots, date);
  const closeMinutes = closingSlot ? timeToMinutes(closingSlot.close_time) : null;
  if (closeMinutes === null) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return closeMinutes - now <= thresholdMinutes;
}

export function getActiveAssignments(place: Place) {
  return (place.assignments ?? []).filter((assignment) => assignment.status === "assigned" || assignment.status === "in_progress");
}

export function getPhotoSessions(place: Place) {
  return [...(place.photo_sessions ?? [])].sort((a, b) => b.photographed_at.localeCompare(a.photographed_at));
}

export function hasActiveAssignments(place: Place) {
  return getActiveAssignments(place).length > 0;
}

export function hasPhotoSessions(place: Place) {
  return getPhotoSessions(place).length > 0;
}

export function isAssignedToProfile(place: Place, profileId?: string) {
  if (!profileId) return false;
  return getActiveAssignments(place).some((assignment) => assignment.photographer_id === profileId);
}

export function isAssignedToAnotherProfile(place: Place, profileId?: string) {
  const assignments = getActiveAssignments(place);
  if (!assignments.length) return false;
  if (!profileId) return true;
  return assignments.some((assignment) => assignment.photographer_id !== profileId);
}

export function isPlaceFullyCompleted(place: Place) {
  return hasPhotoSessions(place) && !hasActiveAssignments(place) && place.status !== "skipped";
}

export function getPrimaryAssignedPhotographer(place: Place, profileById: Map<string, Profile>) {
  const firstAssignment = getActiveAssignments(place)[0];
  if (firstAssignment) return profileById.get(firstAssignment.photographer_id) ?? null;
  if (place.assigned_photographer_id) return profileById.get(place.assigned_photographer_id) ?? null;
  return null;
}

export function getMarkerStyle(place: Place, photographer?: Profile | null) {
  return {
    color: photographer ? photographer.color : statusColors[place.status],
    borderColor: statusColors[place.status]
  };
}

export function sortPlacesByDistance(places: Place[], userLocation?: LocationPoint | null) {
  if (!userLocation) return places;
  return [...places].sort(
    (a, b) =>
      calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
      calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
  );
}

export function filterPlaces(
  places: Place[],
  filters: Set<FilterKey>,
  userId?: string,
  userLocation?: LocationPoint | null
) {
  if (filters.has("all") || filters.size === 0) return places;
  const statusFilters: FilterKey[] = ["pending", "unassigned", "assigned", "mine", "assigned_other", "in_progress", "completed", "issue", "skipped"];
  const priorityFilters: FilterKey[] = ["high", "medium", "low"];
  const scheduleFilters: FilterKey[] = ["saturday", "sunday", "saturday_morning", "saturday_afternoon", "sunday_morning", "sunday_afternoon"];
  const activeStatusFilters = statusFilters.filter((filter) => filters.has(filter));
  const activePriorityFilters = priorityFilters.filter((filter) => filters.has(filter));
  const activeScheduleFilters = scheduleFilters.filter((filter) => filters.has(filter));

  return places.filter((place) => {
    if (
      activeStatusFilters.length &&
      !activeStatusFilters.some((filter) => {
        if (filter === "pending") return place.status === "pending";
        if (filter === "unassigned") return !hasActiveAssignments(place);
        if (filter === "assigned") return hasActiveAssignments(place);
        if (filter === "mine") return isAssignedToProfile(place, userId);
        if (filter === "assigned_other") return isAssignedToAnotherProfile(place, userId);
        if (filter === "in_progress") return place.status === "in_progress";
        if (filter === "completed") return isPlaceFullyCompleted(place);
        if (filter === "issue") return place.status === "issue";
        if (filter === "skipped") return place.status === "skipped";
        return false;
      })
    ) {
      return false;
    }
    if (
      activePriorityFilters.length &&
      !activePriorityFilters.some((filter) => {
        if (filter === "high") return place.priority === "high";
        if (filter === "medium") return place.priority === "medium";
        if (filter === "low") return place.priority === "low";
        return false;
      })
    ) {
      return false;
    }
    const slots = getOpeningSlots(place);
    if (
      activeScheduleFilters.length &&
      !activeScheduleFilters.some((filter) => {
        if (filter === "saturday") return isOpenOnDay(slots, "saturday");
        if (filter === "sunday") return isOpenOnDay(slots, "sunday");
        if (filter === "saturday_morning") return isOpenInPeriod(slots, "saturday", "morning");
        if (filter === "saturday_afternoon") return isOpenInPeriod(slots, "saturday", "afternoon");
        if (filter === "sunday_morning") return isOpenInPeriod(slots, "sunday", "morning");
        if (filter === "sunday_afternoon") return isOpenInPeriod(slots, "sunday", "afternoon");
        return false;
      })
    ) {
      return false;
    }
    if (filters.has("open_now") && !isOpenNow(slots)) return false;
    if (filters.has("closing") && !closesSoon(place)) return false;
    if (filters.has("nearby")) {
      if (!userLocation) return false;
      return calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) <= 1000;
    }
    return true;
  });
}

export function sortPlaces(places: Place[], sort: SortKey, userLocation?: LocationPoint | null) {
  const sorted = [...places];
  if (sort === "recommended") {
    return sorted.sort((a, b) => {
      const statusWeight: Record<string, number> = { issue: 5, in_progress: 4, pending: 3, assigned: 2, skipped: 1, completed: 0 };
      const aDistance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) : 0;
      const bDistance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng) : 0;
      const aScore = statusWeight[a.status] * 1000 + priorityWeight[a.priority] * 100 - (userLocation ? aDistance / 100 : 0);
      const bScore = statusWeight[b.status] * 1000 + priorityWeight[b.priority] * 100 - (userLocation ? bDistance / 100 : 0);
      return bScore - aScore;
    });
  }
  if (sort === "distance" && userLocation) return sortPlacesByDistance(sorted, userLocation);
  if (sort === "priority") return sorted.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  if (sort === "status") return sorted.sort((a, b) => a.status.localeCompare(b.status));
  if (sort === "place_number") return sorted.sort((a, b) => (a.place_number ?? "").localeCompare(b.place_number ?? "", "es", { numeric: true }));
  if (sort === "closing") {
    return sorted.sort((a, b) => {
      const aSlot = getNextClosingTime(getOpeningSlots(a));
      const bSlot = getNextClosingTime(getOpeningSlots(b));
      return (aSlot?.close_time ?? "").localeCompare(bSlot?.close_time ?? "");
    });
  }
  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

export function todayHours(place: Place) {
  const now = new Date();
  const today = getDateDay(now);
  const slots = getOpeningSlots(place).filter((slot) => slot.day_of_week === today);
  if (slots.length) return formatOpeningHours(slots);
  return "Sin horario hoy";
}
