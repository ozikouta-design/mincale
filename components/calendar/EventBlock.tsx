import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CalendarEvent } from '@/types';
import { format } from 'date-fns';
import { useAppSettings } from '@/context/AppSettingsContext';
import { R } from '@/constants/design';

interface Props {
  event: CalendarEvent;
  style?: object;
  /** onPress が渡されない場合は親 View がタッチを処理する（カレンダーグリッド内） */
  onPress?: (event: CalendarEvent) => void;
}

export default function EventBlock({ event, style, onPress }: Props) {
  const { settings } = useAppSettings();
  const timeStr = format(event.startTime, settings.timeFormat === '12h' ? 'h:mm a' : 'HH:mm');

  const inner = (
    <>
      <View style={[styles.accentBar, { backgroundColor: event.colorHex }]} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: event.colorHex }]} numberOfLines={event.isAllDay ? 1 : undefined}>
          {event.title}
        </Text>
        {!event.isAllDay && (
          <Text style={[styles.time, { color: event.colorHex + 'BB' }]} numberOfLines={1}>{timeStr}</Text>
        )}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: event.colorHex + '20' },
          style,
        ]}
        pointerEvents="none"
      >
        {inner}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      style={[
        styles.container,
        { backgroundColor: event.colorHex + '20' },
        style,
      ]}
      activeOpacity={0.7}
    >
      {inner}
    </TouchableOpacity>
  );
}

const noSelectStyle = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {};

const styles = StyleSheet.create({
  container: {
    borderRadius: R.xs,
    marginRight: 2,
    overflow: 'hidden',
    minHeight: 20,
    flexDirection: 'row',
    ...noSelectStyle,
  },
  accentBar: {
    width: 3,
  },
  body: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 3,
    ...noSelectStyle,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    ...noSelectStyle,
  },
  time: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 1,
    ...noSelectStyle,
  },
});
