import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Clock, Video, MapPin, MessageSquare } from 'lucide-react-native';
import { Booking } from '@/types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  booking: Booking;
}

const MEETING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  meet: { label: 'Google Meet', color: '#00897B' },
  inperson: { label: '対面', color: '#F57C00' },
  other: { label: 'その他', color: '#666' },
};

export default function BookingCard({ booking }: Props) {
  const startTime = parseISO(booking.start_time);
  const endTime = parseISO(booking.end_time);
  const meetingInfo = MEETING_TYPE_LABELS[booking.meeting_type || 'other'] || MEETING_TYPE_LABELS.other;
  const isCancelled = booking.status === 'cancelled';

  return (
    <View style={[styles.container, isCancelled && styles.cancelled]}>
      <View style={styles.header}>
        <View style={styles.guestRow}>
          <User size={16} color="#4285F4" />
          <Text style={styles.guestName}>{booking.guest_name}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: meetingInfo.color + '20' }]}>
          <Text style={[styles.typeText, { color: meetingInfo.color }]}>{meetingInfo.label}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <Clock size={14} color="#888" />
        <Text style={styles.timeText}>
          {format(startTime, 'M/d(E) HH:mm', { locale: ja })} - {format(endTime, 'HH:mm')}
        </Text>
      </View>

      {booking.guest_email && (
        <Text style={styles.detailText}>{booking.guest_email}</Text>
      )}

      {booking.guest_memo && (
        <View style={styles.memoRow}>
          <MessageSquare size={12} color="#999" />
          <Text style={styles.memoText} numberOfLines={2}>{booking.guest_memo}</Text>
        </View>
      )}

      {isCancelled && (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>キャンセル済み</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8ecf4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cancelled: { opacity: 0.5 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestName: { fontSize: 16, fontWeight: '600', color: '#333' },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeText: { fontSize: 11, fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: { fontSize: 13, color: '#666' },
  detailText: { fontSize: 12, color: '#888', marginTop: 2 },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  memoText: { fontSize: 12, color: '#888', flex: 1 },
  cancelledBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cancelledText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
