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

      const startDate = startOfDay(new Date());
      const endDate = endOfDay(addDays(startDate, 14));

      const [{ data: googleBusy }, { data: bookingsBusy }] = await Promise.all([
        supabase
          .from('host_busy_slots')
          .select('start_time, end_time')
          .eq('host_email', profile.email)
          .gte('end_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString()),
        supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('host_email', profile.email)
          .eq('status', 'confirmed')
          .gte('end_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString()),
      ]);

      const allBusy = [...(googleBusy ?? []), ...(bookingsBusy ?? [])];
      const duration = profile.booking_duration || 30;
      const startHour = profile.booking_start_hour || 9;
      const endHour = profile.booking_end_hour || 18;

      setGrid(computeAvailabilityGrid(startDate, duration, startHour, endHour, allBusy));
    }
    loadBusy();
  }, [profile]);

  const submitBooking = useCallback(async (
    slot: SlotCell,
    guestName: string,
    guestEmail: string,
    guestMemo: string,
    meetingType: string,
  ): Promise<boolean> => {
    if (!profile) return false;
    setIsSubmitting(true);
    try {
      const { error: err } = await supabase.from('bookings').insert({
        host_email: profile.email,
        guest_name: guestName,
        guest_email: guestEmail || null,
        guest_memo: guestMemo || null,
        meeting_type: meetingType,
        start_time: slot.startTime.toISOString(),
        end_time: slot.endTime.toISOString(),
        status: 'confirmed',
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
