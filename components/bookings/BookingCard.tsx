import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { User, Clock, MessageSquare, Check, X, Trash2 } from 'lucide-react-native';
import { Booking } from '@/types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  booking: Booking;
  onConfirm?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const MEETING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  meet: { label: 'Google Meet', color: '#00897B' },
  inperson: { label: '対面', color: '#F57C00' },
  other: { label: 'その他', color: '#666' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '仮予約', color: '#F57C00', bg: '#FFF3E0' },
  confirmed: { label: '参加確定', color: '#2E7D32', bg: '#E8F5E9' },
  cancelled: { label: 'キャンセル', color: '#c62828', bg: '#FFEBEE' },
};

export default function BookingCard({ booking, onConfirm, onDecline, onDelete }: Props) {
  const startTime = parseISO(booking.start_time);
  const endTime = parseISO(booking.end_time);
  const meetingInfo = MEETING_TYPE_LABELS[booking.meeting_type || 'other'] || MEETING_TYPE_LABELS.other;
  const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
  const isPending = booking.status === 'pending';
  const isCancelled = booking.status === 'cancelled';

  const handleDelete = () => {
    if (!onDelete) return;
    if (Platform.OS === 'web') {
      if (window.confirm('この予約をリストから削除しますか？')) onDelete(booking.id);
    } else {
      Alert.alert('予約を削除', 'リストから削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => onDelete(booking.id) },
      ]);
    }
  };

  return (
    <View style={[styles.container, isCancelled && styles.cancelledContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.guestRow}>
          <User size={16} color="#4285F4" />
          <Text style={styles.guestName}>{booking.guest_name}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.typeBadge, { backgroundColor: meetingInfo.color + '20' }]}>
            <Text style={[styles.typeText, { color: meetingInfo.color }]}>{meetingInfo.label}</Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="予約を削除する"
              accessibilityHint="この予約をリストから削除します"
            >
              <Trash2 size={14} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Time */}
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

      {/* Status + Actions */}
      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={() => onConfirm?.(booking.id)}
              accessibilityRole="button"
              accessibilityLabel="予約を確定する"
              accessibilityHint="この予約への参加を確定します"
            >
              <Check size={14} color="#fff" />
              <Text style={styles.actionBtnText}>参加</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={() => onDecline?.(booking.id)}
              accessibilityRole="button"
              accessibilityLabel="予約を断る"
              accessibilityHint="この予約をキャンセルして不参加にします"
            >
              <X size={14} color="#fff" />
              <Text style={styles.actionBtnText}>不参加</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  cancelledContainer: { opacity: 0.6 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  guestName: { fontSize: 16, fontWeight: '600', color: '#333' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  timeText: { fontSize: 13, color: '#666' },
  detailText: { fontSize: 12, color: '#888', marginTop: 2 },
  memoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee',
  },
  memoText: { fontSize: 12, color: '#888', flex: 1 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    minHeight: 44, minWidth: 44,
  },
  confirmBtn: { backgroundColor: '#34A853' },
  declineBtn: { backgroundColor: '#EA4335' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
