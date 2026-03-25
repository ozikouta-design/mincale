import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBookingPage } from '@/hooks/useBookingPage';
import AvailabilityGrid from '@/components/booking/AvailabilityGrid';
import BookingForm from '@/components/booking/BookingForm';
import { CalendarCheck, Clock } from 'lucide-react-native';
import { SlotCell } from '@/lib/booking-slots';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function BookingScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug || '');
  const { profile, isLoading, error, grid, isSubmitting, submitBooking } = useBookingPage(slug);
  const [selectedSlot, setSelectedSlot] = useState<SlotCell | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || '予約ページが見つかりません'}</Text>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={styles.center}>
        <CalendarCheck size={64} color="#34A853" />
        <Text style={styles.completeTitle}>予約が完了しました</Text>
        <Text style={styles.completeSubtext}>
          ありがとうございました。{'\n'}確認メールをお送りします。
        </Text>
      </View>
    );
  }

  const handleSubmit = async (
    guestName: string,
    guestEmail: string,
    guestMemo: string,
    meetingType: string,
  ) => {
    if (!selectedSlot) return;
    const success = await submitBooking(selectedSlot, guestName, guestEmail, guestMemo, meetingType);
    if (success) {
      setIsComplete(true);
    } else {
      Alert.alert('エラー', '予約に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <View style={styles.container}>
      {/* Timezone bar */}
      <View style={styles.tzBar}>
        <Text style={styles.tzDot}>●</Text>
        <Text style={styles.tzText}>タイムゾーン: (GMT+09:00) Asia/Tokyo</Text>
      </View>

      {selectedSlot ? (
        /* Phase 2: Booking form */
        <ScrollView style={styles.formContainer}>
          <View style={styles.selectedSlotBanner}>
            <View style={styles.hostRowSmall}>
              <Text style={styles.hostNameSmall}>{profile.name || profile.email}</Text>
              <View style={styles.durationBadge}>
                <Clock size={12} color="#4285F4" />
                <Text style={styles.durationText}>{profile.booking_duration || 30}分</Text>
              </View>
            </View>
            <Text style={styles.selectedSlotText}>
              {format(selectedSlot.startTime, 'M月d日(EEE) HH:mm', { locale: ja })}
              {' 〜 '}
              {format(selectedSlot.endTime, 'HH:mm')}
            </Text>
          </View>
          <BookingForm
            slot={selectedSlot}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onBack={() => setSelectedSlot(null)}
          />
        </ScrollView>
      ) : (
        /* Phase 1: Availability grid */
        <AvailabilityGrid
          grid={grid}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingHorizontal: 40,
  },
  errorText: { fontSize: 16, color: '#999', textAlign: 'center' },
  tzBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
    backgroundColor: '#fafafa',
  },
  tzDot: { fontSize: 8, color: '#34A853' },
  tzText: { fontSize: 12, color: '#555' },
  formContainer: { flex: 1 },
  selectedSlotBanner: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d0e3ff',
  },
  hostRowSmall: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  hostNameSmall: { fontSize: 14, fontWeight: '600', color: '#444' },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  durationText: { fontSize: 12, color: '#4285F4', fontWeight: '600' },
  selectedSlotText: { fontSize: 15, fontWeight: '700', color: '#4285F4', textAlign: 'center' },
  completeTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20 },
  completeSubtext: {
    fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginTop: 12,
  },
});
