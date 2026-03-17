"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { getDayIndex } from "@/app/page";
import CalendarHeader from "./CalendarHeader";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";

interface CalendarMainProps {
  currentMonthYear: string; setCurrentMonthYear: (month: string) => void;
  viewMode: "day" | "week" | "month"; setViewMode: (mode: "day" | "week" | "month") => void;
  days: any[]; months: any[]; hours: string[]; isLoadingData: boolean;
  events: any[]; selectedMemberIds: string[]; members: any[];
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void; 
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => void;
  handleRangeSelect: (dayIndex: number, startHour: number, duration: number) => void;
  setIsScheduleModalOpen: (isOpen: boolean) => void; setIsCreateEventModalOpen: (isOpen: boolean) => void;
  handleEventClick: (event: any, e: React.MouseEvent) => void;
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => void;
  handleEventResize: (eventId: any, newDuration: number, memberId: string) => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accentColor: string; hourHeight: number; weekStartDay: number;
}

export default function CalendarMain({
  currentMonthYear, setCurrentMonthYear, viewMode, setViewMode, days, months, hours,
  isLoadingData, events, selectedMemberIds, members, handleDragOver, handleDrop, handleRangeSelect,
  setIsScheduleModalOpen, setIsCreateEventModalOpen, handleEventClick, handleEventDragStart, handleEventResize,
  setIsSidebarOpen, setIsRightPanelOpen, accentColor, hourHeight, weekStartDay
}: CalendarMainProps) {
  
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number, startHour: number } | null>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ eventId: any; initialDuration: number; startY: number; currentDuration: number; memberId: string } | null>(null);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const monthScrollContainerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);
  const currentHourExact = currentTime.getHours() + currentTime.getMinutes() / 60;

  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!mainWrapperRef.current) return;
    const observer = new ResizeObserver(entries => { for (let entry of entries) { setContainerWidth(entry.contentRect.width); } });
    observer.observe(mainWrapperRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  const weekDayWidth = containerWidth > 64 ? (containerWidth - 64) / 7 : 192;
  const activeMemberCount = selectedMemberIds.length || 1;
  const singleDayWidth = containerWidth > 64 ? Math.max(containerWidth - 64, activeMemberCount * 120) : Math.max(300, activeMemberCount * 120);

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
        if (isDayView) { selectedMemberIds.forEach(memberId => processEvents(visibleEvents.filter(e => e.dayIndex === day.dayIndex && e.memberId === memberId))); } 
        else { processEvents(visibleEvents.filter(e => e.dayIndex === day.dayIndex)); }
      });
    };
    if (viewMode === 'day') calculateLayoutsForDays(days, true); else calculateLayoutsForDays(days, false);
    return layouts;
  }, [events, selectedMemberIds, days, viewMode]);

  // ★ 大改修：ボタン操作は「いま表示されているコンテナのスクロール位置を1画面分横にズラすだけ」に統一！
  const handlePrev = () => {
    if (viewMode === 'day' && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: -singleDayWidth, behavior: 'smooth' });
    else if (viewMode === 'week' && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: -weekDayWidth * 7, behavior: 'smooth' });
    else if (viewMode === 'month' && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: -monthScrollContainerRef.current.clientWidth, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (viewMode === 'day' && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: singleDayWidth, behavior: 'smooth' });
    else if (viewMode === 'week' && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: weekDayWidth * 7, behavior: 'smooth' });
    else if (viewMode === 'month' && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: monthScrollContainerRef.current.clientWidth, behavior: 'smooth' });
  };

  const handleToday = () => {
    if (viewMode === 'day' && dayScrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.isToday);
      if (targetColIndex !== -1) dayScrollContainerRef.current.scrollTo({ left: targetColIndex * singleDayWidth, behavior: 'smooth' });
    } else if (viewMode === 'week' && weekScrollContainerRef.current) {
      const targetDate = new Date(); let dayOffset = targetDate.getDay() - weekStartDay; if (dayOffset < 0) dayOffset += 7; targetDate.setDate(targetDate.getDate() - dayOffset);
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(targetDate));
      if (targetColIndex !== -1) weekScrollContainerRef.current.scrollTo({ left: targetColIndex * weekDayWidth, behavior: 'smooth' });
    } else if (viewMode === 'month' && monthScrollContainerRef.current) {
      const targetColIndex = months.findIndex(m => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
      if (targetColIndex !== -1) monthScrollContainerRef.current.scrollTo({ left: targetColIndex * monthScrollContainerRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  // ★ 起動時・ViewMode変更時に、自動的に「今日」の場所にスクロールを合わせる
  useEffect(() => {
    const alignToToday = () => {
      if (viewMode === 'week' && weekScrollContainerRef.current && weekDayWidth > 0) {
        const targetDate = new Date(); let dayOffset = targetDate.getDay() - weekStartDay; if (dayOffset < 0) dayOffset += 7; targetDate.setDate(targetDate.getDate() - dayOffset);
        const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(targetDate));
        if (targetColIndex !== -1) weekScrollContainerRef.current.scrollTo({ left: targetColIndex * weekDayWidth, behavior: 'auto' });
        weekScrollContainerRef.current.scrollTop = 9 * hourHeight;
      } else if (viewMode === 'day' && dayScrollContainerRef.current && singleDayWidth > 0) {
        const targetColIndex = days.findIndex(d => d.isToday);
        if (targetColIndex !== -1) dayScrollContainerRef.current.scrollTo({ left: targetColIndex * singleDayWidth, behavior: 'auto' });
        dayScrollContainerRef.current.scrollTop = 9 * hourHeight;
      } else if (viewMode === 'month' && monthScrollContainerRef.current) {
        const targetColIndex = months.findIndex(m => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
        if (targetColIndex !== -1) monthScrollContainerRef.current.scrollTo({ left: targetColIndex * monthScrollContainerRef.current.clientWidth, behavior: 'auto' });
      }
    };
    alignToToday();
    const timer = setTimeout(alignToToday, 100); // 描画直後にもう一度確実に合わせる
    return () => clearTimeout(timer);
  }, [viewMode, days, months, weekDayWidth, singleDayWidth, weekStartDay, hourHeight]);

  const handleWeekScroll = () => {
    if (viewMode !== 'week' || !weekScrollContainerRef.current) return;
    const visibleColIndex = Math.max(0, Math.floor((weekScrollContainerRef.current.scrollLeft + (weekDayWidth / 2)) / weekDayWidth));
    if (days[visibleColIndex]) setCurrentMonthYear(`${days[visibleColIndex].date.getFullYear()}年 ${days[visibleColIndex].date.getMonth() + 1}月`);
  };

  const handleDayScroll = () => {
    if (viewMode !== 'day' || !dayScrollContainerRef.current) return;
    const width = singleDayWidth; if (width === 0) return;
    const visibleColIndex = Math.max(0, Math.round(dayScrollContainerRef.current.scrollLeft / width));
    if (days[visibleColIndex]) setCurrentMonthYear(`${days[visibleColIndex].date.getFullYear()}年 ${days[visibleColIndex].date.getMonth() + 1}月`);
  };

  const handleMonthScroll = () => {
    if (viewMode !== 'month' || !monthScrollContainerRef.current) return;
    const width = monthScrollContainerRef.current.clientWidth; if (width === 0) return;
    const visibleColIndex = Math.max(0, Math.round(monthScrollContainerRef.current.scrollLeft / width));
    if (months[visibleColIndex]) setCurrentMonthYear(`${months[visibleColIndex].year}年 ${months[visibleColIndex].month + 1}月`);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingEvent) {
        const deltaY = e.clientY - resizingEvent.startY;
        let deltaHours = deltaY / hourHeight;
        let newDuration = resizingEvent.initialDuration + deltaHours;
        newDuration = Math.round(newDuration * 4) / 4; 
        newDuration = Math.max(0.25, newDuration); 
        setResizingEvent(prev => prev ? { ...prev, currentDuration: newDuration } : null);
      } else if (selection) {
        // ★ 選択時のY座標計算用に固定のラッパーを参照する
        if (mainWrapperRef.current) {
          const rect = mainWrapperRef.current.getBoundingClientRect();
          const clampedY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
          // ヘッダーの高さを考慮（約72px分を引く）
          setSelection(prev => prev ? { ...prev, currentHour: Math.max(0, (clampedY - 72) / hourHeight) } : null);
        }
      }
    };
    const handleMouseUp = () => {
      if (resizingEvent) {
        handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
        setResizingEvent(null);
      } else if (selection) {
        const start = Math.min(selection.startHour, selection.currentHour); const end = Math.max(selection.startHour, selection.currentHour);
        let duration = Math.round((end - start) * 4) / 4; if (duration < 0.25) duration = 1;
        handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, duration);
        setSelection(null);
      }
    };
    if (selection || resizingEvent) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [selection, resizingEvent, handleRangeSelect, handleEventResize, viewMode, hourHeight]);

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative select-none bg-white">
      <CalendarHeader 
        displayMonthYear={currentMonthYear}
        viewMode={viewMode} setViewMode={setViewMode} handlePrevWeek={handlePrev} handleNextWeek={handleNext} handleToday={handleToday}
        setIsSidebarOpen={setIsSidebarOpen} setIsRightPanelOpen={setIsRightPanelOpen} setIsScheduleModalOpen={setIsScheduleModalOpen} setIsCreateEventModalOpen={setIsCreateEventModalOpen} accentColor={accentColor}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative" ref={mainWrapperRef}>
        {viewMode === 'day' && (
          <DayView 
            days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor} hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members} events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection} dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            dayScrollContainerRef={dayScrollContainerRef} handleDayScroll={handleDayScroll} singleDayWidth={singleDayWidth}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent}
          />
        )}

        {viewMode === 'week' && (
          <WeekView 
            days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor} hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members} events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection} dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            weekScrollContainerRef={weekScrollContainerRef} handleWeekScroll={handleWeekScroll}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent} weekStartDay={weekStartDay} dayWidth={weekDayWidth}
          />
        )}

        {viewMode === 'month' && (
          <MonthView 
            months={months} events={events} selectedMemberIds={selectedMemberIds} members={members} accentColor={accentColor} handleRangeSelect={handleRangeSelect} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            monthScrollContainerRef={monthScrollContainerRef} handleMonthScroll={handleMonthScroll} weekStartDay={weekStartDay}
          />
        )}
      </div>
    </main>
  );
}