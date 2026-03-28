import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CalendarEvent } from '@/types';
import { format } from 'date-fns';
import { useAppSettings } from '@/context/AppSettingsContext';

interface Props {
  event: CalendarEvent;
  style?: object;
  /** onPress が渡されない場合は親 View がタッチを処理する（カレンダーグリッド内） */
  onPress?: (event: CalendarEvent) => void;
}

export default function EventBlock({ event, style, onPress }: Props) {
  const { settings } = useAppSettings();
  const timeStr = format(event.startTime, settings.timeFormat === '12h' ? 'h:mm a' : 'HH:mm');

  // カレンダーグリッド内では親がタッチを管理するため、TouchableOpacity はレンダリングしない
  if (!onPress) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: event.colorHex + 'E6' },
          style,
        ]}
        // ポインターイベントを親に通す（Web ではこれが効く）
        pointerEvents="none"
      >
        <Text style={styles.title} numberOfLines={event.isAllDay ? 1 : undefined}>
          {event.title}
        </Text>
        {!event.isAllDay && (
          <Text style={styles.time} numberOfLines={1}>{timeStr}</Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
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
        <Text style={styles.time} numberOfLines={1}>{timeStr}</Text>
      )}
    </TouchableOpacity>
  );
}

const noSelectStyle = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 2,
    overflow: 'hidden',
    minHeight: 20,
    ...noSelectStyle,
  },
  title: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    ...noSelectStyle,
  },
  time: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    lineHeight: 12,
    ...noSelectStyle,
  },
});
