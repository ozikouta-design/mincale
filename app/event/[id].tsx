import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import EventForm from '@/components/event/EventForm';
import { useCalendarContext } from '@/context/CalendarContext';
import { EventFormData } from '@/types';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, updateEvent, deleteEvent, refreshEvents } = useCalendarContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDelete = () => {
    Alert.alert(
      '予定を削除',
      'この予定を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteEvent(id!, event.calendarId);
            if (success) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await refreshEvents();
              router.back();
            } else {
              Alert.alert('エラー', '予定の削除に失敗しました');
            }
          },
        },
      ],
    );
  };

  return (
    <EventForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      isSubmitting={isSubmitting}
    />
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
});
