"use client";

import React, { createContext, useContext } from "react";
import { useCalendarLogic } from "@/hooks/useCalendarLogic";

type CalendarContextValue = ReturnType<typeof useCalendarLogic>;

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const logic = useCalendarLogic();
  return <CalendarContext.Provider value={logic}>{children}</CalendarContext.Provider>;
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used within <CalendarProvider>");
  return ctx;
}
