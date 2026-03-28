import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { computeAvailabilityGrid, DaySlots, SlotCell } from '@/lib/booking-slots';
import { startOfDay, endOfDay, addDays } from 'date-fns';

export function useBookingPage(slug: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<DaySlots[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!slug) return;
      setIsLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (err || !data) {
          setError('予約ページが見つかりません');
          return;
        }
        setProfile(data as UserProfile);
      } catch {
        setError('読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [slug]);

  useEffect(() => {
    async function loadBusy() {
      if (!profile) return;

      // サーバーサイドで Google Calendar を同期（ログイン不要）
      try {
        await fetch(`/api/sync-calendar?slug=${encodeURIComponent(slug)}`);
      } catch {
        // 同期失敗しても続行（既存データで表示）
      }

      const startDate = startOfDay(new Date());
      const endDate = endOfDay(addDays(startDate, 14));

      let busyQuery = supabase
        .from('host_busy_slots')
        .select('start_time, end_time')
        .eq('host_email', profile.email)
        .gte('end_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (!profile.block_all_day_events) {
        busyQuery = busyQuery.eq('is_all_day', false);
      }

      const [{ data: googleBusy }, { data: bookingsBusy }] = await Promise.all([
        busyQuery,
        supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('host_email', profile.email)
          .in('status', ['confirmed', 'pending'])
          .gte('end_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString()),
      ]);

      const allBusy = [...(googleBusy ?? []), ...(bookingsBusy ?? [])];
      const duration = profile.booking_duration || 30;
      const startHour = profile.booking_start_hour || 9;
      const endHour = profile.booking_end_hour || 18;
      const allowedDays = profile.booking_days && profile.booking_days.length > 0
        ? profile.booking_days
        : undefined;

      setGrid(computeAvailabilityGrid(startDate, duration, startHour, endHour, allBusy, 14, allowedDays));
    }
    loadBusy();
  }, [profile]);

  const submitBooking = useCallback(async (
    slot: SlotCell,
    guestName: string,
    guestPhone: string,
    guestMemo: string,
    meetingType: string,
  ): Promise<boolean> => {
    if (!profile) return false;
    setIsSubmitting(true);
    try {
      const { error: err } = await supabase.from('bookings').insert({
        host_email: profile.email,
        guest_name: guestName,
        guest_phone: guestPhone || null,
        guest_memo: guestMemo || null,
        meeting_type: meetingType,
        start_time: slot.startTime.toISOString(),
        end_time: slot.endTime.toISOString(),
        status: 'pending',
      });
      if (err) throw err;

      setGrid(prev => prev.map(day => ({
        ...day,
        cells: day.cells.map(c =>
          c.startTime.getTime() === slot.startTime.getTime() ? { ...c, available: false } : c
        ),
      })));
      return true;
    } catch (e) {
      console.error('Booking failed:', e);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [profile]);

  return { profile, isLoading, error, grid, isSubmitting, submitBooking };
}
