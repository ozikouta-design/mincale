import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

const MEETING_TYPES = [
  { key: 'zoom', label: 'Zoom' },
  { key: 'google_meet', label: 'Google Meet' },
  { key: 'in_person', label: '対面' },
  { key: 'other', label: 'その他' },
];

interface Props {
  slot: BookingSlot;
  isSubmitting: boolean;
  onSubmit: (guestName: string, guestPhone: string, guestMemo: string, meetingType: string) => void;
  onBack: () => void;
}

export default function BookingForm({ slot, isSubmitting, onSubmit, onBack }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [memo, setMemo] = useState('');
  const [meetingType, setMeetingType] = useState('zoom');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'お名前を入力してください');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('エラー', '電話番号を入力してください');
      return;
    }
    onSubmit(name.trim(), phone.trim(), memo.trim(), meetingType);
  };

  return (
    <View style={styles.container}>
      {/* Selected slot summary */}
      <View style={styles.slotSummary}>
        <Text style={styles.slotDate}>
          {format(slot.startTime, 'M月d日(E)', { locale: ja })}
        </Text>
        <Text style={styles.slotTime}>
          {format(slot.startTime, 'HH:mm')} - {format(slot.endTime, 'HH:mm')}
        </Text>
      </View>

      {/* Name */}
      <Text style={styles.label}>お名前 *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="山田 太郎"
        placeholderTextColor="#ccc"
        accessibilityLabel="お名前（必須）"
        accessibilityHint="予約者のお名前をフルネームで入力してください"
      />

      {/* Phone */}
      <Text style={styles.label}>電話番号 *</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="090-0000-0000"
        placeholderTextColor="#ccc"
        keyboardType="phone-pad"
        accessibilityLabel="電話番号（必須）"
        accessibilityHint="折り返し連絡先の電話番号を入力してください"
      />

      {/* Meeting Type */}
      <Text style={styles.label}>ミーティング形式</Text>
      <View style={styles.typeRow}>
        {MEETING_TYPES.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.typeButton, meetingType === key && styles.typeButtonActive]}
            onPress={() => setMeetingType(key)}
            accessibilityRole="radio"
            accessibilityLabel={`ミーティング形式: ${label}`}
            accessibilityState={{ checked: meetingType === key }}
          >
            <Text style={[styles.typeText, meetingType === key && styles.typeTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Memo */}
      <Text style={styles.label}>メモ</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={memo}
        onChangeText={setMemo}
        placeholder="ご用件など"
        placeholderTextColor="#ccc"
        multiline
        numberOfLines={3}
        accessibilityLabel="メモ（任意）"
        accessibilityHint="ご用件や質問事項があれば入力してください"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="予約を確定する"
        accessibilityState={{ disabled: isSubmitting }}
        accessibilityHint="入力内容を確認してタップすると予約が完了します"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>予約する</Text>
        )}
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="時間選択に戻る"
        accessibilityHint="別の時間帯を選択する画面に戻ります"
      >
        <Text style={styles.backText}>時間を選び直す</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  slotSummary: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  slotDate: { fontSize: 16, fontWeight: '600', color: '#333' },
  slotTime: { fontSize: 20, fontWeight: '700', color: '#4285F4', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44,
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  typeText: { fontSize: 14, color: '#666' },
  typeTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#34A853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  backText: { color: '#4285F4', fontSize: 15 },
});
