import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCalendarContext } from '@/context/CalendarContext';
import { ViewMode } from '@/types';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'day', label: '日' },
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
];

interface CalendarHeaderProps {
  // ナビゲーションボタンのオーバーライド（アニメーション用）
  onNext?: () => void;
  onPrev?: () => void;
}

export default function CalendarHeader({ onNext, onPrev }: CalendarHeaderProps) {
  const { viewMode, setViewMode, currentDate, goNext, goPrev, goToday, isAuthenticated, calendarGroups, activeGroupId, setActiveGroupId } = useCalendarContext();
  // 上位コンポーネントからオーバーライドがあればそちらを使う
  const handleNext = onNext ?? goNext;
  const handlePrev = onPrev ?? goPrev;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const title = (() => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'yyyy年M月', { locale: ja });
      case 'week':
        return format(currentDate, 'yyyy年M月', { locale: ja });
      case 'day':
        return format(currentDate, 'M月d日(E)', { locale: ja });
    }
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={handleNext} style={styles.navButton}>
            <ChevronRight size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.rightButtons}>
          <TouchableOpacity onPress={goToday} style={styles.todayButton}>
            <Text style={styles.todayText}>今日</Text>
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity
              onPress={() => router.push('/event/create')}
              style={styles.addButton}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.modeRow}>
        {VIEW_MODES.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setViewMode(key)}
            style={[
              styles.modeButton,
              viewMode === key && styles.modeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.modeText,
                viewMode === key && styles.modeTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {calendarGroups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.groupChipRow}
          contentContainerStyle={styles.groupChipContent}
        >
          <TouchableOpacity
            onPress={() => setActiveGroupId(null)}
            style={[styles.groupChip, activeGroupId === null && styles.groupChipActive]}
          >
            <Text style={[styles.groupChipText, activeGroupId === null && styles.groupChipTextActive]}>
              全て
            </Text>
          </TouchableOpacity>
          {calendarGroups.map(group => (
            <TouchableOpacity
              key={group.id}
              onPress={() => setActiveGroupId(activeGroupId === group.id ? null : group.id)}
              style={[styles.groupChip, activeGroupId === group.id && styles.groupChipActive]}
            >
              <Text style={[styles.groupChipText, activeGroupId === group.id && styles.groupChipTextActive]}>
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#4285F4',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34A853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  groupChipRow: {
    marginTop: 8,
  },
  groupChipContent: {
    paddingHorizontal: 2,
    gap: 6,
    flexDirection: 'row',
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groupChipActive: {
    backgroundColor: '#e8f0fe',
    borderColor: '#4285F4',
  },
  groupChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  groupChipTextActive: {
    color: '#4285F4',
    fontWeight: '600',
  },
});
