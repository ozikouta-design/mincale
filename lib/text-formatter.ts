import { FreeSlot } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}min`;
}

export function formatFreeSlots(slots: FreeSlot[]): string {
  if (slots.length === 0) return '空き時間はありません';

  const lines: string[] = ['--- 空き時間 ---'];
  let lastDateStr = '';

  for (const slot of slots) {
    const dateStr = format(slot.date, 'M/d(E)', { locale: ja });
    const start = format(slot.startTime, 'HH:mm');
    const end = format(slot.endTime, 'HH:mm');
    const duration = formatDuration(slot.durationMinutes);

    if (dateStr !== lastDateStr) {
      if (lastDateStr) lines.push('');
      lastDateStr = dateStr;
    }

    lines.push(`${dateStr} ${start}-${end} (${duration})`);
  }

  return lines.join('\n');
}

export function formatSingleSlot(slot: FreeSlot): string {
  const dateStr = format(slot.date, 'M/d(E)', { locale: ja });
  const start = format(slot.startTime, 'HH:mm');
  const end = format(slot.endTime, 'HH:mm');
  const duration = formatDuration(slot.durationMinutes);
  return `${dateStr} ${start}-${end} (${duration})`;
}
