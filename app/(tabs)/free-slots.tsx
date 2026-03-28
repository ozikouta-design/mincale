import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Copy, RefreshCw } from 'lucide-react-native';
import { addDays } from 'date-fns';
import { useCalendarContext } from '@/context/CalendarContext';
import { useFreeSlotsDetection } from '@/hooks/useFreeSlotsDetection';
import { C, SHADOW, R } from '@/constants/design';
import FreeSlotList from '@/components/free-slots/FreeSlotList';
import DateRangePicker from '@/components/free-slots/DateRangePicker';
import { formatFreeSlots } from '@/lib/text-formatter';

export default function FreeSlotsScreen() {
  const { events, isAuthenticated, isLoading, profile } = useCalendarContext();
  const { freeSlots, detect } = useFreeSlotsDetection();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 7));

  const handleDetect = useCallback(() => {
    detect(events, {
      startDate,
      endDate,
      workingHoursStart: profile?.booking_start_hour,
      workingHoursEnd: profile?.booking_end_hour,
    });
  }, [events, startDate, endDate, detect, profile]);

  useEffect(() => {
    if (isAuthenticated) {
      handleDetect();
    }
  }, [events, startDate, endDate, isAuthenticated]);

  const handleCopyAll = async () => {
    const text = formatFreeSlots(freeSlots);
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('コピー完了', '空き時間をクリップボードにコピーしました');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ログインしてください</Text>
        <Text style={styles.emptySubtext}>
          カレンダータブからGoogleアカウントでログインすると{'\n'}空き時間を検出できます
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChangeRange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
      />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {freeSlots.length}件の空き時間
        </Text>
        <TouchableOpacity onPress={handleDetect} style={styles.refreshButton}>
          <RefreshCw size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      <FreeSlotList slots={freeSlots} />

      {freeSlots.length > 0 && (
        <TouchableOpacity onPress={handleCopyAll} style={styles.copyAllButton} activeOpacity={0.7}>
          <Copy size={18} color={C.inverse} />
          <Text style={styles.copyAllText}>すべてコピー</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: { fontSize: 14, color: C.textSub, fontWeight: '500' },
  refreshButton: { padding: 6 },
  copyAllButton: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: R.full,
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  copyAllText: { color: C.inverse, fontSize: 15, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: C.bg,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.textSub },
  emptySubtext: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
