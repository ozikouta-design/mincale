import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Copy, Clock } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { FreeSlot } from '@/types';
import { formatSingleSlot } from '@/lib/text-formatter';

interface Props {
  slot: FreeSlot;
}

export default function FreeSlotCard({ slot }: Props) {
  const handleCopy = async () => {
    const text = formatSingleSlot(slot);
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const hours = Math.floor(slot.durationMinutes / 60);
  const mins = slot.durationMinutes % 60;
  const durationLabel = hours > 0
    ? mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    : `${mins}分`;

  const startStr = `${slot.startTime.getHours().toString().padStart(2, '0')}:${slot.startTime.getMinutes().toString().padStart(2, '0')}`;
  const endStr = `${slot.endTime.getHours().toString().padStart(2, '0')}:${slot.endTime.getMinutes().toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={styles.timeSection}>
        <Clock size={16} color="#4285F4" />
        <View>
          <Text style={styles.timeText}>{startStr} - {endStr}</Text>
          <Text style={styles.durationText}>{durationLabel}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleCopy} style={styles.copyButton} activeOpacity={0.6}>
        <Copy size={18} color="#4285F4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8ecf4',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  durationText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e8f0fe',
  },
});
