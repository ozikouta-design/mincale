import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCalendarContext } from '@/context/CalendarContext';
import { ViewMode } from '@/types';
import { C, SHADOW, R } from '@/constants/design';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'day',   label: '日' },
  { key: 'week',  label: '週' },
  { key: 'month', label: '月' },
];

interface CalendarHeaderProps {
  onNext?: () => void;
  onPrev?: () => void;
}

export default function CalendarHeader({ onNext, onPrev }: CalendarHeaderProps) {
  const {
    viewMode, setViewMode, currentDate, goNext, goPrev, goToday,
    isAuthenticated, calendarGroups, activeGroupId, setActiveGroupId,
  } = useCalendarContext();
  const handleNext = onNext ?? goNext;
  const handlePrev = onPrev ?? goPrev;
  const router = useRouter();

  const title = (() => {
    switch (viewMode) {
      case 'month': return format(currentDate, 'yyyy年 M月', { locale: ja });
      case 'week':  return format(currentDate, 'yyyy年 M月', { locale: ja });
      case 'day':   return format(currentDate, 'M月d日(E)', { locale: ja });
    }
  })();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* 左：ナビゲーション */}
        <View style={styles.navGroup}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn} activeOpacity={0.6}>
            <ChevronLeft size={18} color={C.textSub} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleNext} style={styles.navBtn} activeOpacity={0.6}>
            <ChevronRight size={18} color={C.textSub} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* 右：今日 + 表示切替 + 追加 */}
        <View style={styles.rightGroup}>
          <TouchableOpacity onPress={goToday} style={styles.todayBtn} activeOpacity={0.8}>
            <Text style={styles.todayText}>今日</Text>
          </TouchableOpacity>
          <View style={styles.segmentWrap}>
            {VIEW_MODES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setViewMode(key)}
                style={[styles.segBtn, viewMode === key && styles.segBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.segTxt, viewMode === key && styles.segTxtActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isAuthenticated && (
            <TouchableOpacity
              onPress={() => router.push('/event/create')}
              style={styles.addBtn}
              activeOpacity={0.8}
            >
              <Plus size={16} color={C.inverse} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* グループフィルターチップ */}
      {calendarGroups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          <TouchableOpacity
            onPress={() => setActiveGroupId(null)}
            style={[styles.chip, activeGroupId === null && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipTxt, activeGroupId === null && styles.chipTxtActive]}>
              すべて
            </Text>
          </TouchableOpacity>
          {calendarGroups.map(group => (
            <TouchableOpacity
              key={group.id}
              onPress={() => setActiveGroupId(activeGroupId === group.id ? null : group.id)}
              style={[styles.chip, activeGroupId === group.id && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipTxt, activeGroupId === group.id && styles.chipTxtActive]}>
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    ...SHADOW.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    minWidth: 110,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: C.primary,
  },
  todayText: {
    color: C.inverse,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: R.sm,
    padding: 2,
  },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 7,
  },
  segBtnActive: {
    backgroundColor: C.card,
    ...SHADOW.xs,
  },
  segTxt: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '500',
  },
  segTxtActive: {
    color: C.primary,
    fontWeight: '700',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: R.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: {
    marginTop: 8,
  },
  chipContent: {
    paddingHorizontal: 2,
    gap: 6,
    flexDirection: 'row',
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: R.full,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  chipTxt: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '500',
  },
  chipTxtActive: {
    color: C.primary,
    fontWeight: '700',
  },
});
