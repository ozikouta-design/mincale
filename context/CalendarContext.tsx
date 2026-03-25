import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { CalendarEvent, EventFormData, UserProfile, ViewMode, GoogleCalendarInfo, CalendarGroup } from '@/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, addDays, subDays,
} from 'date-fns';

const SYNC_RANGE_KEY = 'calendar_sync_range_days';

async function loadSyncRange(): Promise<number> {
  try {
    if (Platform.OS === 'web') {
      return parseInt(localStorage.getItem(SYNC_RANGE_KEY) || '0', 10) || 0;
    }
    const SecureStore = await import('expo-secure-store');
    const val = await SecureStore.getItemAsync(SYNC_RANGE_KEY);
    return parseInt(val || '0', 10) || 0;
  } catch { return 0; }
}

async function saveSyncRange(days: number): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(SYNC_RANGE_KEY, String(days));
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(SYNC_RANGE_KEY, String(days));
  } catch {}
}

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
  updateEvent: (eventId: string, data: EventFormData, calendarId?: string) => Promise<boolean>;
  deleteEvent: (eventId: string, calendarId?: string) => Promise<boolean>;
  calendarList: GoogleCalendarInfo[];
  calendarGroups: CalendarGroup[];
  fetchCalendarList: () => Promise<GoogleCalendarInfo[]>;
  toggleCalendarVisibility: (calendarId: string) => Promise<void>;
  createCalendarGroup: (name: string, calendarIds?: string[]) => Promise<CalendarGroup>;
  updateCalendarGroup: (id: string, name: string, calendarIds: string[]) => Promise<void>;
  deleteCalendarGroup: (id: string) => Promise<void>;
  moveCalendarToGroup: (calendarId: string, groupId: string | null) => Promise<void>;
  setGroupVisibility: (calendarIds: string[], selected: boolean) => Promise<void>;
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  syncRangeDays: number;
  setSyncRangeDays: (days: number) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [syncRangeDays, setSyncRangeDaysState] = useState<number>(0);
  const google = useGoogleCalendar();
  const userProfileHook = useUserProfile();

  // 同期範囲をストレージから読み込む
  useEffect(() => {
    loadSyncRange().then(setSyncRangeDaysState);
  }, []);

  const setSyncRangeDays = useCallback(async (days: number) => {
    setSyncRangeDaysState(days);
    await saveSyncRange(days);
  }, []);

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
    let start: Date, end: Date;
    if (syncRangeDays > 0) {
      // 同期範囲設定: 今日を基点に前後N日取得
      const today = new Date();
      start = subDays(today, syncRangeDays);
      end = addDays(today, syncRangeDays);
    } else {
      // 都度: 現在のビュー範囲 ± 7日
      const [rangeStart, rangeEnd] = getDateRange(currentDate, viewMode);
      start = subDays(rangeStart, 7);
      end = addDays(rangeEnd, 7);
    }
    await google.fetchEvents(start, end);
  }, [google.isAuthenticated, currentDate, viewMode, getDateRange, google.fetchEvents, syncRangeDays]);

  useEffect(() => {
    google.checkAuthStatus();
  }, []);

  useEffect(() => {
    if (google.isAuthenticated) {
      google.fetchCalendarList();
    }
  }, [google.isAuthenticated]);

  // 選択されているカレンダーのイベントのみ表示する（クライアント側フィルタ）
  // アクティブグループがある場合はそのグループメンバーのみ
  const visibleEvents = useMemo(() => {
    if (!google.calendarList.length) return google.events;
    let filtered = google.calendarList;
    if (activeGroupId) {
      filtered = filtered.filter(c => (c.groupIds ?? []).includes(activeGroupId));
    } else {
      filtered = filtered.filter(c => c.selected);
    }
    const visibleIds = new Set(filtered.map(c => c.id));
    return google.events.filter(e => !e.calendarId || visibleIds.has(e.calendarId));
  }, [google.events, google.calendarList, activeGroupId]);

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
        events: visibleEvents,
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
        calendarList: google.calendarList,
        calendarGroups: google.calendarGroups,
        fetchCalendarList: google.fetchCalendarList,
        toggleCalendarVisibility: google.toggleCalendarVisibility,
        createCalendarGroup: google.createCalendarGroup,
        updateCalendarGroup: google.updateCalendarGroup,
        deleteCalendarGroup: google.deleteCalendarGroup,
        moveCalendarToGroup: google.moveCalendarToGroup,
        setGroupVisibility: google.setGroupVisibility,
        activeGroupId,
        setActiveGroupId,
        syncRangeDays,
        setSyncRangeDays,
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
