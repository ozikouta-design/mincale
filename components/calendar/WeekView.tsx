import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import {
  startOfWeek, addDays, isSameDay, format, differenceInMinutes,
  startOfDay, setHours,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useCalendarContext } from '@/context/CalendarContext';
import { HOUR_HEIGHT, TIME_AXIS_WIDTH, HOURS, DAY_LABELS_JA } from '@/constants/calendar';
import EventBlock from './EventBlock';
import { CalendarEvent } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - TIME_AXIS_WIDTH) / 7;

export default function WeekView() {
  const { currentDate, events } = useCalendarContext();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  // 長押しドラッグ用ゴーストブロック
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const ghostRef = useRef<{ dayIdx: number; startTop: number; endTop: number } | null>(null);
  const [ghost, setGhost] = useState<{ dayIdx: number; startTop: number; endTop: number } | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;

  const handleEventPress = useCallback((event: CalendarEvent) => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [router]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    // Scroll to current hour
    const now = new Date();
    const scrollTo = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
  }, []);

  const getEventsForDay = (day: Date): CalendarEvent[] =>
    events.filter(e => !e.isAllDay && isSameDay(e.startTime, day));

  const getAllDayEvents = (day: Date): CalendarEvent[] =>
    events.filter(e => e.isAllDay && isSameDay(e.startTime, day));

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_AXIS_WIDTH }} />
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const sat = day.getDay() === 6;
          const sun = day.getDay() === 0;
          return (
            <View key={i} style={[styles.dayHeader, { width: DAY_WIDTH }]}>
              <Text style={[
                styles.dayLabel,
                isToday && styles.todayLabel,
                !isToday && sat && styles.satLabel,
                !isToday && sun && styles.sunLabel,
              ]}>
                {DAY_LABELS_JA[day.getDay()]}
              </Text>
              <View style={[styles.dateCircle, isToday && styles.todayCircle]}>
                <Text style={[
                  styles.dateText,
                  isToday && styles.todayText,
                  !isToday && sat && styles.satText,
                  !isToday && sun && styles.sunText,
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* All-day events row */}
      {days.some(d => getAllDayEvents(d).length > 0) && (
        <View style={styles.allDayRow}>
          <View style={{ width: TIME_AXIS_WIDTH }}>
            <Text style={styles.allDayLabel}>終日</Text>
          </View>
          {days.map((day, i) => (
            <View key={i} style={[styles.allDayCell, { width: DAY_WIDTH }]}>
              {getAllDayEvents(day).map(event => (
                <EventBlock key={event.id} event={event} onPress={handleEventPress} style={{ marginBottom: 1 }} />
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Time grid */}
      <ScrollView ref={scrollRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Time labels */}
          <View style={{ width: TIME_AXIS_WIDTH }}>
            {HOURS.map(hour => (
              <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                <Text style={styles.hourText}>
                  {hour.toString().padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <View
              key={dayIdx}
              style={[styles.dayColumn, { width: DAY_WIDTH }]}
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => !isLongPressingRef.current}
              onResponderGrant={(e) => {
                const y = e.nativeEvent.locationY;
                isLongPressingRef.current = false;
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = setTimeout(() => {
                  isLongPressingRef.current = true;
                  const totalMin = Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30;
                  const snapTop = (totalMin / 60) * HOUR_HEIGHT;
                  const newGhost = { dayIdx, startTop: snapTop, endTop: snapTop + HOUR_HEIGHT };
                  ghostRef.current = newGhost;
                  setGhost(newGhost);
                  ghostAnim.setValue(0);
                  Animated.timing(ghostAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
                }, 500);
              }}
              onResponderMove={(e) => {
                if (!isLongPressingRef.current || ghostRef.current?.dayIdx !== dayIdx) return;
                const y = e.nativeEvent.locationY;
                const { startTop } = ghostRef.current;
                const rawEnd = (Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30 / 60) * HOUR_HEIGHT;
                const endTop = Math.max(rawEnd, startTop + HOUR_HEIGHT / 2);
                const updated = { dayIdx, startTop, endTop };
                ghostRef.current = updated;
                setGhost(updated);
              }}
              onResponderRelease={() => {
                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                if (isLongPressingRef.current && ghostRef.current?.dayIdx === dayIdx) {
                  const { startTop, endTop } = ghostRef.current;
                  const startMin = Math.round((startTop / HOUR_HEIGHT) * 60 / 30) * 30;
                  const endMin = Math.round((endTop / HOUR_HEIGHT) * 60 / 30) * 30;
                  const startDate = new Date(day);
                  startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
                  const endDate = new Date(day);
                  endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
                  router.push({
                    pathname: '/event/create',
                    params: { startTime: startDate.toISOString(), endTime: endDate.toISOString() },
                  });
                  setTimeout(() => { ghostRef.current = null; setGhost(null); }, 300);
                }
                isLongPressingRef.current = false;
              }}
              onResponderTerminate={() => {
                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                isLongPressingRef.current = false;
                ghostRef.current = null;
                setGhost(null);
              }}
            >
              {/* 長押しゴーストブロック（ドラッグで終了時間を設定） */}
              {ghost?.dayIdx === dayIdx && (
                <Animated.View
                  style={[
                    styles.ghostBlock,
                    {
                      top: ghost.startTop,
                      height: Math.max(ghost.endTop - ghost.startTop, HOUR_HEIGHT / 2),
                      opacity: ghostAnim,
                      transform: [{ scaleY: ghostAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                    },
                  ]}
                />
              )}

              {/* Hour lines */}
              {HOURS.map(hour => (
                <View
                  key={hour}
                  style={[
                    styles.hourLine,
                    { top: hour * HOUR_HEIGHT, width: DAY_WIDTH },
                  ]}
                />
              ))}

              {/* Events */}
              {getEventsForDay(day).map(event => {
                const dayStart = startOfDay(day);
                const topMin = differenceInMinutes(event.startTime, setHours(dayStart, 0));
                const heightMin = differenceInMinutes(event.endTime, event.startTime);
                const top = (topMin / 60) * HOUR_HEIGHT;
                const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 20);

                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    onPress={handleEventPress}
                    style={{
                      position: 'absolute',
                      top,
                      left: 1,
                      right: 1,
                      height,
                    }}
                  />
                );
              })}

              {/* Current time indicator */}
              {isSameDay(day, new Date()) && (
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
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  todayLabel: { color: '#4285F4' },
  satLabel: { color: '#4285F4' },
  sunLabel: { color: '#EA4335' },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { backgroundColor: '#4285F4' },
  dateText: { fontSize: 14, fontWeight: '500', color: '#333' },
  todayText: { color: '#fff', fontWeight: '700' },
  satText: { color: '#4285F4' },
  sunText: { color: '#EA4335' },
  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 4,
    minHeight: 28,
  },
  allDayLabel: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4 },
  allDayCell: { paddingHorizontal: 1 },
  scrollView: { flex: 1 },
  grid: { flexDirection: 'row' },
  hourRow: { justifyContent: 'flex-start' },
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
  // 長押しゴーストブロック（ドラッグで高さが変わるため height はスタイルから除外）
  ghostBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    backgroundColor: 'rgba(66, 133, 244, 0.25)',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4285F4',
    zIndex: 5,
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
