import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CalendarEvent, EventFormData, UserProfile, ViewMode } from '@/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, addDays, subDays,
} from 'date-fns';

interface CalendarContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: CalendarEvent[];
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  profile: UserProfile | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  refreshEvents: () => Promise<void>;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createEvent: (data: EventFormData) => Promise<CalendarEvent | null>;
  updateEvent: (eventId: string, data: EventFormData) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const google = useGoogleCalendar();
  const userProfileHook = useUserProfile();

  const getDateRange = useCallback(
    (date: Date, mode: ViewMode): [Date, Date] => {
      switch (mode) {
        case 'week':
          return [startOfWeek(date, { weekStartsOn: 0 }), endOfWeek(date, { weekStartsOn: 0 })];
        case 'month':
          return [startOfMonth(date), endOfMonth(date)];
        case 'day':
          return [date, date];
      }
    },
    [],
  );

  const refreshEvents = useCallback(async () => {
    if (!google.isAuthenticated) return;
    const [start, end] = getDateRange(currentDate, viewMode);
    // Fetch extra padding for smooth navigation
    await google.fetchEvents(subDays(start, 7), addDays(end, 7));
  }, [google.isAuthenticated, currentDate, viewMode, getDateRange, google.fetchEvents]);

  useEffect(() => {
    google.checkAuthStatus();
  }, []);

  // Load profile when authenticated and email is available
  useEffect(() => {
    if (google.isAuthenticated && google.userEmail) {
      userProfileHook.loadProfile(google.userEmail);
    }
  }, [google.isAuthenticated, google.userEmail]);

  // Sync Google Calendar events to Supabase for public booking page
  useEffect(() => {
    if (!google.events.length || !google.userEmail) return;
    const rows = google.events.map(e => ({
      event_id: e.id,
      host_email: google.userEmail!,
      start_time: e.startTime.toISOString(),
      end_time: e.endTime.toISOString(),
      is_all_day: e.isAllDay,
      updated_at: new Date().toISOString(),
    }));
    supabase.from('host_busy_slots').upsert(rows, { onConflict: 'event_id,host_email' })
      .then(({ error }) => { if (error) console.error('host_busy_slots sync error:', error); });
  }, [google.events, google.userEmail]);

  useEffect(() => {
    refreshEvents();
  }, [currentDate, viewMode, google.isAuthenticated]);

  const goNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week': return addWeeks(prev, 1);
        case 'month': return addMonths(prev, 1);
        case 'day': return addDays(prev, 1);
      }
    });
  }, [viewMode]);

  const goPrev = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week': return subWeeks(prev, 1);
        case 'month': return subMonths(prev, 1);
        case 'day': return subDays(prev, 1);
      }
    });
  }, [viewMode]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return (
    <CalendarContext.Provider
      value={{
        viewMode,
        setViewMode,
        currentDate,
        setCurrentDate,
        events: google.events,
        isLoading: google.isLoading,
        isAuthenticated: google.isAuthenticated,
        userEmail: google.userEmail,
        profile: userProfileHook.profile,
        signIn: google.signIn,
        signOut: google.signOut,
        goNext,
        goPrev,
        goToday,
        refreshEvents,
        saveProfile: userProfileHook.saveProfile,
        createEvent: google.createEvent,
        updateEvent: google.updateEvent,
        deleteEvent: google.deleteEvent,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}
