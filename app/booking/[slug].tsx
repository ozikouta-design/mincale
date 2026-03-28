import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBookingPage } from '@/hooks/useBookingPage';
import AvailabilityGrid from '@/components/booking/AvailabilityGrid';
import BookingForm from '@/components/booking/BookingForm';
import { CalendarCheck, Clock, User, Calendar } from 'lucide-react-native';
import { SlotCell } from '@/lib/booking-slots';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function BookingScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug || '');
  const { profile, isLoading, error, grid, isSubmitting, submitBooking } = useBookingPage(slug);
  const [selectedSlot, setSelectedSlot] = useState<SlotCell | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // 予約フォーム表示中にブラウザ/ネイティブの「戻る」を押したとき、
  // ページから離れずスロット選択画面に戻る
  useEffect(() => {
    if (!selectedSlot) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({ bookingPhase: 2 }, '');
      const handler = () => setSelectedSlot(null);
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    }
  }, [selectedSlot]);

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
          ありがとうございました。{'\n'}ご連絡お待ちしております。
        </Text>
      </View>
    );
  }

  const handleSubmit = async (
    guestName: string,
    guestPhone: string,
    guestMemo: string,
    meetingType: string,
  ) => {
    if (!selectedSlot) return;
    const success = await submitBooking(selectedSlot, guestName, guestPhone, guestMemo, meetingType);
    if (success) {
      setIsComplete(true);
    } else {
      Alert.alert('エラー', '予約に失敗しました。もう一度お試しください。');
    }
  };

  const duration = profile.booking_duration || 30;
  const startHour = profile.booking_start_hour || 9;
  const endHour = profile.booking_end_hour || 18;

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
                <Text style={styles.durationText}>{duration}分</Text>
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
        /* Phase 1: Host info + Availability grid */
        <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={true}>
          {/* ホスト情報 & 案内 */}
          <View style={styles.hostCard}>
            <View style={styles.hostRow}>
              <View style={styles.hostAvatar}>
                <User size={24} color="#4285F4" />
              </View>
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{profile.name || profile.email}</Text>
                <View style={styles.hostMeta}>
                  <Clock size={13} color="#888" />
                  <Text style={styles.hostMetaText}>{duration}分間の予約</Text>
                  <Text style={styles.hostMetaDot}>·</Text>
                  <Calendar size={13} color="#888" />
                  <Text style={styles.hostMetaText}>{startHour}:00〜{endHour}:00</Text>
                </View>
              </View>
            </View>
            <View style={styles.guideBox}>
              <Text style={styles.guideTitle}>ご予約方法</Text>
              <Text style={styles.guideText}>
                1. ご希望の日時を下のカレンダーから選んでください{'\n'}
                2. お名前・電話番号を入力して「予約する」を押してください{'\n'}
                3. 担当者より折り返しご連絡いたします
              </Text>
            </View>
          </View>

          <Text style={styles.gridTitle}>空き時間を選択</Text>
          <AvailabilityGrid
            grid={grid}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
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

  /* Phase 1 */
  gridScroll: { flex: 1 },
  hostCard: {
    margin: 16,
    backgroundColor: '#f8fbff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d0e3ff',
  },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  hostAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#e8f0fe',
    alignItems: 'center', justifyContent: 'center',
  },
  hostInfo: { flex: 1 },
  hostName: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 4 },
  hostMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  hostMetaText: { fontSize: 12, color: '#666' },
  hostMetaDot: { fontSize: 12, color: '#ccc' },
  guideBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0ecff',
  },
  guideTitle: { fontSize: 13, fontWeight: '700', color: '#4285F4', marginBottom: 8 },
  guideText: { fontSize: 13, color: '#555', lineHeight: 22 },
  gridTitle: {
    fontSize: 13, fontWeight: '700', color: '#888',
    paddingHorizontal: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* Phase 2 */
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
