import React from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FreeSlot } from '@/types';
import FreeSlotCard from './FreeSlotCard';

interface Props {
  slots: FreeSlot[];
}

interface Section {
  title: string;
  data: FreeSlot[];
}

export default function FreeSlotList({ slots }: Props) {
  // Group by date
  const sections: Section[] = [];
  let currentDateStr = '';
  let currentSection: Section | null = null;

  for (const slot of slots) {
    const dateStr = format(slot.date, 'M月d日(E)', { locale: ja });
    if (dateStr !== currentDateStr) {
      currentDateStr = dateStr;
      currentSection = { title: dateStr, data: [] };
      sections.push(currentSection);
    }
    currentSection!.data.push(slot);
  }

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>空き時間はありません</Text>
        <Text style={styles.emptySubtext}>選択した期間にはすべて予定が入っています</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.startTime.toISOString()}-${index}`}
      renderItem={({ item }) => <FreeSlotCard slot={item} />}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 100 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
});
