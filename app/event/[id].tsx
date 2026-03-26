import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Modal, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import EventForm from '@/components/event/EventForm';
import { useCalendarContext } from '@/context/CalendarContext';
import { EventFormData } from '@/types';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, updateEvent, deleteEvent, deleteRecurringEvent, refreshEvents } = useCalendarContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const event = events.find(e => e.id === id);

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>予定が見つかりません</Text>
      </View>
    );
  }

  const initialData: Partial<EventFormData> = {
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    location: event.location || '',
    description: event.description || '',
    calendarId: event.calendarId,
  };

  const handleSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const success = await updateEvent(id!, data);
      if (success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshEvents();
        router.back();
      } else {
        Alert.alert('エラー', '予定の更新に失敗しました');
      }
    } catch {
      Alert.alert('エラー', '予定の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 通常予定の削除
  const doDelete = async () => {
    const success = await deleteEvent(id!, event.calendarId);
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshEvents();
      router.back();
    } else {
      if (Platform.OS === 'web') {
        window.alert('予定の削除に失敗しました');
      } else {
        Alert.alert('エラー', '予定の削除に失敗しました');
      }
    }
  };

  // 繰り返し予定の削除（モード指定）
  const doDeleteRecurring = async (mode: 'single' | 'following' | 'all') => {
    setShowRecurringModal(false);
    const success = await deleteRecurringEvent(
      id!,
      event.calendarId,
      event.recurringEventId!,
      event.startTime,
      mode,
    );
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshEvents();
      router.back();
    } else {
      if (Platform.OS === 'web') {
        window.alert('予定の削除に失敗しました');
      } else {
        Alert.alert('エラー', '予定の削除に失敗しました');
      }
    }
  };

  const handleDelete = () => {
    if (event.recurringEventId) {
      // 繰り返し予定 → 削除方法を選択
      if (Platform.OS === 'web') {
        setShowRecurringModal(true);
      } else {
        Alert.alert(
          '繰り返し予定の削除',
          'どの予定を削除しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'この予定のみ', onPress: () => doDeleteRecurring('single') },
            { text: 'これ以降の予定', onPress: () => doDeleteRecurring('following') },
            { text: '全ての予定', style: 'destructive', onPress: () => doDeleteRecurring('all') },
          ],
        );
      }
    } else {
      // 通常予定
      if (Platform.OS === 'web') {
        if (window.confirm('この予定を削除しますか？')) doDelete();
      } else {
        Alert.alert('予定を削除', 'この予定を削除しますか？', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: doDelete },
        ]);
      }
    }
  };

  return (
    <>
      <EventForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isSubmitting={isSubmitting}
      />

      {/* Web向け繰り返し予定削除モーダル */}
      <Modal
        visible={showRecurringModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecurringModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>繰り返し予定の削除</Text>
            <Text style={styles.modalSubtitle}>どの予定を削除しますか？</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => doDeleteRecurring('single')}
            >
              <Text style={styles.optionText}>この予定のみ</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => doDeleteRecurring('following')}
            >
              <Text style={styles.optionText}>これ以降の予定</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => doDeleteRecurring('all')}
            >
              <Text style={[styles.optionText, styles.destructiveText]}>全ての予定</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setShowRecurringModal(false)}
            >
              <Text style={[styles.optionText, styles.cancelText]}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  notFoundText: { fontSize: 16, color: '#999' },
  // 繰り返し削除モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 300,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  destructiveText: {
    color: '#EA4335',
  },
  cancelText: {
    color: '#999',
  },
});
