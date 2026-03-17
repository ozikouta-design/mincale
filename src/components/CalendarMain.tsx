"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { getDayIndex } from "@/app/page";
import CalendarHeader from "./CalendarHeader";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";

interface CalendarMainProps {
  currentMonthYear: string; setCurrentMonthYear: (month: string) => void;
  currentViewDate: Date; viewMode: "day" | "week" | "month"; setViewMode: (mode: "day" | "week" | "month") => void;
  scrollTrigger: any; days: any[]; hours: string[]; isLoadingData: boolean;
  events: any[]; selectedMemberIds: string[]; members: any[];
  // ★ 修正：<HTMLDivElement> を追加
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void; 
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => void;
  handleRangeSelect: (dayIndex: number, startHour: number, duration: number) => void;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  handlePrevWeek: () => void; handleNextWeek: () => void; handleToday: () => void;
  handleEventClick: (event: any, e: React.MouseEvent) => void;
  // ★ 修正：<HTMLDivElement> を追加
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accentColor: string; hourHeight: number;
}

export default function CalendarMain({
  currentMonthYear, setCurrentMonthYear, currentViewDate, viewMode, setViewMode, scrollTrigger, days, hours,
  isLoadingData, events, selectedMemberIds, members, handleDragOver, handleDrop, handleRangeSelect,
  setIsScheduleModalOpen, handlePrevWeek, handleNextWeek, handleToday, handleEventClick, handleEventDragStart,
  setIsSidebarOpen, setIsRightPanelOpen, accentColor, hourHeight
}: CalendarMainProps) {
  
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number, startHour: number } | null>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null>(null);

  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const weekGridRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayGridRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const monthScrollContainerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);
  const currentHourExact = currentTime.getHours() + currentTime.getMinutes() / 60;

  const eventLayouts = useMemo(() => {
    const layouts: Record<string, { column: number, totalColumns: number }> = {};
    const visibleEvents = events.filter(e => selectedMemberIds.includes(e.memberId));

    const calculateLayoutsForDays = (targetDays: any[], isDayView: boolean) => {
      targetDays.forEach(day => {
        const processEvents = (colEvents: any[]) => {
          colEvents.sort((a, b) => a.startHour - b.startHour || (b.startHour + b.duration) - (a.startHour + a.duration));
          let clusters: any[][] = []; let currentCluster: any[] = []; let clusterEnd = 0;
          colEvents.forEach(ev => {
            if (currentCluster.length === 0) { currentCluster.push(ev); clusterEnd = ev.startHour + ev.duration; } 
            else if (ev.startHour < clusterEnd) { currentCluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.startHour + ev.duration); } 
            else { clusters.push(currentCluster); currentCluster = [ev]; clusterEnd = ev.startHour + ev.duration; }
          });
          if (currentCluster.length > 0) clusters.push(currentCluster);

          clusters.forEach(cluster => {
            let columns: any[][] = [];
            cluster.forEach(ev => {
              let placed = false;
              for (let i = 0; i < columns.length; i++) {
                let lastEv = columns[i][columns[i].length - 1];
                if (lastEv.startHour + lastEv.duration <= ev.startHour + 0.001) { columns[i].push(ev); layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 }; placed = true; break; }
              }
              if (!placed) { columns.push([ev]); layouts[`${ev.id}-${ev.memberId}`] = { column: columns.length - 1, totalColumns: 0 }; }
            });
            const totalCols = columns.length;
            cluster.forEach(ev => { layouts[`${ev.id}-${ev.memberId}`].totalColumns = totalCols; });
          });
        };

        if (isDayView) {
          selectedMemberIds.forEach(memberId => processEvents(visibleEvents.filter(e => e.dayIndex === day.dayIndex && e.memberId === memberId)));
        } else {
          processEvents(visibleEvents.filter(e => e.dayIndex === day.dayIndex));
        }
      });
    };

    if (viewMode === 'day') calculateLayoutsForDays(days, true);
    else calculateLayoutsForDays(days, false);
    
    return layouts;
  }, [events, selectedMemberIds, days, viewMode]);

  useEffect(() => {
    if (viewMode === 'week' && weekScrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(currentViewDate));
      if (targetColIndex !== -1) weekScrollContainerRef.current.scrollTo({ left: Math.max(0, targetColIndex * 192 - 192), behavior: 'auto' });
      weekScrollContainerRef.current.scrollTop = 9 * hourHeight;
    } else if (viewMode === 'day' && dayScrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(currentViewDate));
      if (targetColIndex !== -1) dayScrollContainerRef.current.scrollLeft = targetColIndex * dayScrollContainerRef.current.clientWidth;
      dayScrollContainerRef.current.scrollTop = 9 * hourHeight;
    }
  }, [viewMode, currentViewDate, days, hourHeight]);

  useEffect(() => {
    if (scrollTrigger) {
      if (viewMode === 'week' && weekScrollContainerRef.current) {
        if (scrollTrigger.direction === 'today') {
          const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(new Date()));
          if (targetColIndex !== -1) weekScrollContainerRef.current.scrollTo({ left: Math.max(0, targetColIndex * 192 - 192), behavior: 'smooth' });
        } else {
          weekScrollContainerRef.current.scrollBy({ left: scrollTrigger.direction === 'next' ? 192 * 7 : -192 * 7, behavior: 'smooth' });
        }
      } else if (viewMode === 'month' && monthScrollContainerRef.current && scrollTrigger.direction === 'today') {
        monthScrollContainerRef.current.scrollTo({ left: monthScrollContainerRef.current.clientWidth, behavior: 'smooth' });
      }
    }
  }, [scrollTrigger, viewMode, days]);

  const handleWeekScroll = () => {
    if (viewMode !== 'week' || !weekScrollContainerRef.current) return;
    const visibleColIndex = Math.max(0, Math.floor(weekScrollContainerRef.current.scrollLeft / 192));
    if (days[visibleColIndex]) setCurrentMonthYear(`${days[visibleColIndex].date.getFullYear()}年 ${days[visibleColIndex].date.getMonth() + 1}月`);
  };

  const handleDayScroll = () => {
    if (viewMode !== 'day' || !dayScrollContainerRef.current) return;
    const width = dayScrollContainerRef.current.clientWidth; if (width === 0) return;
    const visibleColIndex = Math.round(dayScrollContainerRef.current.scrollLeft / width);
    if (days[visibleColIndex]) setCurrentMonthYear(`${days[visibleColIndex].date.getFullYear()}年 ${days[visibleColIndex].date.getMonth() + 1}月`);
  };

  const handleMonthScroll = () => {
    if (viewMode !== 'month' || !monthScrollContainerRef.current) return;
    const width = monthScrollContainerRef.current.clientWidth; if (width === 0) return;
    if (monthScrollContainerRef.current.scrollLeft === 0) handlePrevWeek();
    else if (monthScrollContainerRef.current.scrollLeft >= width * 2 - 10) handleNextWeek();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (selection) {
        let gridEl = null;
        if (viewMode === 'day') gridEl = dayGridRefs.current[selection.dayIndex];
        else if (viewMode === 'week') gridEl = weekGridRef.current;
        if (gridEl) {
          const rect = gridEl.getBoundingClientRect();
          const clampedY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
          setSelection(prev => prev ? { ...prev, currentHour: clampedY / hourHeight } : null);
        }
      }
    };
    const handleMouseUp = () => {
      if (selection) {
        const start = Math.min(selection.startHour, selection.currentHour); const end = Math.max(selection.startHour, selection.currentHour);
        let duration = Math.round((end - start) * 4) / 4; if (duration < 0.25) duration = 1;
        handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, duration);
        setSelection(null);
      }
    };
    if (selection) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [selection, handleRangeSelect, viewMode, hourHeight]);

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative w-full select-none bg-white">
      <CalendarHeader 
        displayMonthYear={`${currentViewDate.getFullYear()}年 ${currentViewDate.getMonth() + 1}月`}
        viewMode={viewMode} setViewMode={setViewMode} handlePrevWeek={handlePrevWeek} handleNextWeek={handleNextWeek} handleToday={handleToday}
        setIsSidebarOpen={setIsSidebarOpen} setIsRightPanelOpen={setIsRightPanelOpen} setIsScheduleModalOpen={setIsScheduleModalOpen} accentColor={accentColor}
      />
      
      {viewMode === 'day' && (
        <DayView 
          days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor} hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members} events={events} eventLayouts={eventLayouts}
          selection={selection} setSelection={setSelection} dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
          dayScrollContainerRef={dayScrollContainerRef} handleDayScroll={handleDayScroll} dayGridRefs={dayGridRefs}
        />
      )}

      {viewMode === 'week' && (
        <WeekView 
          days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor} hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members} events={events} eventLayouts={eventLayouts}
          selection={selection} setSelection={setSelection} dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
          weekScrollContainerRef={weekScrollContainerRef} handleWeekScroll={handleWeekScroll} weekGridRef={weekGridRef}
        />
      )}

      {viewMode === 'month' && (
        <MonthView 
          currentViewDate={currentViewDate} events={events} selectedMemberIds={selectedMemberIds} members={members} accentColor={accentColor} handleRangeSelect={handleRangeSelect} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
          monthScrollContainerRef={monthScrollContainerRef} handleMonthScroll={handleMonthScroll}
        />
      )}
    </main>
  );
}