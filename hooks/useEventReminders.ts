import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { CalendarEvent } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';

/**
 * 予定開始N分前にブラウザ通知を送るフック（Web PWA 専用）
 * - events が更新されるたびに今後の予定を評価しタイマーをセット
 * - 既に通知済みの予定は重複送信しない
 */
export function useEventReminders(events: CalendarEvent[]) {
  const { settings } = useAppSettings();
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!settings.notificationsEnabled) return;

    // 既存タイマーをすべてクリア
    timerRefs.current.forEach(t => clearTimeout(t));
    timerRefs.current.clear();

    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24時間以内の予定のみ対象
    const offsetMs = settings.reminderMinutesBefore * 60 * 1000;

    events.forEach(event => {
      if (event.isAllDay) return;
      const fireAt = event.startTime.getTime() - offsetMs;
      if (fireAt <= now) return; // 過去またはすぐ
      if (fireAt - now > windowMs) return; // 24時間以上先はスキップ

      const timerKey = `${event.id}-${settings.reminderMinutesBefore}`;
      if (notifiedRef.current.has(timerKey)) return;

      const delay = fireAt - now;
      const timer = setTimeout(() => {
        notifiedRef.current.add(timerKey);
        if (Notification.permission !== 'granted') return;
        if (!settings.notificationsEnabled) return;
        try {
          new Notification(`⏰ ${settings.reminderMinutesBefore}分後に予定があります`, {
            body: event.title,
            icon: '/icons/icon-192.png',
            badge: '/icons/favicon-32.png',
            tag: `reminder-${event.id}`,
          });
        } catch (e) {
          console.warn('Reminder notification failed:', e);
        }
      }, delay);

      timerRefs.current.set(timerKey, timer);
    });

    return () => {
      timerRefs.current.forEach(t => clearTimeout(t));
      timerRefs.current.clear();
    };
  }, [events, settings.notificationsEnabled, settings.reminderMinutesBefore]);
}
