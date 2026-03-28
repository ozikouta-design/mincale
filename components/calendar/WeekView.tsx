import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import {
  startOfWeek, addDays, isSameDay, format, differenceInMinutes,
  startOfDay, setHours,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useCalendarContext } from '@/context/CalendarContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { HOUR_HEIGHT, TIME_AXIS_WIDTH, HOURS, DAY_LABELS_JA } from '@/constants/calendar';
import { C } from '@/constants/design';
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

// 重複イベントに列割り当てを計算（Google カレンダー方式）
function computeEventColumns(dayEvents: CalendarEvent[], day: Date) {
  if (dayEvents.length === 0) return [];
  const items = dayEvents
    .map(e => ({ event: e, ...getEventLayout(e, day) }))
    .sort((a, b) => a.event.startTime.getTime() - b.event.startTime.getTime());

  // 貪欲法で列インデックスを割り当て
  const colEnds: number[] = [];
  const colIdx: number[] = [];
  for (const item of items) {
    const col = colEnds.findIndex(end => end <= item.top + 1);
    const assigned = col === -1 ? colEnds.length : col;
    colEnds[assigned] = item.top + item.height;
    colIdx.push(assigned);
  }

  // 各イベントの colCount = 重複グループ内の最大列数
  const n = items.length;
  const colCount = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (items[j].top < items[i].top + items[i].height) {
        const maxCol = Math.max(colIdx[i], colIdx[j]) + 1;
        colCount[i] = Math.max(colCount[i], maxCol);
        colCount[j] = Math.max(colCount[j], maxCol);
      }
    }
  }

  return items.map((item, i) => ({
    event: item.event,
    top: item.top,
    height: item.height,
    colIndex: colIdx[i],
    colCount: colCount[i],
  }));
}

function formatHour(hour: number, timeFormat: '24h' | '12h'): string {
  if (timeFormat === '24h') return `${hour.toString().padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export default function WeekView() {
  const { currentDate, events, updateEvent, refreshEvents } = useCalendarContext();
  const { settings } = useAppSettings();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: settings.weekStartsOn });

  // ロングプレス・ドラッグ管理
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const interactionRef = useRef<Interaction | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;
  // 短タップ検出用
  const grantYRef = useRef(0);
  const grantTimeRef = useRef(0);
  const grantPageYRef = useRef(0);   // 移動量検出用（ドラッグ後に詳細画面を開かないため）
  const movedSignificantlyRef = useRef(false);

  const handleEventPress = useCallback((event: CalendarEvent) => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [router]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const scrollTo = settings.calendarStartHour * HOUR_HEIGHT;
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
  }, [settings.calendarStartHour]);

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
      <ScrollView ref={scrollRef} style={styles.scrollView} scrollEnabled={!interaction} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Time labels */}
          <View style={{ width: TIME_AXIS_WIDTH }}>
            {HOURS.map(hour => (
              <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                <Text style={styles.hourText}>
                  {formatHour(hour, settings.timeFormat)}
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <View
              key={dayIdx}
              style={[
                styles.dayColumn,
                { width: DAY_WIDTH },
                settings.highlightWeekends && (day.getDay() === 0 || day.getDay() === 6) && styles.weekendColumn,
              ]}
              // capture phase で子（EventBlock）より先にタッチを受け取る
              // ※ ScrollView への伝播は onResponderTerminationRequest で許可する
              onStartShouldSetResponderCapture={() => true}
              onResponderTerminationRequest={() => !isLongPressingRef.current}
              onResponderGrant={(e) => {
                const y = e.nativeEvent.locationY;
                grantYRef.current = y;
                grantTimeRef.current = Date.now();
                grantPageYRef.current = e.nativeEvent.pageY;
                movedSignificantlyRef.current = false;
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
                    const durationH = (settings.defaultEventDuration / 60) * HOUR_HEIGHT;
                    newState = { mode: 'new', dayIdx, startTop: snapTop, endTop: snapTop + durationH };
                  }
                  interactionRef.current = newState;
                  setInteraction(newState);
                  ghostAnim.setValue(0);
                  Animated.timing(ghostAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
                }, 500);
              }}
              onResponderMove={(e) => {
                // 8px以上の移動はドラッグとみなす（タップ誤検出を防止）
                if (Math.abs(e.nativeEvent.pageY - grantPageYRef.current) > 8) {
                  movedSignificantlyRef.current = true;
                }
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
                } else if (!isLongPressingRef.current && !movedSignificantlyRef.current) {
                  // 短タップ（移動なし）→ 予定がある位置ならイベント詳細へ
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
              {computeEventColumns(getEventsForDay(day), day).map(({ event, top, height, colIndex, colCount }) => {
                const colWidth = (DAY_WIDTH - 2) / colCount;
                const left = 1 + colIndex * colWidth;
                const width = colWidth - 1;
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
                        left,
                        width,
                        height,
                        opacity: isDragging || isResizing ? 0.3 : 1,
                      }}
                    />
                    {/* リサイズハンドル */}
                    {!isDragging && !isResizing && (
                      <View style={[styles.resizeHandle, { top: top + height - RESIZE_HANDLE_HEIGHT, left, width }]} />
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
  container: { flex: 1, backgroundColor: C.bg },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    paddingBottom: 4,
    backgroundColor: C.card,
  },
  dayHeader: { alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2, fontWeight: '500' },
  todayLabel: { color: C.primary },
  satLabel: { color: C.saturday },
  sunLabel: { color: C.sunday },
  dateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: C.today },
  dateText: { fontSize: 14, fontWeight: '500', color: C.text },
  todayText: { color: C.inverse, fontWeight: '700' },
  satText: { color: C.saturday },
  sunText: { color: C.sunday },
  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    paddingVertical: 4,
    minHeight: 28,
    backgroundColor: C.card,
  },
  allDayLabel: { fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 4 },
  allDayCell: { paddingHorizontal: 1 },
  scrollView: { flex: 1 },
  grid: { flexDirection: 'row' },
  hourRow: { justifyContent: 'flex-start' },
  hourText: { fontSize: 11, color: C.textMuted, textAlign: 'right', paddingRight: 8, marginTop: -6 },
  dayColumn: {
    borderLeftWidth: 1,
    borderLeftColor: C.borderLight,
    height: 24 * HOUR_HEIGHT,
    // @ts-ignore web only
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'default',
    // touchAction は設定しない: ブラウザの縦スクロールを妨げないようにする
  },
  weekendColumn: {
    backgroundColor: 'rgba(0,0,0,0.016)',
  },
  // 新規作成ゴーストブロック
  ghostBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    backgroundColor: C.primaryGlow,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.primary,
    zIndex: 10,
  },
  // ドラッグ/リサイズゴースト（既存予定）
  ghostEventBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  ghostEventTitle: { color: C.inverse, fontSize: 11, fontWeight: '600' },
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
    backgroundColor: C.borderLight,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.currentTime, marginLeft: -4 },
  nowLineBar: { flex: 1, height: 2, backgroundColor: C.currentTime },
});
