import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAppSettings } from '@/context/AppSettingsContext';

/**
 * 予約通知フック（Web PWA 専用 / Notification API）
 * - 新規予約が入ったとき
 * - 予約ステータスが変わったとき（confirmed / declined）
 */
export function useBookingNotifications(hostEmail: string | null) {
  const { settings } = useAppSettings();
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!hostEmail) return;
    if (!settings.notificationsEnabled) return;

    // 通知権限をリクエスト（初回のみ）
    if (!permissionRequestedRef.current && Notification.permission === 'default') {
      permissionRequestedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const send = (title: string, body: string, tag: string) => {
      if (Notification.permission !== 'granted') return;
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/favicon-32.png',
          tag,
        });
      } catch (e) {
        console.warn('Notification failed:', e);
      }
    };

    const formatTime = (isoStr: string) =>
      new Date(isoStr).toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const channel = supabase
      .channel(`booking-notify-${hostEmail}`)
      // 新規予約
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: `host_email=eq.${hostEmail}`,
      }, (payload: any) => {
        if (!settings.notifyNewBooking) return;
        const b = payload.new as any;
        if (!b) return;
        const time = b.start_time ? `  ${formatTime(b.start_time)}` : '';
        send(
          '📅 新しい予約が入りました！',
          `${b.guest_name ?? ''}さん${time}`,
          `booking-new-${b.id}`,
        );
      })
      // ステータス変更（確定 / キャンセル）
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `host_email=eq.${hostEmail}`,
      }, (payload: any) => {
        if (!settings.notifyBookingStatus) return;
        const b = payload.new as any;
        const prev = payload.old as any;
        if (!b || b.status === prev?.status) return;
        const time = b.start_time ? `  ${formatTime(b.start_time)}` : '';
        if (b.status === 'confirmed') {
          send('✅ 予約が確定しました', `${b.guest_name ?? ''}さん${time}`, `booking-status-${b.id}`);
        } else if (b.status === 'declined' || b.status === 'cancelled') {
          send('❌ 予約がキャンセルされました', `${b.guest_name ?? ''}さん${time}`, `booking-status-${b.id}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostEmail, settings.notificationsEnabled, settings.notifyNewBooking, settings.notifyBookingStatus]);
}
