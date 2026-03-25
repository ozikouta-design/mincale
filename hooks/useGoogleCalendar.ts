import { useState, useCallback, useEffect, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
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
  useEffect(() => { calendarListRef.current = calendarList; }, [calendarList]);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'calendar' });

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
              // Save refresh token to Supabase for server-side calendar sync
              if (tokens.refresh_token) {
                supabase.from('host_tokens').upsert(
                  { email: userData.email, google_refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() },
                  { onConflict: 'email' },
                ).then(({ error }) => { if (error) console.error('host_tokens save error:', error); });
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
      const stored = await storage.getItem(CALENDAR_LIST_KEY);
      let merged = list;
      if (stored) {
        try {
          const saved: Record<string, { selected: boolean; groupId?: string }> = JSON.parse(stored);
          merged = list.map(c => ({
            ...c,
            selected: saved[c.id]?.selected !== undefined ? saved[c.id].selected : true,
            groupId: saved[c.id]?.groupId,
          }));
        } catch {}
      }
      setCalendarList(merged);

      // グループ一覧も復元
      const storedGroups = await storage.getItem(CALENDAR_GROUPS_KEY);
      if (storedGroups) {
        try { setCalendarGroups(JSON.parse(storedGroups)); } catch {}
      }

      return merged;
    } catch (e) {
      console.error('fetchCalendarList error:', e);
      return [];
    }
  }, []);

  // カレンダーリストの状態（表示設定・グループ）をストレージに保存するヘルパー
  const saveCalendarListState = useCallback((list: GoogleCalendarInfo[]) => {
    const saved: Record<string, { selected: boolean; groupId?: string }> = {};
    list.forEach(c => { saved[c.id] = { selected: c.selected, groupId: c.groupId }; });
    storage.setItem(CALENDAR_LIST_KEY, JSON.stringify(saved));
  }, []);

  const toggleCalendarVisibility = useCallback(async (calendarId: string) => {
    setCalendarList(prev => {
      const updated = prev.map(c =>
        c.id === calendarId ? { ...c, selected: !c.selected } : c,
      );
      saveCalendarListState(updated);
      return updated;
    });
  }, [saveCalendarListState]);

  // ── グループ管理 ──────────────────────────────────────

  // 新しいカレンダーグループを作成する
  const createCalendarGroup = useCallback(async (name: string): Promise<CalendarGroup> => {
    const newGroup: CalendarGroup = { id: `group_${Date.now()}`, name };
    setCalendarGroups(prev => {
      const updated = [...prev, newGroup];
      storage.setItem(CALENDAR_GROUPS_KEY, JSON.stringify(updated));
      return updated;
    });
    return newGroup;
  }, []);

  // カレンダーグループを削除し、所属カレンダーのグループIDをクリアする
  const deleteCalendarGroup = useCallback(async (groupId: string) => {
    setCalendarGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId);
      storage.setItem(CALENDAR_GROUPS_KEY, JSON.stringify(updated));
      return updated;
    });
    setCalendarList(prev => {
      const updated = prev.map(c =>
        c.groupId === groupId ? { ...c, groupId: undefined } : c,
      );
      saveCalendarListState(updated);
      return updated;
    });
  }, [saveCalendarListState]);

  // カレンダーをグループに割り当てる（groupId=nullで未分類に戻す）
  const moveCalendarToGroup = useCallback(async (calendarId: string, groupId: string | null) => {
    setCalendarList(prev => {
      const updated = prev.map(c =>
        c.id === calendarId ? { ...c, groupId: groupId ?? undefined } : c,
      );
      saveCalendarListState(updated);
      return updated;
    });
  }, [saveCalendarListState]);

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
                  supabase.from('host_tokens').upsert(
                    { email: userData.email, google_refresh_token: tokenResponse.refreshToken, updated_at: new Date().toISOString() },
                    { onConflict: 'email' },
                  ).then(({ error }) => { if (error) console.error('host_tokens save error:', error); });
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

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = data.isAllDay
        ? { summary: data.title, start: { date: data.startTime.toISOString().split('T')[0] }, end: { date: data.endTime.toISOString().split('T')[0] }, location: data.location || undefined, description: data.description || undefined }
        : { summary: data.title, start: { dateTime: data.startTime.toISOString(), timeZone }, end: { dateTime: data.endTime.toISOString(), timeZone }, location: data.location || undefined, description: data.description || undefined };

      const res = await fetch(CALENDAR_API, {
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

  const updateEvent = useCallback(async (eventId: string, data: EventFormData): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = data.isAllDay
        ? { summary: data.title, start: { date: data.startTime.toISOString().split('T')[0] }, end: { date: data.endTime.toISOString().split('T')[0] }, location: data.location || undefined, description: data.description || undefined }
        : { summary: data.title, start: { dateTime: data.startTime.toISOString(), timeZone }, end: { dateTime: data.endTime.toISOString(), timeZone }, location: data.location || undefined, description: data.description || undefined };

      const res = await fetch(`${CALENDAR_API}/${eventId}`, {
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

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const res = await fetch(`${CALENDAR_API}/${eventId}`, {
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
    deleteCalendarGroup,
    moveCalendarToGroup,
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
