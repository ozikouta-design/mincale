import { createContext, useContext } from 'react';
import { CalendarEvent, EventFormData, GoogleCalendarInfo, CalendarGroup } from '@/types';

/** カレンダーイベント・カレンダーリスト操作のコンテキスト型 */
export interface EventsContextType {
  events: CalendarEvent[];
  isLoading: boolean;
  refreshEvents: () => Promise<void>;
  createEvent: (data: EventFormData) => Promise<CalendarEvent | null>;
  updateEvent: (eventId: string, data: EventFormData, calendarId?: string) => Promise<boolean>;
  deleteEvent: (eventId: string, calendarId?: string) => Promise<boolean>;
  deleteRecurringEvent: (
    eventId: string,
    calendarId: string | undefined,
    recurringEventId: string,
    originalStartTime: Date,
    mode: 'single' | 'following' | 'all',
  ) => Promise<boolean>;
  calendarList: GoogleCalendarInfo[];
  calendarGroups: CalendarGroup[];
  fetchCalendarList: () => Promise<GoogleCalendarInfo[]>;
  toggleCalendarVisibility: (calendarId: string) => Promise<void>;
  createCalendarGroup: (name: string, calendarIds?: string[]) => Promise<CalendarGroup>;
  updateCalendarGroup: (id: string, name: string, calendarIds: string[]) => Promise<void>;
  deleteCalendarGroup: (id: string) => Promise<void>;
  moveCalendarToGroup: (calendarId: string, groupId: string | null) => Promise<void>;
  setGroupVisibility: (calendarIds: string[], selected: boolean) => Promise<void>;
}

export const CalendarEventsContext = createContext<EventsContextType | undefined>(undefined);

/** イベント一覧とカレンダー操作にアクセスするフック */
export function useCalendarEventsContext(): EventsContextType {
  const ctx = useContext(CalendarEventsContext);
  if (!ctx) throw new Error('useCalendarEventsContext must be used within CalendarProvider');
  return ctx;
}
