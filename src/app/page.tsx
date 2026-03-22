"use client";
import React from "react";
import { CalendarProvider, useCalendar } from "@/context/CalendarContext";
import CalendarMain from "@/components/CalendarMain";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import Modals from "@/components/Modals";

// Re-export utility used by other components
export { getDayIndex } from "@/hooks/useInitialScroll";
export { formatLocalISO } from "@/hooks/useEventLogic";

function Inner() {
  const { isSidebarOpen, isRightPanelOpen, setIsSidebarOpen, setIsRightPanelOpen } = useCalendar();
  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      {(isSidebarOpen || isRightPanelOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => { setIsSidebarOpen(false); setIsRightPanelOpen(false); }}
        />
      )}
      <Modals />
      <Sidebar />
      <CalendarMain />
      <RightPanel />
    </div>
  );
}

export default function Page() {
  return (
    <CalendarProvider>
      <Inner />
    </CalendarProvider>
  );
}
