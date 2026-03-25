import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Platform, Alert,
} from 'react-native';
import DatePickerField from './DatePickerField';
import { MapPin, FileText, Trash2, ChevronDown, Check, CalendarDays } from 'lucide-react-native';
import { EventFormData } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCalendarContext } from '@/context/CalendarContext';

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export default function EventForm({ initialData, onSubmit, onDelete, isSubmitting }: EventFormProps) {
  const { calendarList } = useCalendarContext();
  const [title, setTitle] = useState(initialData?.title || '');
  const [isAllDay, setIsAllDay] = useState(initialData?.isAllDay || false);
  const [startTime, setStartTime] = useState(initialData?.startTime || getDefaultStart());
  const [endTime, setEndTime] = useState(initialData?.endTime || getDefaultEnd());
  const [location, setLocation] = useState(initialData?.location || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [calendarId, setCalendarId] = useState<string>(
    initialData?.calendarId || calendarList.find(c => c.primary)?.id || calendarList[0]?.id || 'primary',
  );
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  // Picker visibility state (Android shows as dialog)
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  const selectedCalendar = calendarList.find(c => c.id === calendarId);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (endTime <= startTime) {
      Alert.alert('エラー', '終了時刻は開始時刻より後にしてください');
      return;
    }
    onSubmit({ title: title.trim(), startTime, endTime, isAllDay, location, description, calendarId });
  };

  const onChangeStartDate = (date: Date) => {
    const newStart = new Date(startTime);
    newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setStartTime(newStart);
    if (newStart >= endTime) {
      const newEnd = new Date(newStart);
      newEnd.setHours(newEnd.getHours() + 1);
      setEndTime(newEnd);
    }
    setShowStartDate(false);
  };

  const onChangeStartTime = (date: Date) => {
    setStartTime(date);
    if (date >= endTime) {
      const newEnd = new Date(date);
      newEnd.setHours(newEnd.getHours() + 1);
      setEndTime(newEnd);
    }
    setShowStartTime(false);
  };

  const onChangeEndDate = (date: Date) => {
    const newEnd = new Date(endTime);
    newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setEndTime(newEnd);
    setShowEndDate(false);
  };

  const onChangeEndTime = (date: Date) => {
    setEndTime(date);
    setShowEndTime(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="タイトルを追加"
        placeholderTextColor="#999"
        fontSize={20}
      />

      {/* All Day Toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>終日</Text>
        <Switch
          value={isAllDay}
          onValueChange={setIsAllDay}
          trackColor={{ true: '#4285F4' }}
        />
      </View>

      <View style={styles.divider} />

      {/* Start Date/Time */}
      <TouchableOpacity style={styles.row} onPress={() => setShowStartDate(true)}>
        <Text style={styles.label}>開始</Text>
        <Text style={styles.dateText}>
          {format(startTime, 'M月d日(E)', { locale: ja })}
        </Text>
      </TouchableOpacity>
      {showStartDate && (
        <DatePickerField value={startTime} mode="date" onChange={onChangeStartDate} />
      )}

      {!isAllDay && (
        <>
          <TouchableOpacity style={styles.row} onPress={() => setShowStartTime(true)}>
            <Text style={styles.label}>開始時刻</Text>
            <Text style={styles.dateText}>{format(startTime, 'HH:mm')}</Text>
          </TouchableOpacity>
          {showStartTime && (
            <DatePickerField value={startTime} mode="time" onChange={onChangeStartTime} />
          )}
        </>
      )}

      <View style={styles.divider} />

      {/* End Date/Time */}
      <TouchableOpacity style={styles.row} onPress={() => setShowEndDate(true)}>
        <Text style={styles.label}>終了</Text>
        <Text style={styles.dateText}>
          {format(endTime, 'M月d日(E)', { locale: ja })}
        </Text>
      </TouchableOpacity>
      {showEndDate && (
        <DatePickerField value={endTime} mode="date" onChange={onChangeEndDate} />
      )}

      {!isAllDay && (
        <>
          <TouchableOpacity style={styles.row} onPress={() => setShowEndTime(true)}>
            <Text style={styles.label}>終了時刻</Text>
            <Text style={styles.dateText}>{format(endTime, 'HH:mm')}</Text>
          </TouchableOpacity>
          {showEndTime && (
            <DatePickerField value={endTime} mode="time" onChange={onChangeEndTime} />
          )}
        </>
      )}

      <View style={styles.divider} />

      {/* Calendar Selector */}
      {calendarList.length > 0 && (
        <>
          <TouchableOpacity style={styles.row} onPress={() => setShowCalendarPicker(v => !v)}>
            <View style={styles.calRowLeft}>
              <CalendarDays size={20} color="#666" />
              <Text style={styles.label}>カレンダー</Text>
            </View>
            <View style={styles.calRowRight}>
              <View style={[styles.calDot, { backgroundColor: selectedCalendar?.backgroundColor || '#4285F4' }]} />
              <Text style={styles.calName} numberOfLines={1}>{selectedCalendar?.summary || 'マイカレンダー'}</Text>
              <ChevronDown size={16} color="#999" style={{ transform: [{ rotate: showCalendarPicker ? '180deg' : '0deg' }] }} />
            </View>
          </TouchableOpacity>
          {showCalendarPicker && (
            <View style={styles.calPickerList}>
              {calendarList.map(cal => (
                <TouchableOpacity
                  key={cal.id}
                  style={styles.calPickerRow}
                  onPress={() => { setCalendarId(cal.id); setShowCalendarPicker(false); }}
                >
                  <View style={[styles.calDot, { backgroundColor: cal.backgroundColor }]} />
                  <Text style={styles.calPickerName} numberOfLines={1}>{cal.summary}</Text>
                  {calendarId === cal.id && <Check size={16} color="#4285F4" strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.divider} />
        </>
      )}

      {/* Location */}
      <View style={styles.inputRow}>
        <MapPin size={20} color="#666" />
        <TextInput
          style={styles.fieldInput}
          value={location}
          onChangeText={setLocation}
          placeholder="場所を追加"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.divider} />

      {/* Description */}
      <View style={styles.inputRow}>
        <FileText size={20} color="#666" />
        <TextInput
          style={[styles.fieldInput, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="メモを追加"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={{ height: 24 }} />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? '保存中...' : '保存'}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      {onDelete && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Trash2 size={18} color="#EA4335" />
          <Text style={styles.deleteText}>この予定を削除</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getDefaultStart(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 30) * 30;
  now.setMinutes(roundedMinutes, 0, 0);
  return now;
}

function getDefaultEnd(): Date {
  const start = getDefaultStart();
  return new Date(start.getTime() + 60 * 60 * 1000);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: { fontSize: 16, color: '#333' },
  dateText: { fontSize: 16, color: '#4285F4' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8ecf4',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
  },
  deleteText: { color: '#EA4335', fontSize: 16, fontWeight: '500' },
  calRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end', maxWidth: '60%' },
  calDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  calName: { fontSize: 15, color: '#4285F4', flexShrink: 1 },
  calPickerList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 0,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  calPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  calPickerName: { flex: 1, fontSize: 15, color: '#333' },
});
