import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
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

  // 長押しドラッグ用ゴーストブロック
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const ghostRef = useRef<{ startTop: number; endTop: number } | null>(null);
  const [ghost, setGhost] = useState<{ startTop: number; endTop: number } | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;

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
          <View
            style={[styles.dayColumn, { width: CONTENT_WIDTH }]}
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
                const newGhost = { startTop: snapTop, endTop: snapTop + HOUR_HEIGHT };
                ghostRef.current = newGhost;
                setGhost(newGhost);
                ghostAnim.setValue(0);
                Animated.timing(ghostAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
              }, 500);
            }}
            onResponderMove={(e) => {
              if (!isLongPressingRef.current || !ghostRef.current) return;
              const y = e.nativeEvent.locationY;
              const { startTop } = ghostRef.current;
              const rawEnd = (Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30 / 60) * HOUR_HEIGHT;
              const endTop = Math.max(rawEnd, startTop + HOUR_HEIGHT / 2);
              const updated = { startTop, endTop };
              ghostRef.current = updated;
              setGhost(updated);
            }}
            onResponderRelease={() => {
              if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
              if (isLongPressingRef.current && ghostRef.current) {
                const { startTop, endTop } = ghostRef.current;
                const startMin = Math.round((startTop / HOUR_HEIGHT) * 60 / 30) * 30;
                const endMin = Math.round((endTop / HOUR_HEIGHT) * 60 / 30) * 30;
                const startDate = new Date(currentDate);
                startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
                const endDate = new Date(currentDate);
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
            {ghost !== null && (
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
          </View>
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
  // 長押しゴーストブロック（ドラッグで高さが変わるため height はスタイルから除外）
  ghostBlock: {
    position: 'absolute',
    left: 4,
    right: 8,
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
