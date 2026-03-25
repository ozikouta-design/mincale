import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '@/types';
import { format } from 'date-fns';

interface Props {
  event: CalendarEvent;
  style?: object;
  onPress?: (event: CalendarEvent) => void;
}

export default function EventBlock({ event, style, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={() => onPress?.(event)}
      style={[
        styles.container,
        { backgroundColor: event.colorHex + 'E6' },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text style={styles.title} numberOfLines={event.isAllDay ? 1 : undefined}>
        {event.title}
      </Text>
      {!event.isAllDay && (
        <Text style={styles.time} numberOfLines={1}>
          {format(event.startTime, 'HH:mm')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 2,
    overflow: 'hidden',
    minHeight: 20,
  },
  title: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  time: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    lineHeight: 12,
  },
});
