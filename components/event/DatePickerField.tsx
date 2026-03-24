import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
}

export default function DatePickerField({ value, mode, onChange }: Props) {
  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) onChange(date);
  };

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
      onChange={handleChange}
      minuteInterval={mode === 'time' ? 5 : undefined}
      locale="ja"
    />
  );
}
