import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { addDays, isSameDay, format, isWeekend } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  days?: number;
}

export default function DateSelector({ selectedDate, onSelectDate, days = 14 }: Props) {
  const dates = Array.from({ length: days }, (_, i) => addDays(new Date(), i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map((date, i) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const weekend = isWeekend(date);

        return (
          <TouchableOpacity
            key={i}
            style={[
              styles.dateItem,
              isSelected && styles.selectedItem,
              weekend && !isSelected && styles.weekendItem,
            ]}
            onPress={() => onSelectDate(date)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dayLabel,
              isSelected && styles.selectedText,
              weekend && !isSelected && styles.weekendText,
            ]}>
              {format(date, 'E', { locale: ja })}
            </Text>
            <Text style={[
              styles.dateLabel,
              isSelected && styles.selectedText,
              isToday && !isSelected && styles.todayText,
              weekend && !isSelected && styles.weekendText,
            ]}>
              {format(date, 'd')}
            </Text>
            <Text style={[
              styles.monthLabel,
              isSelected && styles.selectedText,
              weekend && !isSelected && styles.weekendText,
            ]}>
              {format(date, 'M月', { locale: ja })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateItem: {
    width: 56,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8ecf4',
  },
  selectedItem: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  weekendItem: {
    backgroundColor: '#fafafa',
    borderColor: '#f0f0f0',
  },
  dayLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  dateLabel: { fontSize: 18, fontWeight: '600', color: '#333' },
  monthLabel: { fontSize: 10, color: '#999', marginTop: 1 },
  selectedText: { color: '#fff' },
  todayText: { color: '#4285F4' },
  weekendText: { color: '#ccc' },
});
