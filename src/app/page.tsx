"use client";

import React from "react";
import { CalendarProvider, useCalendar } from "@/context/CalendarContext";
import RightPanel from "@/components/RightPanel";
import Sidebar from "@/components/Sidebar";
import CalendarMain from "@/components/CalendarMain";
import Modals from "@/components/Modals";

export { getDayIndex, formatLocalISO } from "@/hooks/useEventLogic";

function CalendarDashboardInner() {
  const { isSidebarOpen, isRightPanelOpen, setIsSidebarOpen, setIsRightPanelOpen } = useCalendar();
  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      {(isSidebarOpen || isRightPanelOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
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

export default function CalendarDashboard() {
  return (
    <CalendarProvider>
      <CalendarDashboardInner />
    </CalendarProvider>
  );
}
