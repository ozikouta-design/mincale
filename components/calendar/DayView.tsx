import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import { isSameDay, differenceInMinutes, startOfDay, setHours } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCalendarContext } from '@/context/CalendarContext';
import { HOUR_HEIGHT, TIME_AXIS_WIDTH, HOURS } from '@/constants/calendar';
import EventBlock from './EventBlock';
import { CalendarEvent, EventFormData } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RESIZE_HANDLE_HEIGHT = 14;

type Interaction =
  | { mode: 'new'; calIdx: number; startTop: number; endTop: number }
  | { mode: 'drag'; calIdx: number; event: CalendarEvent; top: number; height: number }
  | { mode: 'resize'; calIdx: number; event: CalendarEvent; top: number; height: number };

function getEventLayout(event: CalendarEvent, day: Date) {
  const topMin = differenceInMinutes(event.startTime, setHours(startOfDay(day), 0));
  const heightMin = differenceInMinutes(event.endTime, event.startTime);
  const top = (topMin / 60) * HOUR_HEIGHT;
  const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 24);
  return { top, height };
}

export default function DayView() {
  const { currentDate, events, calendarList, updateEvent, refreshEvents } = useCalendarContext();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const interactionRef = useRef<Interaction | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;

  const handleEventPress = useCallback((event: CalendarEvent) => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const scrollTo = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
  }, []);

  const visibleCalendars = calendarList.filter(c => c.selected);
  const columns = visibleCalendars.length > 0 ? visibleCalendars : [{ id: '__all__', summary: '', backgroundColor: '#4285F4', selected: true }];
  const colCount = columns.length;
  const CONTENT_WIDTH = SCREEN_WIDTH - TIME_AXIS_WIDTH;
  const COL_WIDTH = CONTENT_WIDTH / colCount;

  const allDayEvents = events.filter(e => e.isAllDay && isSameDay(e.startTime, currentDate));

  const getEventsForColumn = (calId: string): CalendarEvent[] => {
    if (calId === '__all__') return events.filter(e => !e.isAllDay && isSameDay(e.startTime, currentDate));
    return events.filter(e => !e.isAllDay && isSameDay(e.startTime, currentDate) && e.calendarId === calId);
  };

  const findEventAt = (y: number, calId: string) => {
    for (const event of getEventsForColumn(calId)) {
      const { top, height } = getEventLayout(event, currentDate);
      if (y >= top - 2 && y <= top + height + 2) {
        const isResize = y >= top + height - RESIZE_HANDLE_HEIGHT;
        return { event, top, height, isResize };
      }
    }
    return null;
  };

  const finalizeInteraction = useCallback(async (state: Interaction) => {
    if (state.mode === 'drag') {
      const startMin = Math.round((state.top / HOUR_HEIGHT) * 60 / 30) * 30;
      const durationMin = differenceInMinutes(state.event.endTime, state.event.startTime);
      const startDate = new Date(currentDate);
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
      const endDate = new Date(currentDate);
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
  }, [updateEvent, refreshEvents, currentDate]);

  return (
    <View style={styles.container}>
      {allDayEvents.length > 0 && (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayLabel}>終日</Text>
          {allDayEvents.map(event => (
            <EventBlock key={event.id} event={event} onPress={handleEventPress} style={{ marginBottom: 2 }} />
          ))}
        </View>
      )}

      {colCount > 1 && (
        <View style={styles.colHeaderRow}>
          <View style={{ width: TIME_AXIS_WIDTH }} />
          {columns.map(cal => (
            <View key={cal.id} style={[styles.colHeader, { width: COL_WIDTH }]}>
              <View style={[styles.colHeaderDot, { backgroundColor: cal.backgroundColor }]} />
              <Text style={styles.colHeaderText} numberOfLines={1}>{cal.summary}</Text>
            </View>
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

          {columns.map((cal, calIdx) => (
            <View
              key={cal.id}
              style={[styles.dayColumn, { width: COL_WIDTH }]}
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => !isLongPressingRef.current}
              onResponderGrant={(e) => {
                const y = e.nativeEvent.locationY;
                isLongPressingRef.current = false;
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = setTimeout(() => {
                  isLongPressingRef.current = true;
                  let newState: Interaction;
                  const found = findEventAt(y, cal.id);
                  if (found) {
                    if (found.isResize) {
                      newState = { mode: 'resize', calIdx, event: found.event, top: found.top, height: found.height };
                    } else {
                      newState = { mode: 'drag', calIdx, event: found.event, top: found.top, height: found.height };
                    }
                  } else {
                    const totalMin = Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30;
                    const snapTop = (totalMin / 60) * HOUR_HEIGHT;
                    newState = { mode: 'new', calIdx, startTop: snapTop, endTop: snapTop + HOUR_HEIGHT };
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
                if (state.calIdx !== calIdx) return;
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
                if (isLongPressingRef.current && state?.calIdx === calIdx) {
                  if (state.mode === 'new') {
                    const startMin = Math.round((state.startTop / HOUR_HEIGHT) * 60 / 30) * 30;
                    const endMin = Math.round((state.endTop / HOUR_HEIGHT) * 60 / 30) * 30;
                    const startDate = new Date(currentDate);
                    startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
                    const endDate = new Date(currentDate);
                    endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
                    router.push({
                      pathname: '/event/create',
                      params: {
                        startTime: startDate.toISOString(),
                        endTime: endDate.toISOString(),
                        calendarId: cal.id !== '__all__' ? cal.id : undefined,
                      },
                    });
                    setTimeout(() => { interactionRef.current = null; setInteraction(null); }, 300);
                  } else {
                    finalizeInteraction(state).then(() => {
                      interactionRef.current = null;
                      setInteraction(null);
                    });
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
              {/* インタラクション中ゴーストブロック */}
              {interaction?.calIdx === calIdx && (() => {
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
                return (
                  <Animated.View style={[styles.ghostEventBlock, {
                    top: s.top,
                    height: s.height,
                    backgroundColor: s.event.colorHex + 'CC',
                    opacity: ghostAnim,
                  }]}>
                    <Text style={styles.ghostEventTitle} numberOfLines={2}>{s.event.title}</Text>
                    {s.mode === 'resize' && <View style={styles.resizeHandleActive} />}
                  </Animated.View>
                );
              })()}

              {HOURS.map(hour => (
                <View
                  key={hour}
                  style={[styles.hourLine, { top: hour * HOUR_HEIGHT, width: COL_WIDTH }]}
                />
              ))}

              {getEventsForColumn(cal.id).map(event => {
                const { top, height } = getEventLayout(event, currentDate);
                const isDragging = interaction?.mode === 'drag' && interaction.event.id === event.id && interaction.calIdx === calIdx;
                const isResizing = interaction?.mode === 'resize' && interaction.event.id === event.id && interaction.calIdx === calIdx;
                return (
                  <View key={event.id}>
                    <EventBlock
                      event={event}
                      onPress={isDragging || isResizing ? undefined : handleEventPress}
                      style={{
                        position: 'absolute',
                        top,
                        left: 2,
                        right: 2,
                        height,
                        opacity: isDragging || isResizing ? 0.3 : 1,
                      }}
                    />
                    {!isDragging && !isResizing && (
                      <View style={[styles.resizeHandle, { top: top + height - RESIZE_HANDLE_HEIGHT, left: 2, right: 2 }]} />
                    )}
                  </View>
                );
              })}

              {/* Current time indicator (最初の列のみ) */}
              {calIdx === 0 && isSameDay(currentDate, new Date()) && (
                <View
                  style={[
                    styles.nowLine,
                    {
                      top: ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT,
                      width: CONTENT_WIDTH,
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
  allDaySection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  allDayLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  colHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#e8e8e8',
  },
  colHeaderDot: { width: 8, height: 8, borderRadius: 4 },
  colHeaderText: { fontSize: 11, color: '#555', fontWeight: '500', flexShrink: 1 },
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
  ghostEventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
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
