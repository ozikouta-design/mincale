import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import EventForm from '@/components/event/EventForm';
import { useCalendarContext } from '@/context/CalendarContext';
import { EventFormData } from '@/types';

export default function CreateEventScreen() {
  const router = useRouter();
  const { createEvent, refreshEvents } = useCalendarContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createEvent(data);
      if (result) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshEvents();
        router.back();
      } else {
        Alert.alert('エラー', '予定の作成に失敗しました');
      }
    } catch {
      Alert.alert('エラー', '予定の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
