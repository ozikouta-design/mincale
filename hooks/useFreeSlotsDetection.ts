import { useState, useCallback } from 'react';
import { CalendarEvent, FreeSlot, FreeSlotOptions } from '@/types';
import { detectFreeSlots } from '@/lib/free-slots-engine';
import { DEFAULT_WORKING_HOURS } from '@/constants/calendar';
import { addDays } from 'date-fns';

export function useFreeSlotsDetection() {
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const detect = useCallback(
    (events: CalendarEvent[], options?: Partial<FreeSlotOptions>) => {
      setIsDetecting(true);
      const defaultOptions: FreeSlotOptions = {
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        workingHoursStart: DEFAULT_WORKING_HOURS.start,
        workingHoursEnd: DEFAULT_WORKING_HOURS.end,
        minimumSlotMinutes: 30,
        excludeWeekends: true,
        ...options,
      };

      const slots = detectFreeSlots(events, defaultOptions);
      setFreeSlots(slots);
      setIsDetecting(false);
      return slots;
    },
    [],
  );

  return { freeSlots, isDetecting, detect };
}
