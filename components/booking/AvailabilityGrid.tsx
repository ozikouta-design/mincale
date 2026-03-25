import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { format, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DaySlots, SlotCell } from '@/lib/booking-slots';

interface Props {
  grid: DaySlots[];
  selectedSlot: SlotCell | null;
  onSelectSlot: (slot: SlotCell) => void;
}

const TIME_W = 56;
const CELL_W = 48;
const CELL_H = 44;
const DATE_H = 52;
const MONTH_H = 24;

const BORDER = StyleSheet.hairlineWidth;
const BORDER_COLOR = '#e0e0e0';

export default function AvailabilityGrid({ grid, selectedSlot, onSelectSlot }: Props) {
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

  const isSat = (d: Date) => d.getDay() === 6;
  const isSun = (d: Date) => d.getDay() === 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* ── 固定左カラム（開始時刻ラベル） ── */}
        <View style={styles.leftColumn}>
          {/* コーナー */}
          <View style={styles.cornerCell}>
            <Text style={styles.cornerLabel}>開始時刻</Text>
          </View>
          {/* 時刻ラベル */}
          {timeCells.map((cell, i) => (
            <View key={i} style={styles.timeCell}>
              <Text style={styles.timeText}>{format(cell.startTime, 'HH:mm')}</Text>
            </View>
          ))}
        </View>

        {/* ── 横スクロール（月ヘッダー・日付ヘッダー・データ行を全て同じScrollView内） ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.scrollArea}
        >
          <View>
            {/* 月ヘッダー行 */}
            <View style={styles.monthRow}>
              {monthGroups.map((g, i) => (
                <View key={i} style={[styles.monthCell, { width: g.count * CELL_W }]}>
                  <Text style={styles.monthLabel}>{g.label}</Text>
                </View>
              ))}
            </View>

            {/* 日付ヘッダー行 */}
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
                        sat && !today && styles.satNum,
                        sun && !today && styles.sunNum,
                      ]}>
                        {format(day.date, 'd')}
                      </Text>
                    </View>
                    <Text style={[styles.weekdayLabel, sat && styles.satLabel, sun && styles.sunLabel]}>
                      ({format(day.date, 'EEE', { locale: ja })})
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* データ行（時刻ごと） */}
            {timeCells.map((_, rowIdx) => (
              <View key={rowIdx} style={styles.dataRow}>
                {grid.map((day, colIdx) => {
                  const cell = day.cells[rowIdx];
                  const sat = isSat(day.date);
                  const sun = isSun(day.date);
                  const selected = selectedSlot?.startTime.getTime() === cell.startTime.getTime();
                  return (
                    <TouchableOpacity
                      key={colIdx}
                      style={[
                        styles.cell,
                        { width: CELL_W, height: CELL_H },
                        sat && styles.satCol,
                        sun && styles.sunCol,
                      ]}
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
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: { flexDirection: 'row', flex: 1 },

  /* 固定左カラム */
  leftColumn: {
    width: TIME_W,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    backgroundColor: '#fff',
  },
  cornerCell: {
    height: MONTH_H + DATE_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  cornerLabel: { fontSize: 10, color: '#888', fontWeight: '600', letterSpacing: 0.3 },
  timeCell: {
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: BORDER,
    borderBottomColor: BORDER_COLOR,
  },
  timeText: { fontSize: 11, color: '#777' },

  /* 横スクロールエリア */
  scrollArea: { flex: 1 },

  /* 月ヘッダー */
  monthRow: {
    flexDirection: 'row',
    height: MONTH_H,
    borderBottomWidth: BORDER,
    borderBottomColor: BORDER_COLOR,
  },
  monthCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BORDER,
    borderRightColor: BORDER_COLOR,
  },
  monthLabel: { fontSize: 12, fontWeight: '700', color: '#444' },

  /* 日付ヘッダー */
  dateRow: {
    flexDirection: 'row',
    height: DATE_H,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
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
  satBadge: { backgroundColor: '#e8f0fe' },
  dateNum: { fontSize: 15, fontWeight: '700', color: '#333' },
  todayNum: { color: '#fff' },
  satNum: { color: '#4285F4' },
  sunNum: { color: '#EA4335' },
  weekdayLabel: { fontSize: 11, color: '#999' },
  satLabel: { color: '#4285F4' },
  sunLabel: { color: '#EA4335' },

  /* データ行 */
  dataRow: { flexDirection: 'row' },
  satCol: { backgroundColor: '#f0f7ff' },
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
