import { setHours, setMinutes, setSeconds, addMinutes, isAfter, isBefore, startOfDay } from 'date-fns';

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

    cursor = slotEnd;
  }

  return slots;
}

function roundUpToSlot(date: Date, slotMinutes: number): Date {
  const minutes = date.getMinutes();
  const rounded = Math.ceil(minutes / slotMinutes) * slotMinutes;
  const result = new Date(date);
  result.setMinutes(rounded, 0, 0);
  return result;
}
