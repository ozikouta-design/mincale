import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { computeAvailableSlots } from '@/lib/booking-slots';
import { startOfDay, endOfDay, addDays } from 'date-fns';

interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

interface ExistingBooking {
  start_time: string;
  end_time: string;
}

export function useBookingPage(slug: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load profile by slug
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('slug', slug)
          .single();

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
    if (slug) loadProfile();
  }, [slug]);

  // Load existing bookings when profile or date changes
  useEffect(() => {
    async function loadBookings() {
      if (!profile) return;

      const rangeStart = startOfDay(selectedDate).toISOString();
      const rangeEnd = endOfDay(addDays(selectedDate, 14)).toISOString();

      const { data } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('host_email', profile.email)
        .eq('status', 'confirmed')
        .gte('start_time', rangeStart)
        .lte('start_time', rangeEnd);

      setExistingBookings((data as ExistingBooking[]) || []);
    }
    loadBookings();
  }, [profile, selectedDate]);

  // Compute available slots when date or bookings change
  useEffect(() => {
    if (!profile) return;

    const duration = profile.booking_duration || 30;
    const startHour = profile.booking_start_hour || 9;
    const endHour = profile.booking_end_hour || 18;

    const available = computeAvailableSlots(
      selectedDate,
      duration,
      startHour,
      endHour,
      existingBookings,
    );
    setSlots(available);
  }, [profile, selectedDate, existingBookings]);

  const submitBooking = useCallback(async (
    slot: BookingSlot,
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

      // Remove the booked slot from available
      setSlots(prev => prev.filter(
        s => s.startTime.getTime() !== slot.startTime.getTime(),
      ));
      return true;
    } catch (e) {
      console.error('Booking failed:', e);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [profile]);

  return {
    profile,
    isLoading,
    error,
    selectedDate,
    setSelectedDate,
    slots,
    isSubmitting,
    submitBooking,
  };
}
