"use client";
import React, { createContext, useContext } from "react";
import { useCalendarLogic } from "@/hooks/useCalendarLogic";

type Cal = ReturnType<typeof useCalendarLogic>;
const Ctx = createContext<Cal | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const logic = useCalendarLogic();
  return <Ctx.Provider value={logic}>{children}</Ctx.Provider>;
}

export function useCalendar(): Cal {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCalendar must be used inside <CalendarProvider>");
  return c;
}
