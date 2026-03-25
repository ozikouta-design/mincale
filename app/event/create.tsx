import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import EventForm from '@/components/event/EventForm';
import { useCalendarContext } from '@/context/CalendarContext';
import { EventFormData } from '@/types';

export default function CreateEventScreen() {
  const router = useRouter();
  const { createEvent, refreshEvents } = useCalendarContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useLocalSearchParams<{ startTime?: string; endTime?: string }>();

  const initialData: Partial<EventFormData> | undefined = params.startTime ? {
    startTime: new Date(params.startTime),
    endTime: params.endTime
      ? new Date(params.endTime)
      : new Date(new Date(params.startTime).getTime() + 60 * 60 * 1000),
  } : undefined;

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

  return <EventForm initialData={initialData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
