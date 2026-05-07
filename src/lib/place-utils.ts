import type { FilterKey, LocationPoint, OpeningDay, OpeningPeriod, OpeningSlot, Place, Priority, Profile, SortKey } from "@/types";
import { statusColors } from "./labels";

const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

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

export function getMarkerStyle(place: Place, photographer?: Profile | null) {
  return {
    color: place.assigned_photographer_id && photographer ? photographer.color : statusColors[place.status],
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
  return places.filter((place) => {
    if (filters.has("pending") && place.status !== "pending") return false;
    if (filters.has("unassigned") && place.assigned_photographer_id) return false;
    if (filters.has("assigned") && place.status !== "assigned") return false;
    if (filters.has("mine") && place.assigned_photographer_id !== userId) return false;
    if (filters.has("in_progress") && place.status !== "in_progress") return false;
    if (filters.has("completed") && place.status !== "completed") return false;
    if (filters.has("issue") && place.status !== "issue") return false;
    if (filters.has("high") && place.priority !== "high") return false;
    const slots = getOpeningSlots(place);
    if (filters.has("saturday") && !isOpenOnDay(slots, "saturday")) return false;
    if (filters.has("sunday") && !isOpenOnDay(slots, "sunday")) return false;
    if (filters.has("saturday_morning") && !isOpenInPeriod(slots, "saturday", "morning")) return false;
    if (filters.has("saturday_afternoon") && !isOpenInPeriod(slots, "saturday", "afternoon")) return false;
    if (filters.has("sunday_morning") && !isOpenInPeriod(slots, "sunday", "morning")) return false;
    if (filters.has("sunday_afternoon") && !isOpenInPeriod(slots, "sunday", "afternoon")) return false;
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
