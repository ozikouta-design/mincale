import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types';

export function useBookings(hostEmail?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!hostEmail) return;
    setIsLoading(true);
    try {
      // API経由で取得（RLSバイパス）。ローカル開発時はSupabaseに直接フォールバック
      const res = await fetch(`/api/bookings?host_email=${encodeURIComponent(hostEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data || []);
        return;
      }
      // フォールバック: Supabase直接
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('host_email', hostEmail)
        .order('start_time', { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hostEmail]);

  // Realtime subscription
  useEffect(() => {
    if (!hostEmail) return;

    fetchBookings();

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `host_email=eq.${hostEmail}`,
        },
        (payload) => {
          setBookings(prev => [payload.new as Booking, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostEmail, fetchBookings]);

  // 予約を「参加（確定）」にする + Google Calendar にイベント作成
  const confirmBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'confirmed' }),
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
        return true;
      }
      // フォールバック: Supabase直接
      const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
      return true;
    } catch (e) {
      console.error('confirmBooking error:', e);
      return false;
    }
  }, []);

  // 予約を「不参加（キャンセル）」にする
  const declineBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'cancelled' }),
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
        return true;
      }
      // フォールバック: Supabase直接
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      return true;
    } catch (e) {
      console.error('declineBooking error:', e);
      return false;
    }
  }, []);

  // 予約をリストから削除
  const deleteBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        return true;
      }
      // フォールバック: Supabase直接
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      return true;
    } catch (e) {
      console.error('deleteBooking error:', e);
      return false;
    }
  }, []);

  return { bookings, isLoading, refetch: fetchBookings, confirmBooking, declineBooking, deleteBooking };
}
