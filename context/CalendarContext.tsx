import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { CalendarEvent, EventFormData, UserProfile, ViewMode, GoogleCalendarInfo, CalendarGroup } from '@/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAppSettings } from '@/context/AppSettingsContext';
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
  deleteRecurringEvent: (eventId: string, calendarId: string | undefined, recurringEventId: string, originalStartTime: Date, mode: 'single' | 'following' | 'all') => Promise<boolean>;
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
  const { settings } = useAppSettings();
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(settings.defaultGroupId ?? null);
  const [syncRangeDays, setSyncRangeDaysState] = useState<number>(0);
  const google = useGoogleCalendar();
  const userProfileHook = useUserProfile();

  // 同期範囲をストレージから読み込む
  useEffect(() => {
    loadSyncRange().then(setSyncRangeDaysState);
  }, []);

  // 同期範囲変更時に自動リフレッシュ（初回マウント時はスキップ）
  const syncRangeMountedRef = useRef(false);
  useEffect(() => {
    if (!syncRangeMountedRef.current) { syncRangeMountedRef.current = true; return; }
    if (google.isAuthenticated) refreshEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncRangeDays]);

  const setSyncRangeDays = useCallback(async (days: number) => {
    setSyncRangeDaysState(days);
    await saveSyncRange(days);
  }, []);

  // ビューモードをストレージから復元（なければ settings.defaultView を使用）
  useEffect(() => {
    try {
      const saved = Platform.OS === 'web'
        ? localStorage.getItem('calendar_view_mode')
        : null;
      if (saved && ['week', 'day', 'month'].includes(saved)) {
        setViewMode(saved as ViewMode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (Platform.OS === 'web') localStorage.setItem('calendar_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  const getDateRange = useCallback(
    (date: Date, mode: ViewMode): [Date, Date] => {
      switch (mode) {
        case 'week':
          return [startOfWeek(date, { weekStartsOn: settings.weekStartsOn }), endOfWeek(date, { weekStartsOn: settings.weekStartsOn })];
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

  // 認証後: カレンダーリスト取得 → 取得完了後にイベント再フェッチ
  useEffect(() => {
    if (google.isAuthenticated) {
      google.fetchCalendarList().then(() => {
        refreshEvents();
      });
    }
  }, [google.isAuthenticated]);

  // カレンダーが新たに有効化された時に再フェッチ（無効化は不要）
  const prevSelectedIdsRef = useRef<string>('');
  useEffect(() => {
    if (!google.isAuthenticated || !google.calendarList.length) return;
    const selectedIds = google.calendarList
      .filter(c => c.selected).map(c => c.id).sort().join(',');
    const prev = prevSelectedIdsRef.current;
    prevSelectedIdsRef.current = selectedIds;
    if (!prev) return; // 初回セット時はスキップ（上の fetchCalendarList 後の refreshEvents に任せる）
    const prevSet = new Set(prev.split(','));
    const hasNew = selectedIds.split(',').some(id => id && !prevSet.has(id));
    if (hasNew) refreshEvents();
  }, [google.calendarList]);

  // 選択されているカレンダーのイベントのみ表示する（クライアント側フィルタ）
  // アクティブグループがある場合はそのグループメンバーのみ
  const visibleEvents = useMemo(() => {
    // カレンダーリスト未取得中はイベントを全て非表示（フィルタ不能のため）
    if (!google.calendarList.length) return [];
    let filtered = google.calendarList;
    if (activeGroupId) {
      // グループフィルタ中は selected に関わらずグループメンバーを表示
      filtered = filtered.filter(c => (c.groupIds ?? []).includes(activeGroupId));
    } else {
      // 通常モード: selected=true のカレンダーのみ
      filtered = filtered.filter(c => c.selected);
    }
    const visibleIds = new Set(filtered.map(c => c.id));
    // calendarId が未設定のイベントは表示しない（フィルタバグ防止）
    return google.events.filter(e => e.calendarId && visibleIds.has(e.calendarId));
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
    if (google.isAuthenticated) refreshEvents();
  }, [currentDate, viewMode]);

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
        deleteRecurringEvent: google.deleteRecurringEvent,
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
