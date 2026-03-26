import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * 新規予約が入った時にブラウザ通知を送る（Web PWA 専用）
 * - Supabase Realtime で bookings テーブルを監視
 * - INSERT イベント発生時に Notification API でプッシュ通知
 */
export function useBookingNotifications(hostEmail: string | null) {
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!hostEmail) return;

    // 通知権限をリクエスト（初回のみ）
    if (!permissionRequestedRef.current && Notification.permission === 'default') {
      permissionRequestedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }

    // Supabase Realtime: bookings テーブルの INSERT を監視
    const channel = supabase
      .channel(`booking-notify-${hostEmail}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `host_email=eq.${hostEmail}`,
        },
        (payload: any) => {
          const booking = payload.new as any;
          if (!booking) return;

          if (Notification.permission === 'granted') {
            const startDate = booking.start_time
              ? new Date(booking.start_time).toLocaleString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            try {
              new Notification('📅 新しい予約が入りました！', {
                body: `${booking.guest_name ?? ''}さん${startDate ? `  ${startDate}` : ''}`,
                icon: '/icons/icon-192.png',
                badge: '/icons/favicon-32.png',
                tag: `booking-${booking.id}`,
              });
            } catch (e) {
              console.warn('Notification failed:', e);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostEmail]);
}
