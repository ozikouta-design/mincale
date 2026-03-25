import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { format, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DaySlots, SlotCell } from '@/lib/booking-slots';

interface Props {
  grid: DaySlots[];
  selectedSlot: SlotCell | null;
  onSelectSlot: (slot: SlotCell) => void;
}

const CELL_W = 46;
const CELL_H = 40;
const TIME_W = 52;
const HEADER_H = 52;

export default function AvailabilityGrid({ grid, selectedSlot, onSelectSlot }: Props) {
  const headerRef = useRef<ScrollView>(null);
  const gridHRef = useRef<ScrollView>(null);

  if (!grid.length) return null;
  const timeCells = grid[0].cells;

  const syncScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    headerRef.current?.scrollTo({ x, animated: false });
    gridHRef.current?.scrollTo({ x, animated: false });
  };

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_W, height: HEADER_H }} />
        <ScrollView
          ref={headerRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
        >
          {grid.map((day, i) => {
            const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
            const today = isToday(day.date);
            return (
              <View key={i} style={[styles.headerCell, { width: CELL_W }]}>
                <Text style={[styles.headerWeekday, isWeekend && styles.textWeekend]}>
                  {format(day.date, 'EEE', { locale: ja })}
                </Text>
                <View style={[styles.dateBadge, today && styles.todayBadge]}>
                  <Text style={[styles.headerDate, isWeekend && styles.textWeekend, today && styles.todayText]}>
                    {format(day.date, 'd')}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Time labels */}
        <View style={{ width: TIME_W }}>
          {timeCells.map((cell, i) => (
            <View key={i} style={[styles.timeCell, { height: CELL_H }]}>
              <Text style={styles.timeText}>{format(cell.startTime, 'HH:mm')}</Text>
            </View>
          ))}
        </View>

        {/* Scrollable grid */}
        <ScrollView
          ref={gridHRef}
          horizontal
          onScroll={syncScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: 'row' }}>
            {grid.map((day, colIdx) => (
              <View key={colIdx} style={{ width: CELL_W }}>
                {day.cells.map((cell, rowIdx) => {
                  const isSelected = selectedSlot?.startTime.getTime() === cell.startTime.getTime();
                  return (
                    <TouchableOpacity
                      key={rowIdx}
                      style={[styles.cell, { height: CELL_H }]}
                      onPress={() => cell.available && onSelectSlot(cell)}
                      disabled={!cell.available}
                      activeOpacity={0.6}
                    >
                      {cell.available ? (
                        <Text style={[styles.iconAvailable, isSelected && styles.iconSelected]}>
                          {isSelected ? '●' : '○'}
                        </Text>
                      ) : (
                        <Text style={styles.iconUnavailable}>×</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: HEADER_H,
    gap: 2,
  },
  headerWeekday: { fontSize: 11, color: '#888' },
  headerDate: { fontSize: 14, fontWeight: '600', color: '#333' },
  textWeekend: { color: '#EA4335' },
  dateBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: { backgroundColor: '#4285F4' },
  todayText: { color: '#fff' },
  body: { flex: 1, flexDirection: 'row' },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  timeText: { fontSize: 11, color: '#888' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#f0f0f0',
  },
  iconAvailable: { fontSize: 18, color: '#4285F4' },
  iconSelected: { color: '#1a56db' },
  iconUnavailable: { fontSize: 16, color: '#ccc' },
});
