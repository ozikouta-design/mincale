import { useState, useCallback, useEffect, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CalendarEvent, EventFormData, GoogleCalendarInfo, CalendarGroup } from '@/types';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';

// Platform-aware key-value storage
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const USER_EMAIL_KEY = 'google_user_email';
const CALENDAR_LIST_KEY = 'google_calendar_list';
const CALENDAR_GROUPS_KEY = 'google_calendar_groups';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Generate PKCE code_verifier and code_challenge using Web Crypto API
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

export function useGoogleCalendar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendarList, setCalendarList] = useState<GoogleCalendarInfo[]>([]);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const calendarListRef = useRef<GoogleCalendarInfo[]>([]);
  const calendarGroupsRef = useRef<CalendarGroup[]>([]);
  const userEmailRef = useRef<string | null>(null);
  useEffect(() => { calendarListRef.current = calendarList; }, [calendarList]);
  useEffect(() => { calendarGroupsRef.current = calendarGroups; }, [calendarGroups]);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  // Expo Go では auth.expo.io プロキシを直接指定（useProxy は SDK54で削除済み）
  const isExpoGo = Constants.appOwnership === 'expo';
  const redirectUri = isExpoGo
    ? 'https://auth.expo.io/@ozikouta-design/calendar'  // Expo Go: Google Console URI 5
    : AuthSession.makeRedirectUri({ scheme: 'calendar' });  // standalone ビルド

  // Native uses expo-auth-session hooks
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );

  // Web: handle OAuth redirect callback (runs after Google redirects back)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
    if (!codeVerifier) return;
    sessionStorage.removeItem('oauth_code_verifier');

    const storedRedirectUri = sessionStorage.getItem('oauth_redirect_uri') || redirectUri;
    sessionStorage.removeItem('oauth_redirect_uri');

    (async () => {
      try {
        const response = await fetch('/api/auth/google-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: storedRedirectUri,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          console.error('Token exchange failed:', err);
          return;
        }

        const tokens = await response.json();
        if (!tokens.access_token) return;

        await storage.setItem(TOKEN_KEY, tokens.access_token);
        if (tokens.refresh_token) {
          await storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
        }

        // Fetch user email
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.email) {
              await storage.setItem(USER_EMAIL_KEY, userData.email);
              setUserEmail(userData.email);
              // Save refresh token to Supabase for server-side calendar sync (via API to bypass RLS)
              if (tokens.refresh_token) {
                fetch('/api/save-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: userData.email, refresh_token: tokens.refresh_token }),
                }).then(r => { if (!r.ok) console.error('save-token API error:', r.status); });
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch user info:', e);
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('OAuth callback error:', error);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return storage.getItem(TOKEN_KEY);
  }, []);

  const fetchCalendarList = useCallback(async (): Promise<GoogleCalendarInfo[]> => {
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) return [];
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list: GoogleCalendarInfo[] = (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary || item.id,
        backgroundColor: item.backgroundColor || '#4285F4',
        primary: !!item.primary,
        selected: true,
      }));

      // 保存済みの表示設定・グループ割り当てを復元
      // 優先度: Supabase (アカウント依存) > localStorage (デバイス依存)
      let savedStates: Record<string, { selected: boolean; groupIds?: string[] }> = {};
      let savedGroups: CalendarGroup[] = [];

      const email = userEmailRef.current;
      if (email) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('calendar_settings')
            .eq('email', email)
            .single();
          const settings = data?.calendar_settings as any;
          if (settings?.states) savedStates = settings.states;
          if (settings?.groups) savedGroups = settings.groups;
        } catch {}
      }
      // Supabase にデータがなければ localStorage をフォールバック
      if (!Object.keys(savedStates).length) {
        const stored = await storage.getItem(CALENDAR_LIST_KEY);
        if (stored) {
          try { savedStates = JSON.parse(stored); } catch {}
        }
      }
      if (!savedGroups.length) {
        const storedGroups = await storage.getItem(CALENDAR_GROUPS_KEY);
        if (storedGroups) {
          try { savedGroups = JSON.parse(storedGroups); } catch {}
        }
      }

      const merged = list.map(c => ({
        ...c,
        selected: savedStates[c.id]?.selected !== undefined ? savedStates[c.id].selected : true,
        groupIds: savedStates[c.id]?.groupIds ?? [],
      }));

      // ref を即時更新（fetchEvents が calendarListRef を使うため）
      calendarListRef.current = merged;
      setCalendarList(merged);
      calendarGroupsRef.current = savedGroups;
      setCalendarGroups(savedGroups);

      return merged;
    } catch (e) {
      console.error('fetchCalendarList error:', e);
      return [];
    }
  }, []);

  // calendar_settings（グループ+状態）を Supabase と localStorage に保存するヘルパー
  const saveCalendarSettings = useCallback((
    groups: CalendarGroup[],
    list: GoogleCalendarInfo[],
  ) => {
    const states: Record<string, { selected: boolean; groupIds?: string[] }> = {};
    list.forEach(c => { states[c.id] = { selected: c.selected, groupIds: c.groupIds }; });
    // localStorage（フォールバック）
    storage.setItem(CALENDAR_LIST_KEY, JSON.stringify(states));
    storage.setItem(CALENDAR_GROUPS_KEY, JSON.stringify(groups));
    // Supabase（アカウント依存）
    const email = userEmailRef.current;
    if (email) {
      supabase.from('user_profiles')
        .update({ calendar_settings: { groups, states }, updated_at: new Date().toISOString() })
        .eq('email', email)
        .then(({ error }) => { if (error) console.error('calendar_settings save error:', error); });
    }
  }, []);

  // 後方互換用エイリアス（calendarList のみ更新時）
  const saveCalendarListState = useCallback((list: GoogleCalendarInfo[]) => {
    saveCalendarSettings(calendarGroupsRef.current, list);
  }, [saveCalendarSettings]);

  const toggleCalendarVisibility = useCallback(async (calendarId: string) => {
    const newList = calendarListRef.current.map(c =>
      c.id === calendarId ? { ...c, selected: !c.selected } : c,
    );
    calendarListRef.current = newList;
    setCalendarList(newList);
    saveCalendarSettings(calendarGroupsRef.current, newList);
  }, [saveCalendarSettings]);

  // ── グループ管理 ──────────────────────────────────────

  // 新しいカレンダーグループを作成する（初期カレンダーIDも指定可能）
  const createCalendarGroup = useCallback(async (name: string, calendarIds: string[] = []): Promise<CalendarGroup> => {
    const newGroup: CalendarGroup = { id: `group_${Date.now()}`, name };
    const newGroups = [...calendarGroupsRef.current, newGroup];
    const newList = calendarIds.length > 0
      ? calendarListRef.current.map(c =>
          calendarIds.includes(c.id)
            ? { ...c, groupIds: [...new Set([...(c.groupIds ?? []), newGroup.id])] }
            : c,
        )
      : calendarListRef.current;
    calendarGroupsRef.current = newGroups;
    setCalendarGroups(newGroups);
    if (calendarIds.length > 0) {
      calendarListRef.current = newList;
      setCalendarList(newList);
    }
    saveCalendarSettings(newGroups, newList);
    return newGroup;
  }, [saveCalendarSettings]);

  // カレンダーグループを削除し、所属カレンダーのグループIDをクリアする
  const deleteCalendarGroup = useCallback(async (groupId: string) => {
    const newGroups = calendarGroupsRef.current.filter(g => g.id !== groupId);
    const newList = calendarListRef.current.map(c => ({
      ...c,
      groupIds: (c.groupIds ?? []).filter(id => id !== groupId),
    }));
    calendarGroupsRef.current = newGroups;
    setCalendarGroups(newGroups);
    calendarListRef.current = newList;
    setCalendarList(newList);
    saveCalendarSettings(newGroups, newList);
  }, [saveCalendarSettings]);

  // カレンダーをグループに追加/削除する（groupId=nullで全グループから外す）
  const moveCalendarToGroup = useCallback(async (calendarId: string, groupId: string | null) => {
    const newList = calendarListRef.current.map(c => {
      if (c.id !== calendarId) return c;
      if (groupId === null) return { ...c, groupIds: [] };
      const current = c.groupIds ?? [];
      const already = current.includes(groupId);
      return { ...c, groupIds: already ? current.filter(id => id !== groupId) : [...current, groupId] };
    });
    calendarListRef.current = newList;
    setCalendarList(newList);
    saveCalendarSettings(calendarGroupsRef.current, newList);
  }, [saveCalendarSettings]);

  // グループのメンバーを一括ON/OFFする（グループスイッチ用）
  const setGroupVisibility = useCallback(async (calendarIds: string[], selected: boolean) => {
    const newList = calendarListRef.current.map(c =>
      calendarIds.includes(c.id) ? { ...c, selected } : c,
    );
    calendarListRef.current = newList;
    setCalendarList(newList);
    saveCalendarSettings(calendarGroupsRef.current, newList);
  }, [saveCalendarSettings]);

  // グループ名とカレンダーメンバーを更新する（編集用）
  const updateCalendarGroup = useCallback(async (groupId: string, name: string, calendarIds: string[]) => {
    const newGroups = calendarGroupsRef.current.map(g => g.id === groupId ? { ...g, name } : g);
    const newList = calendarListRef.current.map(c => {
      const current = c.groupIds ?? [];
      if (calendarIds.includes(c.id)) {
        return { ...c, groupIds: [...new Set([...current, groupId])] };
      } else if (current.includes(groupId)) {
        return { ...c, groupIds: current.filter(id => id !== groupId) };
      }
      return c;
    });
    calendarGroupsRef.current = newGroups;
    setCalendarGroups(newGroups);
    calendarListRef.current = newList;
    setCalendarList(newList);
    saveCalendarSettings(newGroups, newList);
  }, [saveCalendarSettings]);

  const signIn = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web: redirect-based OAuth (no popup, avoids COOP issues)
      try {
        const { codeVerifier, codeChallenge } = await generatePKCE();
        sessionStorage.setItem('oauth_code_verifier', codeVerifier);
        sessionStorage.setItem('oauth_redirect_uri', redirectUri);

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', SCOPES.join(' '));
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        window.location.href = authUrl.toString();
      } catch (error) {
        console.error('Google sign-in error:', error);
      }
      return;
    }

    // Native: existing expo-auth-session popup/redirect flow
    try {
      const result = await promptAsync();
      if (result?.type === 'success' && result.params?.code) {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: GOOGLE_CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: { code_verifier: request?.codeVerifier || '' },
          },
          discovery,
        );

        if (tokenResponse.accessToken) {
          await storage.setItem(TOKEN_KEY, tokenResponse.accessToken);
          if (tokenResponse.refreshToken) {
            await storage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refreshToken);
          }
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.email) {
                await storage.setItem(USER_EMAIL_KEY, userData.email);
                setUserEmail(userData.email);
                if (tokenResponse.refreshToken) {
                  fetch('/api/save-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userData.email, refresh_token: tokenResponse.refreshToken }),
                  }).then(r => { if (!r.ok) console.error('save-token API error:', r.status); });
                }
              }
            }
          } catch (e) {
            console.error('Failed to fetch user info:', e);
          }
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  }, [promptAsync, redirectUri, request]);

  const signOut = useCallback(async () => {
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_EMAIL_KEY);
    setIsAuthenticated(false);
    setUserEmail(null);
    setEvents([]);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const token = await storage.getItem(TOKEN_KEY);
    const email = await storage.getItem(USER_EMAIL_KEY);
    setIsAuthenticated(!!token);
    setUserEmail(email);
    return !!token;
  }, []);

  const fetchEvents = useCallback(async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { setIsLoading(false); return []; }

      const timeMin = startOfDay(startDate).toISOString();
      const timeMax = endOfDay(endDate).toISOString();

      // Use calendarListRef to avoid stale closure & re-render cascades
      const currentList = calendarListRef.current;
      const calIds = currentList.filter(c => c.selected).map(c => c.id);
      if (calIds.length === 0) calIds.push('primary');

      const results = await Promise.all(
        calIds.map(async calId => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) {
            if (res.status === 401) { setIsAuthenticated(false); await storage.removeItem(TOKEN_KEY); }
            return [];
          }
          const data = await res.json();
          return (data.items || []).map((item: any) => ({ ...item, _calendarId: calId })) as any[];
        }),
      );

      const calColorMap: Record<string, string> = {};
      currentList.forEach(c => { calColorMap[c.id] = c.backgroundColor; });

      const mapped: CalendarEvent[] = results.flat()
        .filter((item: any) => item.status !== 'cancelled')
        .map((item: any) => {
          const isAllDay = !!item.start?.date;
          return {
            id: item.id,
            title: item.summary || '(タイトルなし)',
            startTime: isAllDay ? startOfDay(parseISO(item.start.date)) : parseISO(item.start.dateTime),
            endTime: isAllDay ? endOfDay(subDays(parseISO(item.end.date), 1)) : parseISO(item.end.dateTime),
            isAllDay,
            colorHex: item.colorId ? getColorById(item.colorId) : (calColorMap[item._calendarId] || '#4285F4'),
            location: item.location,
            description: item.description,
            calendarId: item._calendarId,
          };
        });

      setEvents(mapped);
      setIsLoading(false);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setIsLoading(false);
      return [];
    }
  }, [getAccessToken]);

  const createEvent = useCallback(async (data: EventFormData): Promise<CalendarEvent | null> => {
    try {
      const token = await getAccessToken();
      if (!token) return null;

      const calId = data.calendarId || 'primary';
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = data.isAllDay
        ? { summary: data.title, start: { date: data.startTime.toISOString().split('T')[0] }, end: { date: data.endTime.toISOString().split('T')[0] }, location: data.location || undefined, description: data.description || undefined }
        : { summary: data.title, start: { dateTime: data.startTime.toISOString(), timeZone }, end: { dateTime: data.endTime.toISOString(), timeZone }, location: data.location || undefined, description: data.description || undefined };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 401) { setIsAuthenticated(false); await storage.removeItem(TOKEN_KEY); }
        return null;
      }

      const item = await res.json();
      return { id: item.id, title: item.summary || data.title, startTime: data.startTime, endTime: data.endTime, isAllDay: data.isAllDay, colorHex: '#4285F4', location: data.location, description: data.description };
    } catch (error) {
      console.error('Failed to create event:', error);
      return null;
    }
  }, [getAccessToken]);

  const updateEvent = useCallback(async (eventId: string, data: EventFormData, calendarId?: string): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const calId = calendarId || data.calendarId || 'primary';
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = data.isAllDay
        ? { summary: data.title, start: { date: data.startTime.toISOString().split('T')[0] }, end: { date: data.endTime.toISOString().split('T')[0] }, location: data.location || undefined, description: data.description || undefined }
        : { summary: data.title, start: { dateTime: data.startTime.toISOString(), timeZone }, end: { dateTime: data.endTime.toISOString(), timeZone }, location: data.location || undefined, description: data.description || undefined };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 401) { setIsAuthenticated(false); await storage.removeItem(TOKEN_KEY); }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to update event:', error);
      return false;
    }
  }, [getAccessToken]);

  const deleteEvent = useCallback(async (eventId: string, calendarId?: string): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const calId = calendarId || 'primary';
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 410) {
        if (res.status === 401) { setIsAuthenticated(false); await storage.removeItem(TOKEN_KEY); }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to delete event:', error);
      return false;
    }
  }, [getAccessToken]);

  return {
    isAuthenticated,
    isLoading,
    events,
    userEmail,
    calendarList,
    calendarGroups,
    signIn,
    signOut,
    checkAuthStatus,
    fetchEvents,
    fetchCalendarList,
    toggleCalendarVisibility,
    createCalendarGroup,
    updateCalendarGroup,
    deleteCalendarGroup,
    moveCalendarToGroup,
    setGroupVisibility,
    createEvent,
    updateEvent,
    deleteEvent,
    request,
  };
}

function getColorById(colorId: string): string {
  const colors: Record<string, string> = {
    '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
    '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
    '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
  };
  return colors[colorId] || '#4285F4';
}
