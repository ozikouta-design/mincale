import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable } from 'react-native';
import { isSameDay, differenceInMinutes, startOfDay, setHours, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useCalendarContext } from '@/context/CalendarContext';
import { HOUR_HEIGHT, TIME_AXIS_WIDTH, HOURS } from '@/constants/calendar';
import EventBlock from './EventBlock';
import { CalendarEvent } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_WIDTH = SCREEN_WIDTH - TIME_AXIS_WIDTH;

export default function DayView() {
  const { currentDate, events } = useCalendarContext();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const handleEventPress = useCallback((event: CalendarEvent) => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const scrollTo = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
  }, []);

  const dayEvents = events.filter(e => !e.isAllDay && isSameDay(e.startTime, currentDate));
  const allDayEvents = events.filter(e => e.isAllDay && isSameDay(e.startTime, currentDate));

  return (
    <View style={styles.container}>
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayLabel}>終日</Text>
          {allDayEvents.map(event => (
            <EventBlock key={event.id} event={event} onPress={handleEventPress} style={{ marginBottom: 2 }} />
          ))}
        </View>
      )}

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Time labels */}
          <View style={{ width: TIME_AXIS_WIDTH }}>
            {HOURS.map(hour => (
              <View key={hour} style={{ height: HOUR_HEIGHT }}>
                <Text style={styles.hourText}>{hour.toString().padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {/* Event column */}
          <Pressable
            style={[styles.dayColumn, { width: CONTENT_WIDTH }]}
            onLongPress={(e) => {
              const y = e.nativeEvent.locationY;
              const totalMinutes = Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30;
              const startDate = new Date(currentDate);
              startDate.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
              const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
              router.push({
                pathname: '/event/create',
                params: { startTime: startDate.toISOString(), endTime: endDate.toISOString() },
              });
            }}
            delayLongPress={500}
          >
            {HOURS.map(hour => (
              <View
                key={hour}
                style={[styles.hourLine, { top: hour * HOUR_HEIGHT, width: CONTENT_WIDTH }]}
              />
            ))}

            {dayEvents.map(event => {
              const dayStart = startOfDay(currentDate);
              const topMin = differenceInMinutes(event.startTime, setHours(dayStart, 0));
              const heightMin = differenceInMinutes(event.endTime, event.startTime);
              const top = (topMin / 60) * HOUR_HEIGHT;
              const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 24);

              return (
                <EventBlock
                  key={event.id}
                  event={event}
                  onPress={handleEventPress}
                  style={{
                    position: 'absolute',
                    top,
                    left: 4,
                    right: 8,
                    height,
                  }}
                />
              );
            })}

            {/* Current time indicator */}
            {isSameDay(currentDate, new Date()) && (
              <View
                style={[
                  styles.nowLine,
                  {
                    top:
                      ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) *
                      HOUR_HEIGHT,
                  },
                ]}
              >
                <View style={styles.nowDot} />
                <View style={styles.nowLineBar} />
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  allDaySection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  allDayLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  grid: { flexDirection: 'row' },
  hourText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
    paddingRight: 8,
    marginTop: -6,
  },
  dayColumn: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#e8e8e8',
    height: 24 * HOUR_HEIGHT,
  },
  hourLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA4335',
    marginLeft: -4,
  },
  nowLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#EA4335',
  },
});
