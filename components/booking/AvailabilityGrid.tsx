import React, { useRef, useMemo } from 'react';
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

const TIME_W = 64;
const CELL_W = 46;
const CELL_H = 42;
const DATE_H = 52;
const MONTH_H = 26;

export default function AvailabilityGrid({ grid, selectedSlot, onSelectSlot }: Props) {
  const headerRef = useRef<ScrollView>(null);
  const gridRef = useRef<ScrollView>(null);

  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let cur = '';
    grid.forEach(day => {
      const m = format(day.date, 'yyyy年M月', { locale: ja });
      if (m !== cur) { groups.push({ label: m, count: 1 }); cur = m; }
      else groups[groups.length - 1].count++;
    });
    return groups;
  }, [grid]);

  if (!grid.length) return null;
  const timeCells = grid[0].cells;

  const onGridScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  const isSat = (d: Date) => d.getDay() === 6;
  const isSun = (d: Date) => d.getDay() === 0;

  return (
    <View style={styles.container}>
      {/* ── Sticky Header ── */}
      <View style={styles.headerWrapper}>
        {/* Corner: 開始時刻 */}
        <View style={styles.cornerCell}>
          <Text style={styles.cornerLabel}>開始時刻</Text>
        </View>

        {/* Month + Date headers (synced h-scroll) */}
        <ScrollView
          ref={headerRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* Month row */}
          <View style={styles.monthRow}>
            {monthGroups.map((g, i) => (
              <View key={i} style={[styles.monthCell, { width: g.count * CELL_W }]}>
                <Text style={styles.monthLabel}>{g.label}</Text>
              </View>
            ))}
          </View>
          {/* Date row */}
          <View style={styles.dateRow}>
            {grid.map((day, i) => {
              const sat = isSat(day.date);
              const sun = isSun(day.date);
              const today = isToday(day.date);
              return (
                <View key={i} style={[styles.dateCell, { width: CELL_W }]}>
                  <View style={[
                    styles.dateBadge,
                    today && styles.todayBadge,
                    sat && styles.satBadge,
                  ]}>
                    <Text style={[
                      styles.dateNum,
                      today && styles.todayNum,
                      (sat || sun) && !today && styles.weekendNum,
                    ]}>
                      {format(day.date, 'd')}
                    </Text>
                  </View>
                  <Text style={[styles.weekdayLabel, (sat || sun) && styles.weekendLabel]}>
                    ({format(day.date, 'EEE', { locale: ja })})
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Body ── */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Fixed time column */}
          <View style={styles.timeColumn}>
            {timeCells.map((cell, i) => (
              <View key={i} style={[styles.timeCell, { height: CELL_H }]}>
                <Text style={styles.timeText}>{format(cell.startTime, 'HH:mm')}</Text>
              </View>
            ))}
          </View>

          {/* Scrollable grid */}
          <ScrollView
            ref={gridRef}
            horizontal
            onScroll={onGridScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={true}
            style={{ flex: 1 }}
          >
            <View style={{ flexDirection: 'row' }}>
              {grid.map((day, colIdx) => {
                const sat = isSat(day.date);
                const sun = isSun(day.date);
                return (
                  <View
                    key={colIdx}
                    style={[
                      { width: CELL_W },
                      sat && styles.satCol,
                      sun && styles.sunCol,
                    ]}
                  >
                    {day.cells.map((cell, rowIdx) => {
                      const selected = selectedSlot?.startTime.getTime() === cell.startTime.getTime();
                      return (
                        <TouchableOpacity
                          key={rowIdx}
                          style={[styles.cell, { height: CELL_H }]}
                          onPress={() => cell.available && onSelectSlot(cell)}
                          disabled={!cell.available}
                          activeOpacity={0.6}
                        >
                          {cell.available ? (
                            <Text style={[styles.iconO, selected && styles.iconOSelected]}>
                              {selected ? '●' : '○'}
                            </Text>
                          ) : (
                            <Text style={styles.iconX}>×</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const BORDER = StyleSheet.hairlineWidth;
const BORDER_COLOR = '#e0e0e0';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* Header */
  headerWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    backgroundColor: '#fff',
  },
  cornerCell: {
    width: TIME_W,
    height: MONTH_H + DATE_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  cornerLabel: { fontSize: 10, color: '#888', fontWeight: '600', letterSpacing: 0.3 },

  monthRow: { flexDirection: 'row', height: MONTH_H },
  monthCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: BORDER,
    borderBottomColor: BORDER_COLOR,
    borderRightWidth: BORDER,
    borderRightColor: BORDER_COLOR,
  },
  monthLabel: { fontSize: 12, fontWeight: '700', color: '#444' },

  dateRow: { flexDirection: 'row', height: DATE_H },
  dateCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRightWidth: BORDER,
    borderRightColor: BORDER_COLOR,
  },
  dateBadge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBadge: { backgroundColor: '#4285F4' },
  satBadge: { backgroundColor: '#ffe5e5' },
  dateNum: { fontSize: 16, fontWeight: '700', color: '#333' },
  todayNum: { color: '#fff' },
  weekendNum: { color: '#EA4335' },
  weekdayLabel: { fontSize: 11, color: '#999' },
  weekendLabel: { color: '#EA4335' },

  /* Body */
  timeColumn: {
    width: TIME_W,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: BORDER,
    borderBottomColor: BORDER_COLOR,
  },
  timeText: { fontSize: 11, color: '#777' },

  satCol: { backgroundColor: '#fffafa' },
  sunCol: { backgroundColor: '#fff9f9' },

  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: BORDER,
    borderBottomColor: BORDER_COLOR,
    borderRightWidth: BORDER,
    borderRightColor: BORDER_COLOR,
  },
  iconO: { fontSize: 20, color: '#4285F4' },
  iconOSelected: { color: '#1557d0' },
  iconX: { fontSize: 17, color: '#bbb' },
});
