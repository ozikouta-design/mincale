import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { CalendarEvent, EventFormData, UserProfile, ViewMode, GoogleCalendarInfo, CalendarGroup } from '@/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAppSettings } from '@/context/AppSettingsContext';
import { supabase } from '@/lib/supabase';
import { CalendarAuthContext, AuthContextType } from './CalendarAuthContext';
import { CalendarEventsContext, EventsContextType } from './CalendarEventsContext';
import { CalendarUIContext, UIContextType } from './CalendarUIContext';
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

/** 後方互換用: Auth + Events + UI を統合した型 */
type CalendarContextType = AuthContextType & EventsContextType & UIContextType;

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

  // 表示対象カレンダーIDのSetをメモ化（calendarListやactiveGroupId変更時のみ再計算）
  const visibleIds = useMemo(() => {
    if (!google.calendarList.length) return new Set<string>();
    const filtered = activeGroupId
      ? google.calendarList.filter(c => (c.groupIds ?? []).includes(activeGroupId))
      : google.calendarList.filter(c => c.selected);
    return new Set(filtered.map(c => c.id));
  }, [google.calendarList, activeGroupId]);

  // 表示イベントのフィルタ（visibleIds が変わらなければ再計算しない）
  const visibleEvents = useMemo(() => {
    if (!visibleIds.size) return [];
    return google.events.filter(e => e.calendarId && visibleIds.has(e.calendarId));
  }, [google.events, visibleIds]);

  // Load profile when authenticated and email is available
  useEffect(() => {
    if (google.isAuthenticated && google.userEmail) {
      userProfileHook.loadProfile(google.userEmail);
    }
  }, [google.isAuthenticated, google.userEmail]);

  // Sync Google Calendar events to Supabase for public booking page
  // 選択中（表示ON）のカレンダーのみ同期し、非表示カレンダーの予定は削除する
  useEffect(() => {
    if (!google.userEmail || !google.calendarList.length) return;
    const selectedIds = new Set(
      google.calendarList.filter(c => c.selected).map(c => c.id)
    );
    const syncRows = google.events
      .filter(e => e.calendarId && selectedIds.has(e.calendarId))
      .map(e => ({
        event_id: e.id,
        host_email: google.userEmail!,
        start_time: e.startTime.toISOString(),
        end_time: e.endTime.toISOString(),
        is_all_day: e.isAllDay,
        updated_at: new Date().toISOString(),
      }));
    const deleteIds = google.events
      .filter(e => e.calendarId && !selectedIds.has(e.calendarId))
      .map(e => e.id);
    (async () => {
      if (syncRows.length > 0) {
        const { error } = await supabase
          .from('host_busy_slots')
          .upsert(syncRows, { onConflict: 'event_id,host_email' });
        if (error) console.error('host_busy_slots upsert error:', error);
      }
      if (deleteIds.length > 0) {
        const { error } = await supabase
          .from('host_busy_slots')
          .delete()
          .eq('host_email', google.userEmail!)
          .in('event_id', deleteIds);
        if (error) console.error('host_busy_slots delete error:', error);
      }
    })();
  }, [google.events, google.calendarList, google.userEmail]);

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

  const authValue: AuthContextType = {
    isAuthenticated: google.isAuthenticated,
    userEmail: google.userEmail,
    profile: userProfileHook.profile,
    signIn: google.signIn,
    signOut: google.signOut,
    saveProfile: userProfileHook.saveProfile,
  };

  const eventsValue: EventsContextType = {
    events: visibleEvents,
    isLoading: google.isLoading,
    refreshEvents,
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
  };

  const uiValue: UIContextType = {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    goNext,
    goPrev,
    goToday,
    activeGroupId,
    setActiveGroupId,
    syncRangeDays,
    setSyncRangeDays,
  };

  // 後方互換用: 全フィールドをマージして提供
  const combinedValue: CalendarContextType = { ...authValue, ...eventsValue, ...uiValue };

  return (
    <CalendarAuthContext.Provider value={authValue}>
      <CalendarEventsContext.Provider value={eventsValue}>
        <CalendarUIContext.Provider value={uiValue}>
          <CalendarContext.Provider value={combinedValue}>
            {children}
          </CalendarContext.Provider>
        </CalendarUIContext.Provider>
      </CalendarEventsContext.Provider>
    </CalendarAuthContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}
