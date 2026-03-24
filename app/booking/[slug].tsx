import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBookingPage } from '@/hooks/useBookingPage';
import DateSelector from '@/components/booking/DateSelector';
import TimeSlotGrid from '@/components/booking/TimeSlotGrid';
import BookingForm from '@/components/booking/BookingForm';
import { CalendarCheck } from 'lucide-react-native';

interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const {
    profile, isLoading, error,
    selectedDate, setSelectedDate,
    slots, isSubmitting, submitBooking,
  } = useBookingPage(slug || '');

  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
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
          確認メールをお送りします。{'\n'}ありがとうございました。
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Host info */}
      <View style={styles.hostInfo}>
        <Text style={styles.hostName}>{profile.name || profile.email}</Text>
        <Text style={styles.bookingTitle}>
          {profile.booking_title || '予約'}
        </Text>
        <Text style={styles.duration}>
          {profile.booking_duration || 30}分
        </Text>
      </View>

      {selectedSlot ? (
        /* Phase 2: Booking Form */
        <BookingForm
          slot={selectedSlot}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onBack={() => setSelectedSlot(null)}
        />
      ) : (
        /* Phase 1: Date & Slot Selection */
        <>
          <Text style={styles.sectionLabel}>日付を選択</Text>
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <Text style={styles.sectionLabel}>時間を選択</Text>
          <TimeSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
  },
  errorText: { fontSize: 16, color: '#999', textAlign: 'center' },
  hostInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8ecf4',
  },
  hostName: { fontSize: 20, fontWeight: '700', color: '#333' },
  bookingTitle: { fontSize: 15, color: '#666', marginTop: 4 },
  duration: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '500',
    marginTop: 4,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
  },
  completeSubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
});
