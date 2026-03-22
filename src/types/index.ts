export interface Member {
  id: string;
  name: string;
  colorHex: string;
  initials: string;
  primary: boolean;
}

export interface CalendarEvent {
  id: string;
  memberId: string;
  title: string;
  dayIndex: number;   // YYYYMMDD integer
  startHour: number;  // 0–23.75
  duration: number;   // hours
  isGoogle: boolean;
  colorHex: string | null;
  colorId?: string;
  recurrence?: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
}

export interface Todo {
  id: number;
  title: string;
  project?: string;
  due_date?: string;
  is_completed: boolean;
  user_email: string;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface DayData {
  dayIndex: number;
  label: string;
  isToday: boolean;
  date: Date;
}

export interface MonthData {
  year: number;
  month: number;
  monthIndex: number;
  date: Date;
}

// New event being drawn by drag
export interface SelectionState {
  dayIndex: number;
  colIndex: number;
  memberId?: string;
  startHour: number;
  endHour: number;
}

export interface ResizingState {
  eventId: string;
  memberId: string;
  initialDuration: number;
  startY: number;
  currentDuration: number;
}

export interface EventLayout {
  column: number;
  totalColumns: number;
}

export type ViewMode = "week" | "day" | "month";
