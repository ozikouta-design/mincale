"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { getDayIndex } from "@/app/page";
import CalendarHeader from "./CalendarHeader";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";
import { TIME_AXIS_WIDTH_PX, CALENDAR_HEADER_HEIGHT } from "@/constants/calendar";
import { useCalendar } from "@/context/CalendarContext";
import { CalendarEvent } from "@/types";

const CalendarMain = memo(function CalendarMain() {
  const {
    currentMonthYear, setCurrentMonthYear,
    viewMode, setViewMode,
    days, months, hours,
    events, selectedMemberIds, members,
    handleDragOver, handleDrop,
    handleRangeSelect, setIsScheduleModalOpen, setIsCreateEventModalOpen,
    handleEventClick, handleEventDragStart, handleEventResize,
    setIsSidebarOpen, setIsRightPanelOpen,
    accentColor, hourHeight, weekStartDay,
  } = useCalendar();

  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; startHour: number } | null>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ eventId: string; initialDuration: number; startY: number; currentDuration: number; memberId: string } | null>(null);
  
  // ★変更: isPending（長押し待機中）というステータスを追加
  const [touchDragInfo, setTouchDragInfo] = useState<{
    eventId: string; memberId: string; isGoogle: boolean;
    ghostX: number; ghostY: number; title: string; color: string;
    isDragging: boolean; initX: number; initY: number;
    isPending: boolean; 
  } | null>(null);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const monthScrollContainerRef = useRef<HTMLDivElement>(null);
  
  // ★追加: 長押し判定用のタイマー
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const currentHourExact = currentTime.getHours() + currentTime.getMinutes() / 60;

  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!mainWrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(mainWrapperRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  const weekDayWidth = containerWidth > TIME_AXIS_WIDTH_PX ? (containerWidth - TIME_AXIS_WIDTH_PX) / 7 : 192;
  const activeMemberCount = selectedMemberIds.length || 1;
  const singleDayWidth = containerWidth > TIME_AXIS_WIDTH_PX
    ? Math.max(containerWidth - TIME_AXIS_WIDTH_PX, activeMemberCount * 120)
    : Math.max(300, activeMemberCount * 120);

  const getSlotFromTouch = useCallback(
    (clientX: number, clientY: number): { dayIndex: number; startHour: number } | null => {
      const scrollRef = viewMode === "week" ? weekScrollContainerRef : dayScrollContainerRef;
      if (!scrollRef.current) return null;
      const rect = scrollRef.current.getBoundingClientRect();
      const colWidth = viewMode === "week" ? weekDayWidth : singleDayWidth;
      const relX = clientX - rect.left + scrollRef.current.scrollLeft - TIME_AXIS_WIDTH_PX;
      const relY = clientY - rect.top + scrollRef.current.scrollTop - CALENDAR_HEADER_HEIGHT;
      if (relX < 0 || relY < 0) return null;
      const colIndex = Math.floor(relX / colWidth);
      if (colIndex < 0 || colIndex >= days.length) return null;
      const startHour = Math.max(0, Math.min(23.75, relY / hourHeight));
      return { dayIndex: days[colIndex].dayIndex, startHour: Math.round(startHour * 4) / 4 };
    },
    [viewMode, weekDayWidth, singleDayWidth, days, hourHeight]
  );

  const handleTouchEventDragStart = useCallback(
    (eventId: string, isGoogle: boolean, memberId: string, clientX: number, clientY: number, title: string, color: string) => {
      // 最初は Pending（待機状態）として登録
      setTouchDragInfo({ eventId, memberId, isGoogle, ghostX: clientX, ghostY: clientY, title, color, isDragging: false, initX: clientX, initY: clientY, isPending: true });

      // ★ 400ms の長押しで Pending を解除し、ドラッグモードに移行する
      touchTimerRef.current = setTimeout(() => {
        setTouchDragInfo((prev) => prev ? { ...prev, isPending: false } : null);
        // 長押し成功の合図として軽く振動させる
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(30);
      }, 400);
    },
    []
  );

  // イベントのレイアウト計算（重なり検知）
  const eventLayouts = useMemo(() => {
    const layouts: Record<string, { column: number; totalColumns: number }> = {};
    const visibleEvents = events.filter((e) => selectedMemberIds.includes(e.memberId) && !e.isAllDay);

    const processEvents = (colEvents: CalendarEvent[]) => {
      colEvents.sort((a, b) => a.startHour - b.startHour || b.duration - a.duration);
      const clusters: CalendarEvent[][] = [];
      let currentCluster: CalendarEvent[] = [];
      let clusterEnd = 0;
      colEvents.forEach((ev) => {
        if (currentCluster.length === 0) { currentCluster.push(ev); clusterEnd = ev.startHour + ev.duration; }
        else if (ev.startHour < clusterEnd) { currentCluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.startHour + ev.duration); }
        else { clusters.push(currentCluster); currentCluster = [ev]; clusterEnd = ev.startHour + ev.duration; }
      });
      if (currentCluster.length > 0) clusters.push(currentCluster);
      clusters.forEach((cluster) => {
        const columns: CalendarEvent[][] = [];
        cluster.forEach((ev) => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastEv = columns[i][columns[i].length - 1];
            if (lastEv.startHour + lastEv.duration <= ev.startHour + 0.001) {
              columns[i].push(ev); layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 }; placed = true; break;
            }
          }
          if (!placed) { columns.push([ev]); layouts[`${ev.id}-${ev.memberId}`] = { column: columns.length - 1, totalColumns: 0 }; }
        });
        const totalCols = columns.length;
        cluster.forEach((ev) => { layouts[`${ev.id}-${ev.memberId}`].totalColumns = totalCols; });
      });
    };

    days.forEach((day) => {
      if (viewMode === "day") {
        selectedMemberIds.forEach((memberId) =>
          processEvents(visibleEvents.filter((e) => e.dayIndex === day.dayIndex && e.memberId === memberId))
        );
      } else {
        processEvents(visibleEvents.filter((e) => e.dayIndex === day.dayIndex));
      }
    });
    return layouts;
  }, [events, selectedMemberIds, days, viewMode]);

  const handlePrev = () => {
    if (viewMode === "day" && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: -singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: -weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: -monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  };
  const handleNext = () => {
    if (viewMode === "day" && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  };
  const handleToday = () => {
    if (viewMode === "day" && dayScrollContainerRef.current) {
      const idx = days.findIndex((d) => d.isToday);
      if (idx !== -1) dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, behavior: "smooth" });
    } else if (viewMode === "week" && weekScrollContainerRef.current) {
      const targetDate = new Date();
      let dayOffset = targetDate.getDay() - weekStartDay;
      if (dayOffset < 0) dayOffset += 7;
      targetDate.setDate(targetDate.getDate() - dayOffset);
      const idx = days.findIndex((d) => d.dayIndex === getDayIndex(targetDate));
      if (idx !== -1) weekScrollContainerRef.current.scrollTo({ left: idx * weekDayWidth, behavior: "smooth" });
    } else if (viewMode === "month" && monthScrollContainerRef.current) {
      const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
      if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const DEFAULT_SCROLL_HOUR = 9;
    const align = () => {
      if (viewMode === "week" && weekScrollContainerRef.current && weekDayWidth > 0) {
        const targetDate = new Date();
        let dayOffset = targetDate.getDay() - weekStartDay;
        if (dayOffset < 0) dayOffset += 7;
        targetDate.setDate(targetDate.getDate() - dayOffset);
        const idx = days.findIndex((d) => d.dayIndex === getDayIndex(targetDate));
        if (idx !== -1) weekScrollContainerRef.current.scrollTo({ left: idx * weekDayWidth, behavior: "auto" });
        weekScrollContainerRef.current.scrollTop = DEFAULT_SCROLL_HOUR * hourHeight;
      } else if (viewMode === "day" && dayScrollContainerRef.current && singleDayWidth > 0) {
        const idx = days.findIndex((d) => d.isToday);
        if (idx !== -1) dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, behavior: "auto" });
        dayScrollContainerRef.current.scrollTop = DEFAULT_SCROLL_HOUR * hourHeight;
      } else if (viewMode === "month" && monthScrollContainerRef.current) {
        const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
        if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "auto" });
      }
    };
    align();
    const t = setTimeout(align, 100);
    return () => clearTimeout(t);
  }, [viewMode, days, months, weekDayWidth, singleDayWidth, weekStartDay, hourHeight]);

  const handleWeekScroll = () => {
    if (viewMode !== "week" || !weekScrollContainerRef.current) return;
    const idx = Math.max(0, Math.floor((weekScrollContainerRef.current.scrollLeft + weekDayWidth / 2) / weekDayWidth));
    if (days[idx]) setCurrentMonthYear(`${days[idx].date.getFullYear()}年 ${days[idx].date.getMonth() + 1}月`);
  };
  const handleDayScroll = () => {
    if (viewMode !== "day" || !dayScrollContainerRef.current || singleDayWidth === 0) return;
    const idx = Math.max(0, Math.round(dayScrollContainerRef.current.scrollLeft / singleDayWidth));
    if (days[idx]) setCurrentMonthYear(`${days[idx].date.getFullYear()}年 ${days[idx].date.getMonth() + 1}月`);
  };
  const handleMonthScroll = () => {
    if (viewMode !== "month" || !monthScrollContainerRef.current) return;
    const w = monthScrollContainerRef.current.clientWidth;
    if (w === 0) return;
    const idx = Math.max(0, Math.round(monthScrollContainerRef.current.scrollLeft / w));
    if (months[idx]) setCurrentMonthYear(`${months[idx].year}年 ${months[idx].month + 1}月`);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingEvent) {
        const deltaY = e.clientY - resizingEvent.startY;
        let dur = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
        setResizingEvent((prev) => prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null);
      } else if (selection && mainWrapperRef.current) {
        const rect = mainWrapperRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        setSelection((prev) => prev ? { ...prev, currentHour: Math.max(0, (y - CALENDAR_HEADER_HEIGHT) / hourHeight) } : null);
      }
    };
    const onMouseUp = () => {
      if (resizingEvent) {
        handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
        setResizingEvent(null);
      } else if (selection) {
        const start = Math.min(selection.startHour, selection.currentHour);
        const end = Math.max(selection.startHour, selection.currentHour);
        let duration = Math.round((end - start) * 4) / 4;
        if (duration < 0.25) duration = 1;
        handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, duration);
        setSelection(null);
      }
    };
    const onTouchMoveResize = (e: TouchEvent) => {
      if (!resizingEvent) return;
      e.preventDefault();
      const deltaY = e.touches[0].clientY - resizingEvent.startY;
      let dur = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
      setResizingEvent((prev) => prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null);
    };
    const onTouchEndResize = () => {
      if (!resizingEvent) return;
      handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
      setResizingEvent(null);
    };
    if (selection || resizingEvent) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMoveResize, { passive: false });
      window.addEventListener("touchend", onTouchEndResize);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMoveResize);
      window.removeEventListener("touchend", onTouchEndResize);
    };
  }, [selection, resizingEvent, handleRangeSelect, handleEventResize, hourHeight]);

  // ★変更: タッチドラッグ（イベント移動）のロジック
  useEffect(() => {
    if (!touchDragInfo) return;

    const DRAG_THRESHOLD = 8;

    const onTouchMoveDrag = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchDragInfo.initX;
      const dy = touch.clientY - touchDragInfo.initY;

      // ★ 長押し判定中（Pending）の処理
      if (touchDragInfo.isPending) {
        // 指が一定以上動いたら「スクロール目的」と判定してドラッグ準備をキャンセル
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
          setTouchDragInfo(null);
        }
        return; // preventDefault() を呼ばないので、ネイティブのスクロールが通常通り機能する
      }

      // ★ 長押し完了後（ドラッグモード）の処理
      e.preventDefault(); // ここで画面のスクロールを完全に止める
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      setTouchDragInfo((prev) => prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY, isDragging: true } : null);
    };

    const onTouchEndDrag = (e: TouchEvent) => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

      if (!touchDragInfo.isDragging) {
        setTouchDragInfo(null);
        setDragOverSlot(null);
        return;
      }

      const touch = e.changedTouches[0];
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) {
        const { eventId, memberId } = touchDragInfo;
        const fake = {
          preventDefault: () => {},
          dataTransfer: { getData: (k: string) => ({ type: "event", eventId, memberId } as Record<string, string>)[k] ?? "" },
        } as unknown as React.DragEvent<HTMLDivElement>;
        handleDrop(fake, slot.dayIndex, slot.startHour);
      }
      setTouchDragInfo(null);
      setDragOverSlot(null);
    };

    const onTouchCancelDrag = () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      setTouchDragInfo(null);
      setDragOverSlot(null);
    };

    window.addEventListener("touchmove", onTouchMoveDrag, { passive: false });
    window.addEventListener("touchend", onTouchEndDrag);
    window.addEventListener("touchcancel", onTouchCancelDrag);

    return () => {
      window.removeEventListener("touchmove", onTouchMoveDrag);
      window.removeEventListener("touchend", onTouchEndDrag);
      window.removeEventListener("touchcancel", onTouchCancelDrag);
    };
  }, [touchDragInfo, getSlotFromTouch, handleDrop]);

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative select-none bg-white">
      <CalendarHeader
        displayMonthYear={currentMonthYear}
        viewMode={viewMode} setViewMode={setViewMode}
        handlePrevWeek={handlePrev} handleNextWeek={handleNext} handleToday={handleToday}
        setIsSidebarOpen={setIsSidebarOpen} setIsRightPanelOpen={setIsRightPanelOpen}
        setIsScheduleModalOpen={setIsScheduleModalOpen} setIsCreateEventModalOpen={setIsCreateEventModalOpen}
        accentColor={accentColor}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative" ref={mainWrapperRef}>
        {viewMode === "day" && (
          <DayView
            days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor}
            hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members}
            events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection}
            dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot}
            handleDragOver={handleDragOver} handleDrop={handleDrop}
            handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            dayScrollContainerRef={dayScrollContainerRef} handleDayScroll={handleDayScroll}
            singleDayWidth={singleDayWidth}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent}
            handleTouchEventDragStart={handleTouchEventDragStart}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            days={days} hours={hours} currentHourExact={currentHourExact} accentColor={accentColor}
            hourHeight={hourHeight} selectedMemberIds={selectedMemberIds} members={members}
            events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection}
            dragOverSlot={dragOverSlot} setDragOverSlot={setDragOverSlot}
            handleDragOver={handleDragOver} handleDrop={handleDrop}
            handleEventDragStart={handleEventDragStart} handleEventClick={handleEventClick}
            weekScrollContainerRef={weekScrollContainerRef} handleWeekScroll={handleWeekScroll}
            resizingEvent={resizingEvent} setResizingEvent={setResizingEvent}
            weekStartDay={weekStartDay} dayWidth={weekDayWidth}
            handleTouchEventDragStart={handleTouchEventDragStart}
          />
        )}
        {viewMode === "month" && (
          <MonthView
            months={months} events={events} selectedMemberIds={selectedMemberIds}
            members={members} accentColor={accentColor}
            handleRangeSelect={handleRangeSelect} handleDragOver={handleDragOver}
            handleDrop={handleDrop} handleEventDragStart={handleEventDragStart}
            handleEventClick={handleEventClick}
            monthScrollContainerRef={monthScrollContainerRef}
            handleMonthScroll={handleMonthScroll} weekStartDay={weekStartDay}
          />
        )}
      </div>

      {/* タッチドラッグ中のゴースト要素 */}
      {touchDragInfo?.isDragging && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-md px-2 py-1 text-white text-xs shadow-2xl border border-white/30"
          style={{
            left: touchDragInfo.ghostX - 40,
            top: touchDragInfo.ghostY - 16,
            backgroundColor: touchDragInfo.color,
            opacity: 0.85,
            transform: "scale(1.08)",
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {touchDragInfo.title}
        </div>
      )}
    </main>
  );
});

export default CalendarMain;