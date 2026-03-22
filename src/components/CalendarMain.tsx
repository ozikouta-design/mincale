"use client";
import React, { useState, useRef, useMemo, useCallback, useEffect, memo } from "react";
import { useSession, signIn } from "next-auth/react";
import { useCalendar } from "@/context/CalendarContext";
import { getDayIndex, useInitialScroll } from "@/hooks/useInitialScroll";
import WeekView from "./views/WeekView";
import DayView from "./views/DayView";
import MonthView from "./views/MonthView";
import CalendarHeader from "./CalendarHeader";
import { TIME_AXIS_W, HOUR_H } from "@/constants/calendar";
import type { SelectionState, ResizingState } from "@/types";

export default memo(function CalendarMain() {
  const cal = useCalendar();
  const {
    viewMode, setViewMode,
    days, months, hours,
    events, members, selectedMemberIds,
    eventLayouts,
    selection, setSelection,
    handleRangeSelect, handleEventClick, handleCreateEvent,
    handleMoveEvent, handleResizeCommit,
    accentColor, hourHeight, weekStartDay, currentMonthYear, setCurrentMonthYear,
    setIsSidebarOpen, setIsRightPanelOpen,
    setIsCreateEventModalOpen, setIsScheduleModalOpen,
    dragOverSlot, setDragOverSlot,
    handleDragOver, handleDrop,
    handleEventDragStart,
  } = cal;

  const weekRef  = useRef<HTMLDivElement>(null);
  const dayRef   = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  // ── Measure week container for dayWidth ─────────────────────
  const [weekClientW, setWeekClientW] = useState(0);
  useEffect(() => {
    const el = weekRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setWeekClientW(el.clientWidth));
    obs.observe(el); setWeekClientW(el.clientWidth);
    return () => obs.disconnect();
  }, [viewMode]);
  const actualDayWidth = weekClientW > TIME_AXIS_W ? (weekClientW - TIME_AXIS_W) / 7 : 0;

  // ── Measure main wrapper for dayView width ───────────────────
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainW, setMainW] = useState(0);
  useEffect(() => {
    if (!mainRef.current) return;
    const obs = new ResizeObserver((e) => setMainW(e[0].contentRect.width));
    obs.observe(mainRef.current); setMainW(mainRef.current.clientWidth);
    return () => obs.disconnect();
  }, [viewMode]);
  const singleDayWidth = mainW > TIME_AXIS_W ? Math.max(mainW - TIME_AXIS_W, (selectedMemberIds.length || 1) * 120) : 300;

  // ── Resize state (events) ────────────────────────────────────
  const [resizing, setResizing] = useState<ResizingState | null>(null);

  // ── Current time line ────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const currentHourExact = now.getHours() + now.getMinutes() / 60;

  // ── Initial scroll (ONE scrollTo per view-mode change) ───────
  useInitialScroll({
    viewMode, weekScrollRef: weekRef, dayScrollRef: dayRef, monthScrollRef: monthRef,
    days, months, weekStartDay,
    dayWidth: actualDayWidth, singleDayWidth, hourHeight,
  });

  // ── Navigation ───────────────────────────────────────────────
  const scrollWeekBy = useCallback((dir: number) => {
    if (!weekRef.current || actualDayWidth <= 0) return;
    weekRef.current.scrollBy({ left: dir * actualDayWidth * 7, behavior: "smooth" });
  }, [actualDayWidth]);

  const handleToday = useCallback(() => {
    const scrollTop = 8 * hourHeight;
    if (viewMode === "week" && weekRef.current) {
      const today = new Date();
      let off = today.getDay() - weekStartDay; if (off < 0) off += 7;
      const ws = new Date(today.getFullYear(), today.getMonth(), today.getDate() - off);
      const col = weekRef.current.querySelector(`[data-day-index="${getDayIndex(ws)}"]`) as HTMLElement | null;
      const left = col ? Math.max(0, col.offsetLeft - TIME_AXIS_W) : 0;
      weekRef.current.scrollTo({ left, top: scrollTop, behavior: "smooth" });
    } else if (viewMode === "day" && dayRef.current) {
      const idx = days.findIndex((d) => d.isToday);
      dayRef.current.scrollTo({ left: Math.max(0, idx * singleDayWidth), top: scrollTop, behavior: "smooth" });
    } else if (viewMode === "month" && monthRef.current) {
      const now2 = new Date();
      const mi = months.findIndex((m) => m.year === now2.getFullYear() && m.month === now2.getMonth());
      if (mi >= 0) monthRef.current.scrollTo({ left: mi * monthRef.current.clientWidth, behavior: "smooth" });
    }
  }, [viewMode, days, months, weekStartDay, singleDayWidth, hourHeight]);

  // ── Week scroll → update header month/year ──────────────────
  const handleWeekScroll = useCallback(() => {
    if (!weekRef.current || actualDayWidth <= 0) return;
    const col = Math.max(0, Math.round(weekRef.current.scrollLeft / actualDayWidth));
    const day = days[Math.min(col, days.length - 1)];
    if (day) setCurrentMonthYear(`${day.date.getFullYear()}年 ${day.date.getMonth() + 1}月`);
  }, [actualDayWidth, days, setCurrentMonthYear]);

  // ── PC mouse selection (new event) ──────────────────────────
  const pcSelRef = useRef<{ dayIndex: number; colIndex: number; startHour: number } | null>(null);

  const handleSlotMouseDown = useCallback((dayIndex: number, colIndex: number, hour: number) => {
    pcSelRef.current = { dayIndex, colIndex, startHour: hour };
    setSelection({ dayIndex, colIndex, startHour: hour, endHour: hour + 1 });
  }, [setSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!pcSelRef.current || !selection) return;
    const col = document.querySelector(`[data-day-index="${pcSelRef.current.dayIndex}"]`) as HTMLElement | null;
    if (!col) return;
    const relY = e.clientY - col.getBoundingClientRect().top;
    const hour = Math.max(0, Math.min(23.75, Math.round((relY / hourHeight) * 4) / 4));
    setSelection((prev) => prev ? { ...prev, endHour: hour } : null);
  }, [selection, hourHeight, setSelection]);

  const handleMouseUp = useCallback(() => {
    if (!selection || !pcSelRef.current) return;
    const start = Math.min(selection.startHour, selection.endHour);
    const end = Math.max(selection.startHour, selection.endHour);
    const dur = Math.max(0.25, Math.round((end - start) * 4) / 4);
    handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, dur);
    setSelection(null);
    pcSelRef.current = null;
  }, [selection, handleRangeSelect, setSelection]);

  // ── Touch selection callbacks (from useWeekTouch) ────────────
  const onSelStart = useCallback((s: SelectionState) => setSelection(s), [setSelection]);
  const onSelUpdate = useCallback((endHour: number) => {
    setSelection((prev) => prev ? { ...prev, endHour } : null);
  }, [setSelection]);
  const onSelCommit = useCallback(() => {
    if (!selection) return;
    const start = Math.min(selection.startHour, selection.endHour);
    const end = Math.max(selection.startHour, selection.endHour);
    const dur = Math.max(0.25, Math.round((end - start) * 4) / 4);
    handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, dur);
    setSelection(null);
  }, [selection, handleRangeSelect, setSelection]);
  const onSelCancel = useCallback(() => setSelection(null), [setSelection]);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white" ref={mainRef}>
      <CalendarHeader
        displayMonthYear={currentMonthYear}
        viewMode={viewMode} setViewMode={setViewMode}
        onPrev={() => viewMode === "week" ? scrollWeekBy(-1) : undefined}
        onNext={() => viewMode === "week" ? scrollWeekBy(1)  : undefined}
        onToday={handleToday}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsRightPanelOpen={setIsRightPanelOpen}
        setIsScheduleModalOpen={setIsScheduleModalOpen ?? (() => {})}
        setIsCreateEventModalOpen={setIsCreateEventModalOpen ?? (() => {})}
        accentColor={accentColor}
      />

      <div className="flex-1 overflow-hidden relative">
        {viewMode === "week" && (
          <WeekView
            days={days} hours={hours}
            currentHourExact={currentHourExact}
            accentColor={accentColor} hourHeight={hourHeight}
            weekStartDay={weekStartDay}
            selectedMemberIds={selectedMemberIds} members={members}
            events={events} eventLayouts={eventLayouts}
            selection={selection}
            onSelectionStart={onSelStart} onSelectionUpdate={onSelUpdate}
            onSelectionCommit={onSelCommit} onSelectionCancel={onSelCancel}
            resizing={resizing} setResizing={setResizing}
            onResizeCommit={handleResizeCommit}
            onEventClick={handleEventClick}
            onEventDragStart={handleEventDragStart}
            onDragOver={handleDragOver}
            onDrop={(e, di, h) => handleDrop(e, di, h)}
            scrollRef={weekRef}
            onScroll={handleWeekScroll}
            onSlotMouseDown={handleSlotMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        )}
        {viewMode === "day" && (
          <DayView
            days={days} hours={hours}
            currentHourExact={currentHourExact}
            accentColor={accentColor} hourHeight={hourHeight}
            selectedMemberIds={selectedMemberIds} members={members}
            events={events} eventLayouts={eventLayouts}
            selection={selection} setSelection={setSelection}
            resizing={resizing} setResizing={setResizing}
            onResizeCommit={handleResizeCommit}
            onEventClick={handleEventClick}
            onEventDragStart={handleEventDragStart}
            onDragOver={handleDragOver}
            onDrop={(e, di, h) => handleDrop(e, di, h)}
            scrollRef={dayRef}
            singleDayWidth={singleDayWidth}
            onSlotMouseDown={handleSlotMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onRangeSelect={handleRangeSelect}
          />
        )}
        {viewMode === "month" && (
          <MonthView
            months={months} events={events}
            selectedMemberIds={selectedMemberIds} members={members}
            accentColor={accentColor} weekStartDay={weekStartDay}
            onEventClick={handleEventClick}
            onDragOver={handleDragOver}
            onDrop={(e, di, h) => handleDrop(e, di, h)}
            onEventDragStart={handleEventDragStart}
            scrollRef={monthRef}
          />
        )}
      </div>
    </main>
  );
});
