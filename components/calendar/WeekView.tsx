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
import { CalendarEvent, EventFormData } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - TIME_AXIS_WIDTH) / 7;
const RESIZE_HANDLE_HEIGHT = 14; // 終了時間リサイズハンドル高さ

// インタラクション状態（新規作成 / ドラッグ移動 / リサイズ）
type Interaction =
  | { mode: 'new'; dayIdx: number; startTop: number; endTop: number }
  | { mode: 'drag'; dayIdx: number; event: CalendarEvent; top: number; height: number }
  | { mode: 'resize'; dayIdx: number; event: CalendarEvent; top: number; height: number };

function getEventLayout(event: CalendarEvent, day: Date) {
  const topMin = differenceInMinutes(event.startTime, setHours(startOfDay(day), 0));
  const heightMin = differenceInMinutes(event.endTime, event.startTime);
  const top = (topMin / 60) * HOUR_HEIGHT;
  const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

export default function WeekView() {
  const { currentDate, events, updateEvent, refreshEvents } = useCalendarContext();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  // ロングプレス・ドラッグ管理
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const interactionRef = useRef<Interaction | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;
  // 短タップ検出用
  const grantYRef = useRef(0);
  const grantTimeRef = useRef(0);

  const handleEventPress = useCallback((event: CalendarEvent) => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [router]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const now = new Date();
    const scrollTo = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
  }, []);

  const getEventsForDay = (day: Date): CalendarEvent[] =>
    events.filter(e => !e.isAllDay && isSameDay(e.startTime, day));

  const getAllDayEvents = (day: Date): CalendarEvent[] =>
    events.filter(e => e.isAllDay && isSameDay(e.startTime, day));

  // ロングプレス時にタッチ位置のイベントを検索
  const findEventAt = (y: number, day: Date) => {
    for (const event of getEventsForDay(day)) {
      const { top, height } = getEventLayout(event, day);
      if (y >= top - 2 && y <= top + height + 2) {
        const isResize = y >= top + height - RESIZE_HANDLE_HEIGHT;
        return { event, top, height, isResize };
      }
    }
    return null;
  };

  // ドラッグ/リサイズ完了後にイベント更新
  const finalizeInteraction = useCallback(async (state: Interaction, day: Date) => {
    if (state.mode === 'drag') {
      const startMin = Math.round((state.top / HOUR_HEIGHT) * 60 / 30) * 30;
      const durationMin = differenceInMinutes(state.event.endTime, state.event.startTime);
      const startDate = new Date(day);
      startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
      const formData: EventFormData = {
        title: state.event.title,
        startTime: startDate,
        endTime: endDate,
        isAllDay: false,
        location: state.event.location || '',
        description: state.event.description || '',
        calendarId: state.event.calendarId,
      };
      await updateEvent(state.event.id, formData, state.event.calendarId);
      await refreshEvents();
    } else if (state.mode === 'resize') {
      const endMin = Math.round(((state.top + state.height) / HOUR_HEIGHT) * 60 / 30) * 30;
      const endDate = new Date(day);
      endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      if (endDate <= state.event.startTime) return;
      const formData: EventFormData = {
        title: state.event.title,
        startTime: state.event.startTime,
        endTime: endDate,
        isAllDay: false,
        location: state.event.location || '',
        description: state.event.description || '',
        calendarId: state.event.calendarId,
      };
      await updateEvent(state.event.id, formData, state.event.calendarId);
      await refreshEvents();
    }
  }, [updateEvent, refreshEvents]);

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
              // capture phase で子（TouchableOpacity）より先にタッチを受け取る
              onStartShouldSetResponderCapture={() => true}
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => !isLongPressingRef.current}
              onResponderGrant={(e) => {
                const y = e.nativeEvent.locationY;
                grantYRef.current = y;
                grantTimeRef.current = Date.now();
                isLongPressingRef.current = false;
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = setTimeout(() => {
                  isLongPressingRef.current = true;
                  let newState: Interaction;
                  const found = findEventAt(y, day);
                  if (found) {
                    if (found.isResize) {
                      newState = { mode: 'resize', dayIdx, event: found.event, top: found.top, height: found.height };
                    } else {
                      newState = { mode: 'drag', dayIdx, event: found.event, top: found.top, height: found.height };
                    }
                  } else {
                    const totalMin = Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30;
                    const snapTop = (totalMin / 60) * HOUR_HEIGHT;
                    newState = { mode: 'new', dayIdx, startTop: snapTop, endTop: snapTop + HOUR_HEIGHT };
                  }
                  interactionRef.current = newState;
                  setInteraction(newState);
                  ghostAnim.setValue(0);
                  Animated.timing(ghostAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
                }, 500);
              }}
              onResponderMove={(e) => {
                if (!isLongPressingRef.current || !interactionRef.current) return;
                const state = interactionRef.current;
                if (state.dayIdx !== dayIdx) return;
                const y = e.nativeEvent.locationY;
                let updated: Interaction;
                if (state.mode === 'new') {
                  const rawEnd = (Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30 / 60) * HOUR_HEIGHT;
                  updated = { ...state, endTop: Math.max(rawEnd, state.startTop + HOUR_HEIGHT / 2) };
                } else if (state.mode === 'drag') {
                  const snappedTop = (Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30 / 60) * HOUR_HEIGHT;
                  const top = Math.max(0, snappedTop - state.height / 2);
                  updated = { ...state, top };
                } else {
                  const rawEnd = (Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30 / 60) * HOUR_HEIGHT;
                  updated = { ...state, height: Math.max(rawEnd - state.top, HOUR_HEIGHT / 2) };
                }
                interactionRef.current = updated;
                setInteraction(updated);
              }}
              onResponderRelease={() => {
                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                const state = interactionRef.current;
                if (isLongPressingRef.current && state?.dayIdx === dayIdx) {
                  if (state.mode === 'new') {
                    const startMin = Math.round((state.startTop / HOUR_HEIGHT) * 60 / 30) * 30;
                    const endMin = Math.round((state.endTop / HOUR_HEIGHT) * 60 / 30) * 30;
                    const startDate = new Date(day);
                    startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
                    const endDate = new Date(day);
                    endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
                    router.push({ pathname: '/event/create', params: { startTime: startDate.toISOString(), endTime: endDate.toISOString() } });
                    setTimeout(() => { interactionRef.current = null; setInteraction(null); }, 300);
                  } else {
                    finalizeInteraction(state, day).then(() => {
                      interactionRef.current = null;
                      setInteraction(null);
                    });
                  }
                } else if (!isLongPressingRef.current) {
                  // 短タップ → 予定がある位置ならイベント詳細へ
                  const elapsed = Date.now() - grantTimeRef.current;
                  if (elapsed < 500) {
                    const found = findEventAt(grantYRef.current, day);
                    if (found) handleEventPress(found.event);
                  }
                }
                isLongPressingRef.current = false;
              }}
              onResponderTerminate={() => {
                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                isLongPressingRef.current = false;
                interactionRef.current = null;
                setInteraction(null);
              }}
            >
              {/* インタラクション中のゴーストブロック */}
              {interaction?.dayIdx === dayIdx && (() => {
                const s = interaction;
                if (s.mode === 'new') {
                  return (
                    <Animated.View style={[styles.ghostBlock, {
                      top: s.startTop,
                      height: Math.max(s.endTop - s.startTop, HOUR_HEIGHT / 2),
                      opacity: ghostAnim,
                      transform: [{ scaleY: ghostAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                    }]} />
                  );
                }
                // drag or resize: show event-colored ghost
                const ghostTop = s.mode === 'drag' ? s.top : s.top;
                const ghostHeight = s.mode === 'drag' ? s.height : s.height;
                return (
                  <Animated.View style={[styles.ghostEventBlock, {
                    top: ghostTop,
                    height: ghostHeight,
                    backgroundColor: s.event.colorHex + 'CC',
                    opacity: ghostAnim,
                  }]}>
                    <Text style={styles.ghostEventTitle} numberOfLines={2}>{s.event.title}</Text>
                    {s.mode === 'resize' && <View style={styles.resizeHandleActive} />}
                  </Animated.View>
                );
              })()}

              {/* Hour lines */}
              {HOURS.map(hour => (
                <View key={hour} style={[styles.hourLine, { top: hour * HOUR_HEIGHT, width: DAY_WIDTH }]} />
              ))}

              {/* Events */}
              {getEventsForDay(day).map(event => {
                const { top, height } = getEventLayout(event, day);
                // ドラッグ/リサイズ中は元の予定を薄く表示
                const isDragging = interaction?.mode === 'drag' && interaction.event.id === event.id && interaction.dayIdx === dayIdx;
                const isResizing = interaction?.mode === 'resize' && interaction.event.id === event.id && interaction.dayIdx === dayIdx;
                return (
                  <View key={event.id}>
                    <EventBlock
                      event={event}
                      onPress={undefined}
                      style={{
                        position: 'absolute',
                        top,
                        left: 1,
                        right: 1,
                        height,
                        opacity: isDragging || isResizing ? 0.3 : 1,
                      }}
                    />
                    {/* リサイズハンドル */}
                    {!isDragging && !isResizing && (
                      <View style={[styles.resizeHandle, { top: top + height - RESIZE_HANDLE_HEIGHT, left: 1, right: 1 }]} />
                    )}
                  </View>
                );
              })}

              {/* Current time indicator */}
              {isSameDay(day, new Date()) && (
                <View style={[styles.nowLine, { top: ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT }]}>
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
  dayHeader: { alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  todayLabel: { color: '#4285F4' },
  satLabel: { color: '#4285F4' },
  sunLabel: { color: '#EA4335' },
  dateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
  hourText: { fontSize: 10, color: '#999', textAlign: 'right', paddingRight: 8, marginTop: -6 },
  dayColumn: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#e8e8e8',
    height: 24 * HOUR_HEIGHT,
    // @ts-ignore web only
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'default',
    touchAction: 'none',
  },
  // 新規作成ゴーストブロック
  ghostBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    backgroundColor: 'rgba(66, 133, 244, 0.25)',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4285F4',
    zIndex: 10,
  },
  // ドラッグ/リサイズゴースト（既存予定）
  ghostEventBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  ghostEventTitle: { color: '#fff', fontSize: 11, fontWeight: '600' },
  resizeHandleActive: {
    position: 'absolute',
    bottom: 2,
    left: '30%',
    right: '30%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  // リサイズハンドル（予定下部の透明タップ領域）
  resizeHandle: {
    position: 'absolute',
    height: RESIZE_HANDLE_HEIGHT,
    zIndex: 6,
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
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EA4335', marginLeft: -4 },
  nowLineBar: { flex: 1, height: 2, backgroundColor: '#EA4335' },
});
