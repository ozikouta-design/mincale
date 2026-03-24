import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, addDays, addWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  startDate: Date;
  endDate: Date;
  onChangeRange: (start: Date, end: Date) => void;
}

const PRESETS = [
  { label: '今日', days: 0 },
  { label: '3日間', days: 3 },
  { label: '1週間', days: 7 },
  { label: '2週間', days: 14 },
];

export default function DateRangePicker({ startDate, endDate, onChangeRange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>期間</Text>
      <Text style={styles.range}>
        {format(startDate, 'M/d(E)', { locale: ja })} - {format(endDate, 'M/d(E)', { locale: ja })}
      </Text>
      <View style={styles.presets}>
        {PRESETS.map(preset => {
          const isActive =
            Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) === preset.days;
          return (
            <TouchableOpacity
              key={preset.label}
              onPress={() => {
                const today = new Date();
                onChangeRange(today, addDays(today, preset.days));
              }}
              style={[styles.presetButton, isActive && styles.presetActive]}
            >
              <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  range: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  presetActive: {
    backgroundColor: '#4285F4',
  },
  presetText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#fff',
  },
});
