export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  colorHex: string;
  location?: string;
  description?: string;
  calendarId?: string;
}

export interface FreeSlot {
  date: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface FreeSlotOptions {
  startDate: Date;
  endDate: Date;
  workingHoursStart: number; // e.g. 9
  workingHoursEnd: number;   // e.g. 18
  minimumSlotMinutes: number; // e.g. 30
  excludeWeekends: boolean;
}

export interface Booking {
  id: string;
  profile_id: string;
  host_email: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_memo?: string;
  meeting_type?: string;
  zoom_url?: string;
  location?: string;
  other_details?: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  slug?: string;
  avatar_url?: string;
  booking_title?: string;
  booking_duration?: number;
  booking_start_hour?: number;
  booking_end_hour?: number;
  booking_days?: number[];
  booking_lead_time?: number;
}

export interface EventFormData {
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location: string;
  description: string;
}

export type ViewMode = "week" | "day" | "month";

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  backgroundColor: string;
  primary?: boolean;
  selected: boolean;
  groupId?: string; // 所属するカレンダーグループのID
}

export interface CalendarGroup {
  id: string;    // UUID
  name: string;  // グループ名
}

export interface DayData {
  dayIndex: number; // YYYYMMDD
  label: string;
  isToday: boolean;
  date: Date;
}
