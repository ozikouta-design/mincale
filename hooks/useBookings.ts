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

  return { bookings, isLoading, refetch: fetchBookings };
}
