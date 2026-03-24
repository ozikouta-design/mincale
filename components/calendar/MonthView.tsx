import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, format,
} from 'date-fns';
import { useCalendarContext } from '@/context/CalendarContext';
import { DAY_LABELS_JA, MAX_VISIBLE_EVENTS_MONTH } from '@/constants/calendar';
import { CalendarEvent } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = SCREEN_WIDTH / 7;

export default function MonthView() {
  const { currentDate, events, setCurrentDate, setViewMode } = useCalendarContext();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Build weeks
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const getEventsForDay = (d: Date): CalendarEvent[] =>
    events.filter(e => isSameDay(e.startTime, d));

  const handleDayPress = (d: Date) => {
    setCurrentDate(d);
    setViewMode('day');
  };

  return (
    <View style={styles.container}>
      {/* Day of week headers */}
      <View style={styles.headerRow}>
        {DAY_LABELS_JA.map((label, i) => (
          <View key={i} style={[styles.headerCell, { width: CELL_WIDTH }]}>
            <Text
              style={[
                styles.headerText,
                i === 0 && styles.sundayText,
                i === 6 && styles.saturdayText,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, di) => {
            const isToday = isSameDay(d, new Date());
            const isCurrentMonth = isSameMonth(d, currentDate);
            const dayEvents = getEventsForDay(d);

            return (
              <TouchableOpacity
                key={di}
                style={[styles.dayCell, { width: CELL_WIDTH }]}
                onPress={() => handleDayPress(d)}
                activeOpacity={0.6}
              >
                <View style={[styles.dateCircle, isToday && styles.todayCircle]}>
                  <Text
                    style={[
                      styles.dateText,
                      !isCurrentMonth && styles.otherMonthText,
                      isToday && styles.todayText,
                      di === 0 && isCurrentMonth && styles.sundayText,
                      di === 6 && isCurrentMonth && styles.saturdayText,
                    ]}
                  >
                    {format(d, 'd')}
                  </Text>
                </View>

                {/* Event dots / short titles */}
                <View style={styles.eventArea}>
                  {dayEvents.slice(0, MAX_VISIBLE_EVENTS_MONTH).map(event => (
                    <View
                      key={event.id}
                      style={[styles.eventDot, { backgroundColor: event.colorHex }]}
                    >
                      <Text style={styles.eventDotText} numberOfLines={1}>
                        {event.title}
                      </Text>
                    </View>
                  ))}
                  {dayEvents.length > MAX_VISIBLE_EVENTS_MONTH && (
                    <Text style={styles.moreText}>
                      +{dayEvents.length - MAX_VISIBLE_EVENTS_MONTH}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
  },
  headerCell: { alignItems: 'center' },
  headerText: { fontSize: 12, color: '#666', fontWeight: '500' },
  sundayText: { color: '#EA4335' },
  saturdayText: { color: '#4285F4' },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  dayCell: {
    minHeight: 80,
    paddingTop: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  dateCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { backgroundColor: '#4285F4' },
  dateText: { fontSize: 13, color: '#333' },
  todayText: { color: '#fff', fontWeight: '700' },
  otherMonthText: { color: '#ccc' },
  eventArea: { width: '100%', marginTop: 2, gap: 1 },
  eventDot: {
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  eventDotText: { fontSize: 9, color: '#fff', fontWeight: '500' },
  moreText: { fontSize: 9, color: '#999', textAlign: 'center', marginTop: 1 },
});
