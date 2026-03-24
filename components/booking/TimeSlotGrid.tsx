import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';

interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

interface Props {
  slots: BookingSlot[];
  selectedSlot: BookingSlot | null;
  onSelectSlot: (slot: BookingSlot) => void;
}

export default function TimeSlotGrid({ slots, selectedSlot, onSelectSlot }: Props) {
  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>この日は空き枠がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {slots.map((slot, i) => {
        const isSelected = selectedSlot?.startTime.getTime() === slot.startTime.getTime();
        return (
          <TouchableOpacity
            key={i}
            style={[styles.slot, isSelected && styles.selectedSlot]}
            onPress={() => onSelectSlot(slot)}
            activeOpacity={0.7}
          >
            <Text style={[styles.slotText, isSelected && styles.selectedSlotText]}>
              {format(slot.startTime, 'HH:mm')}
            </Text>
            <Text style={[styles.slotDash, isSelected && styles.selectedSlotText]}> - </Text>
            <Text style={[styles.slotText, isSelected && styles.selectedSlotText]}>
              {format(slot.endTime, 'HH:mm')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#d0e3ff',
  },
  selectedSlot: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  slotText: { fontSize: 15, fontWeight: '500', color: '#4285F4' },
  slotDash: { fontSize: 15, color: '#4285F4' },
  selectedSlotText: { color: '#fff' },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#999' },
});
