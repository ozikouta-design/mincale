import { CalendarEvent, FreeSlot, FreeSlotOptions } from '@/types';
import {
  startOfDay, endOfDay, addDays, setHours, setMinutes,
  isWeekend, differenceInMinutes, isBefore, isAfter, max, min,
} from 'date-fns';

interface BusyPeriod {
  start: Date;
  end: Date;
}

function mergeBusyPeriods(periods: BusyPeriod[]): BusyPeriod[] {
  if (periods.length === 0) return [];
  const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BusyPeriod[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = max([last.end, sorted[i].end]);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export function detectFreeSlots(
  events: CalendarEvent[],
  options: FreeSlotOptions
): FreeSlot[] {
  const { startDate, endDate, workingHoursStart, workingHoursEnd, minimumSlotMinutes, excludeWeekends } = options;
  const freeSlots: FreeSlot[] = [];

  let currentDay = startOfDay(startDate);
  const lastDay = startOfDay(endDate);

  while (currentDay <= lastDay) {
    if (excludeWeekends && isWeekend(currentDay)) {
      currentDay = addDays(currentDay, 1);
      continue;
    }

    const workStart = setMinutes(setHours(currentDay, workingHoursStart), 0);
    const workEnd = setMinutes(setHours(currentDay, workingHoursEnd), 0);

    // Collect busy periods for this day
    const dayBusy: BusyPeriod[] = events
      .filter(e => {
        if (e.isAllDay) {
          // Only block THIS day's all-day events
          const eventDay = startOfDay(e.startTime);
          return eventDay.getTime() === currentDay.getTime();
        }
        return isBefore(e.startTime, workEnd) && isAfter(e.endTime, workStart);
      })
      .map(e => {
        if (e.isAllDay) return { start: workStart, end: workEnd };
        return {
          start: max([e.startTime, workStart]),
          end: min([e.endTime, workEnd]),
        };
      });

    const merged = mergeBusyPeriods(dayBusy);

    // Find gaps
    let cursor = workStart;
    for (const busy of merged) {
      if (isBefore(cursor, busy.start)) {
        const durationMin = differenceInMinutes(busy.start, cursor);
        if (durationMin >= minimumSlotMinutes) {
          freeSlots.push({
            date: currentDay,
            startTime: new Date(cursor),
            endTime: new Date(busy.start),
            durationMinutes: durationMin,
          });
        }
      }
      cursor = max([cursor, busy.end]);
    }

    // Check remaining time after last event
    if (isBefore(cursor, workEnd)) {
      const durationMin = differenceInMinutes(workEnd, cursor);
      if (durationMin >= minimumSlotMinutes) {
        freeSlots.push({
          date: currentDay,
          startTime: new Date(cursor),
          endTime: new Date(workEnd),
          durationMinutes: durationMin,
        });
      }
    }

    currentDay = addDays(currentDay, 1);
  }

  return freeSlots;
}
