import { setHours, setMinutes, setSeconds, addMinutes, isAfter, isBefore, startOfDay, addDays } from 'date-fns';

export interface SlotCell {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface DaySlots {
  date: Date;
  cells: SlotCell[];
}

interface BusyPeriod {
  start_time: string;
  end_time: string;
}

export function computeAvailabilityGrid(
  startDate: Date,
  durationMinutes: number,
  startHour: number,
  endHour: number,
  busyPeriods: BusyPeriod[],
  days = 14,
): DaySlots[] {
  const now = new Date();
  const grid: DaySlots[] = [];

  for (let d = 0; d < days; d++) {
    const date = startOfDay(addDays(startDate, d));
    const cells: SlotCell[] = [];
    let slotStart = setSeconds(setMinutes(setHours(date, startHour), 0), 0);
    const dayEnd = setSeconds(setMinutes(setHours(date, endHour), 0), 0);

    while (isBefore(slotStart, dayEnd)) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isAfter(slotEnd, dayEnd)) break;

      const isPast = !isAfter(slotEnd, now);
      const isBusy = !isPast && busyPeriods.some(busy => {
        const bs = new Date(busy.start_time);
        const be = new Date(busy.end_time);
        return isBefore(slotStart, be) && isAfter(slotEnd, bs);
      });

      cells.push({ startTime: new Date(slotStart), endTime: new Date(slotEnd), available: !isPast && !isBusy });
      slotStart = addMinutes(slotStart, 15);
    }

    grid.push({ date, cells });
  }
  return grid;
}

interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

interface ExistingBooking {
  start_time: string;
  end_time: string;
}

export function computeAvailableSlots(
  date: Date,
  durationMinutes: number,
  startHour: number,
  endHour: number,
  existingBookings: ExistingBooking[],
): BookingSlot[] {
  const dayStart = setSeconds(setMinutes(setHours(startOfDay(date), startHour), 0), 0);
  const dayEnd = setSeconds(setMinutes(setHours(startOfDay(date), endHour), 0), 0);

  // Don't show past slots for today
  const now = new Date();
  const effectiveStart = isAfter(now, dayStart) && isBefore(now, dayEnd)
    ? roundUpToSlot(now, durationMinutes)
    : dayStart;

  if (!isBefore(effectiveStart, dayEnd)) return [];

  // Parse existing bookings for this date
  const busy = existingBookings.map(b => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));

  const slots: BookingSlot[] = [];
  let cursor = effectiveStart;

  while (isBefore(cursor, dayEnd)) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (isAfter(slotEnd, dayEnd)) break;

    // Check if slot overlaps with any existing booking
    const hasConflict = busy.some(
      b => isBefore(cursor, b.end) && isAfter(slotEnd, b.start),
    );

    if (!hasConflict) {
      slots.push({ startTime: new Date(cursor), endTime: new Date(slotEnd) });
    }

    cursor = addMinutes(cursor, 15);
  }

  return slots;
}

function roundUpToSlot(date: Date, _slotMinutes: number): Date {
  const minutes = date.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  const result = new Date(date);
  result.setMinutes(rounded, 0, 0);
  return result;
}
