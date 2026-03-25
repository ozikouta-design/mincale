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
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile, isLoading, error, grid, isSubmitting, submitBooking } = useBookingPage(slug || '');
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
      {/* Host info */}
      <View style={styles.hostInfo}>
        <Text style={styles.hostName}>{profile.name || profile.email}</Text>
        <View style={styles.durationBadge}>
          <Clock size={13} color="#4285F4" />
          <Text style={styles.durationText}>{profile.booking_duration || 30}分</Text>
        </View>
      </View>

      {selectedSlot ? (
        /* Phase 2: Booking form */
        <ScrollView style={styles.formContainer}>
          <View style={styles.selectedSlotBanner}>
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
        <>
          <Text style={styles.sectionLabel}>日時を選択してください</Text>
          <AvailabilityGrid
            grid={grid}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </>
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
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8ecf4',
  },
  hostName: { fontSize: 17, fontWeight: '700', color: '#333' },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0f7ff', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
  },
  durationText: { fontSize: 13, color: '#4285F4', fontWeight: '600' },
  sectionLabel: {
    fontSize: 13, color: '#888', fontWeight: '500',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  formContainer: { flex: 1 },
  selectedSlotBanner: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d0e3ff',
  },
  selectedSlotText: { fontSize: 15, fontWeight: '600', color: '#4285F4', textAlign: 'center' },
  completeTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20 },
  completeSubtext: {
    fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginTop: 12,
  },
});
