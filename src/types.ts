export type Role = "admin" | "photographer";
export type PlaceStatus = "pending" | "assigned" | "in_progress" | "completed" | "issue" | "skipped";
export type AssignmentStatus = "assigned" | "in_progress" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high";
export type City = "Rosario" | "Funes";
export type OpeningDay = "saturday" | "sunday";
export type OpeningPeriod = "morning" | "afternoon" | "custom";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  color: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Place = {
  id: string;
  place_number: string | null;
  name: string;
  address: string | null;
  street_address: string | null;
  city: City | null;
  full_address: string | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  saturday_open: string | null;
  saturday_close: string | null;
  sunday_open: string | null;
  sunday_close: string | null;
  priority: Priority;
  status: PlaceStatus;
  assigned_photographer_id: string | null;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  opening_slots?: OpeningSlot[];
  assignments?: PlaceAssignment[];
  photo_sessions?: PlacePhotoSession[];
};

export type PlaceAssignment = {
  id: string;
  place_id: string;
  photographer_id: string;
  status: AssignmentStatus;
  note: string | null;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlacePhotoSession = {
  id: string;
  place_id: string;
  photographer_id: string;
  assignment_id: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  photographed_at: string;
  created_at: string;
  updated_at: string;
};

export type OpeningSlot = {
  id?: string;
  place_id?: string;
  day_of_week: OpeningDay;
  period: OpeningPeriod;
  open_time: string;
  close_time: string;
  created_at?: string;
  updated_at?: string;
};

export type GeocodeResult = {
  full_address: string;
  lat: number;
  lng: number;
  provider: string;
  display_name: string;
  from_cache?: boolean;
};

export type ActivityLog = {
  id: string;
  place_id: string;
  photographer_id: string | null;
  action: string;
  note: string | null;
  previous_status: string | null;
  new_status: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type LocationPoint = {
  lat: number;
  lng: number;
};

export type FilterKey =
  | "all"
  | "pending"
  | "unassigned"
  | "assigned"
  | "mine"
  | "in_progress"
  | "completed"
  | "issue"
  | "high"
  | "saturday"
  | "sunday"
  | "saturday_morning"
  | "saturday_afternoon"
  | "sunday_morning"
  | "sunday_afternoon"
  | "open_now"
  | "nearby"
  | "closing";

export type SortKey = "recommended" | "distance" | "priority" | "closing" | "status" | "place_number" | "name";
export type BottomSheetState = "collapsed" | "partial" | "expanded";
export type MobileTab = "map" | "list" | "route" | "stats" | "admin";
