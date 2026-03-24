import React from 'react';
import { format } from 'date-fns';

interface Props {
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
}

export default function DatePickerField({ value, mode, onChange }: Props) {
  const inputType = mode === 'date' ? 'date' : 'time';
  const inputValue = mode === 'date'
    ? format(value, 'yyyy-MM-dd')
    : format(value, 'HH:mm');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(value);
    if (mode === 'date') {
      const [year, month, day] = e.target.value.split('-').map(Number);
      if (!isNaN(year)) newDate.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      if (!isNaN(hours)) newDate.setHours(hours, minutes);
    }
    onChange(newDate);
  };

  return (
    <input
      type={inputType}
      value={inputValue}
      onChange={handleChange}
      style={{
        fontSize: 16,
        color: '#4285F4',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        cursor: 'pointer',
      }}
    />
  );
}
