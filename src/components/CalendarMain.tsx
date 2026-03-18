"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

  // タッチドラッグ（イベント移動）の状態
  const [touchDragInfo, setTouchDragInfo] = useState<{
    eventId: any; memberId: string; isGoogle: boolean;
    ghostX: number; ghostY: number;
    title: string; color: string;
    isDragging: boolean;
    initX: number; initY: number;
  } | null>(null);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const weekGridRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayGridRef = useRef<HTMLDivElement>(null);
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

  // タッチ座標→時間スロット変換
  const getSlotFromTouch = useCallback((clientX: number, clientY: number): { dayIndex: number; startHour: number } | null => {
    const scrollRef = viewMode === 'week' ? weekScrollContainerRef : dayScrollContainerRef;
    if (!scrollRef.current) return null;
    const rect = scrollRef.current.getBoundingClientRect();
    const colWidth = viewMode === 'week' ? weekDayWidth : singleDayWidth;
    const relX = (clientX - rect.left) + scrollRef.current.scrollLeft - 64; // 64px=時間軸
    const relY = (clientY - rect.top) + scrollRef.current.scrollTop - 72;  // 72px=ヘッダー
    if (relX < 0 || relY < 0) return null;
    const colIndex = Math.floor(relX / colWidth);
    if (colIndex < 0 || colIndex >= days.length) return null;
    const startHour = Math.max(0, Math.min(23.75, relY / hourHeight));
    return { dayIndex: days[colIndex].dayIndex, startHour: Math.round(startHour * 4) / 4 };
  }, [viewMode, weekDayWidth, singleDayWidth, days, hourHeight]);

  // タッチドラッグ開始（views から呼ばれる）
  const handleTouchEventDragStart = useCallback((
    eventId: any, isGoogle: boolean, memberId: string,
    clientX: number, clientY: number, title: string, color: string
  ) => {
    setTouchDragInfo({
      eventId, memberId, isGoogle,
      ghostX: clientX, ghostY: clientY,
      title, color,
      isDragging: false,
      initX: clientX, initY: clientY,
    });
  }, []);

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
    const timer = setTimeout(alignToToday, 100);
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

  // ★ 修正: マウス + タッチ（リサイズ）を統合
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingEvent) {
        const deltaY = e.clientY - resizingEvent.startY;
        let newDuration = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
        newDuration = Math.max(0.25, newDuration);
        setResizingEvent(prev => prev ? { ...prev, currentDuration: newDuration } : null);
      } else if (selection) {
        if (mainWrapperRef.current) {
          const rect = mainWrapperRef.current.getBoundingClientRect();
          const clampedY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
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
    // ★ タッチリサイズ
    const handleTouchMoveResize = (e: TouchEvent) => {
      if (!resizingEvent) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaY = touch.clientY - resizingEvent.startY;
      let newDuration = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
      newDuration = Math.max(0.25, newDuration);
      setResizingEvent(prev => prev ? { ...prev, currentDuration: newDuration } : null);
    };
    const handleTouchEndResize = () => {
      if (!resizingEvent) return;
      handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
      setResizingEvent(null);
    };

    if (selection || resizingEvent) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMoveResize, { passive: false });
      window.addEventListener('touchend', handleTouchEndResize);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMoveResize);
      window.removeEventListener('touchend', handleTouchEndResize);
    };
  }, [selection, resizingEvent, handleRangeSelect, handleEventResize, viewMode, hourHeight]);

  // ★ 追加: タッチドラッグ（イベント移動）専用 effect
  useEffect(() => {
    if (!touchDragInfo) return;

    const handleTouchMoveDrag = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchDragInfo.initX;
      const dy = touch.clientY - touchDragInfo.initY;
      if (!touchDragInfo.isDragging && Math.sqrt(dx * dx + dy * dy) < 8) return;
      e.preventDefault();
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      setTouchDragInfo(prev => prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY, isDragging: true } : null);
    };

    const handleTouchEndDrag = (e: TouchEvent) => {
      if (!touchDragInfo.isDragging) {
        setTouchDragInfo(null);
        setDragOverSlot(null);
        return;
      }
      const touch = e.changedTouches[0];
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) {
        const { eventId, memberId } = touchDragInfo;
        // 既存の handleDrop を再利用するため DragEvent を模倣
        const fakeDragEvent = {
          preventDefault: () => {},
          dataTransfer: {
            getData: (key: string) => ({ type: 'event', eventId: String(eventId), memberId: String(memberId) } as any)[key] ?? '',
          }
        } as unknown as React.DragEvent<HTMLDivElement>;
        handleDrop(fakeDragEvent, slot.dayIndex, slot.startHour);
      }
      setTouchDragInfo(null);
      setDragOverSlot(null);
    };

    window.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
    window.addEventListener('touchend', handleTouchEndDrag);
    return () => {
      window.removeEventListener('touchmove', handleTouchMoveDrag);
      window.removeEventListener('touchend', handleTouchEndDrag);
    };
  }, [touchDragInfo, getSlotFromTouch, handleDrop]);

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
            dayScrollContainerRef={dayScrollContainerRef} handleDayScroll={handleDayScroll} dayGridRef={dayGridRef} singleDayWidth={singleDayWidth}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent}
            handleTouchEventDragStart={handleTouchEventDragStart}
          />
        )}

        {viewMode === 'week' && (
          <WeekView 
            days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor} hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members} events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection} dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            weekScrollContainerRef={weekScrollContainerRef} handleWeekScroll={handleWeekScroll} weekGridRef={weekGridRef}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent} weekStartDay={weekStartDay} dayWidth={weekDayWidth}
            handleTouchEventDragStart={handleTouchEventDragStart}
          />
        )}

        {viewMode === 'month' && (
          <MonthView 
            months={months} events={events} selectedMemberIds={selectedMemberIds} members={members} accentColor={accentColor} handleRangeSelect={handleRangeSelect} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            monthScrollContainerRef={monthScrollContainerRef} handleMonthScroll={handleMonthScroll} weekStartDay={weekStartDay}
          />
        )}
      </div>

      {/* ★ タッチドラッグ中のゴースト要素 */}
      {touchDragInfo?.isDragging && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-md px-2 py-1 text-white text-xs shadow-2xl border border-white/30"
          style={{
            left: touchDragInfo.ghostX - 40,
            top: touchDragInfo.ghostY - 16,
            backgroundColor: touchDragInfo.color,
            opacity: 0.85,
            transform: 'scale(1.08)',
            maxWidth: 120,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {touchDragInfo.title}
        </div>
      )}
    </main>
  );
}
