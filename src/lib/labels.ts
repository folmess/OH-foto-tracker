import type { PlaceStatus, Priority } from "@/types";

export const statusLabels: Record<PlaceStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Fotografiado",
  issue: "Problema",
  skipped: "Descartado"
};

export const priorityLabels: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta"
};

export const statusColors: Record<PlaceStatus, string> = {
  pending: "#65706d",
  assigned: "#147a73",
  in_progress: "#c98217",
  completed: "#2f8f4e",
  issue: "#d45b45",
  skipped: "#74716d"
};

export function getPlaceStatusLabel(status: PlaceStatus) {
  return statusLabels[status];
}

export function getPriorityLabel(priority: Priority) {
  return priorityLabels[priority];
}
