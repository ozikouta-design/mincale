"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { getDayIndex } from "@/app/page";
import CalendarHeader from "./CalendarHeader";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";
import { TIME_AXIS_WIDTH_PX } from "@/constants/calendar";
import { useCalendar } from "@/context/CalendarContext";
import { CalendarEvent, DragOverSlot, TodoTouchDragState } from "@/types";
import { useSelectionDrag } from "@/hooks/useSelectionDrag";
import { useTouchDrag } from "@/hooks/useTouchDrag";

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
    todoTouchDrag, setTodoTouchDrag,
  } = useCalendar();

  const [dragOverSlot, setDragOverSlot] = useState<DragOverSlot | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    eventId: string; initialDuration: number; startY: number;
    currentDuration: number; memberId: string;
  } | null>(null);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const monthScrollContainerRef = useRef<HTMLDivElement>(null);

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

  const effectiveWidth = containerWidth > 0
    ? containerWidth
    : (typeof window !== "undefined" ? window.innerWidth : 375);
  const weekDayWidth = (effectiveWidth - TIME_AXIS_WIDTH_PX) / 7;
  const activeMemberCount = selectedMemberIds.length || 1;
  const singleDayWidth = effectiveWidth > TIME_AXIS_WIDTH_PX
    ? Math.max(effectiveWidth - TIME_AXIS_WIDTH_PX, activeMemberCount * 120)
    : Math.max(300, activeMemberCount * 120);

  /**
   * タッチ座標 → スロット変換（elementFromPoint + data属性ベース）
   * スクロール量・ヘッダー高さの影響を受けない正確な実装
   */
  const getSlotFromTouch = useCallback(
    (clientX: number, clientY: number): {
      dayIndex: number; colIndex: number; startHour: number; memberId?: string
    } | null => {
      if (viewMode === "month") return null;
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;

      const dayCol = el.closest("[data-day-index]") as HTMLElement | null;
      if (!dayCol) return null;

      const dayIndex = Number(dayCol.getAttribute("data-day-index"));
      const colIndex = days.findIndex((d) => d.dayIndex === dayIndex);
      if (colIndex === -1) return null;

      const dayRect = dayCol.getBoundingClientRect();
      const startHour = Math.max(0, Math.min(23.75, (clientY - dayRect.top) / hourHeight));

      let memberId: string | undefined;
      if (viewMode === "day") {
        const memberCol = el.closest("[data-member-id]") as HTMLElement | null;
        if (memberCol) {
          memberId = memberCol.getAttribute("data-member-id") || undefined;
        } else if (selectedMemberIds.length > 0) {
          const relX = clientX - dayRect.left;
          const memberColWidth = dayRect.width / selectedMemberIds.length;
          const memberIdx = Math.min(
            selectedMemberIds.length - 1,
            Math.max(0, Math.floor(relX / memberColWidth))
          );
          memberId = selectedMemberIds[memberIdx];
        }
      }

      return { dayIndex, colIndex, startHour: Math.round(startHour * 4) / 4, memberId };
    },
    [viewMode, days, hourHeight, selectedMemberIds]
  );

  // ── Hook: 長押し新規予定 & マウス選択 ──────────────────────────
  const { selection, setSelection, selectionActive, handleSlotMouseDown } =
    useSelectionDrag({
      wrapperRef: mainWrapperRef,
      hourHeight,
      getSlotFromTouch,
      handleRangeSelect,
    });

  // ── Hook: タッチドラッグ（既存イベント + Todo） ────────────────
  const { touchDragInfo, handleTouchEventDragStart } = useTouchDrag({
    getSlotFromTouch,
    handleDrop,
    todoTouchDrag: todoTouchDrag as TodoTouchDragState | null,
    setTodoTouchDrag: setTodoTouchDrag as React.Dispatch<React.SetStateAction<TodoTouchDragState | null>>,
    setDragOverSlot,
  });

  // ── イベントレイアウト計算 ────────────────────────────────────
  const eventLayouts = useMemo(() => {
    const layouts: Record<string, { column: number; totalColumns: number }> = {};
    const visibleEvents = events.filter(
      (e) => selectedMemberIds.includes(e.memberId) && !e.isAllDay
    );

    const processEvents = (colEvents: CalendarEvent[]) => {
      colEvents.sort((a, b) => a.startHour - b.startHour || b.duration - a.duration);
      const clusters: CalendarEvent[][] = [];
      let currentCluster: CalendarEvent[] = [];
      let clusterEnd = 0;
      colEvents.forEach((ev) => {
        if (currentCluster.length === 0) {
          currentCluster.push(ev); clusterEnd = ev.startHour + ev.duration;
        } else if (ev.startHour < clusterEnd) {
          currentCluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.startHour + ev.duration);
        } else {
          clusters.push(currentCluster); currentCluster = [ev]; clusterEnd = ev.startHour + ev.duration;
        }
      });
      if (currentCluster.length > 0) clusters.push(currentCluster);
      clusters.forEach((cluster) => {
        const columns: CalendarEvent[][] = [];
        cluster.forEach((ev) => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastEv = columns[i][columns[i].length - 1];
            if (lastEv.startHour + lastEv.duration <= ev.startHour + 0.001) {
              columns[i].push(ev);
              layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 };
              placed = true; break;
            }
          }
          if (!placed) {
            columns.push([ev]);
            layouts[`${ev.id}-${ev.memberId}`] = { column: columns.length - 1, totalColumns: 0 };
          }
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

  // ── ナビゲーション ─────────────────────────────────────────────
  const handlePrev = () => {
    if (viewMode === "day" && dayScrollContainerRef.current)
      dayScrollContainerRef.current.scrollBy({ left: -singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current)
      weekScrollContainerRef.current.scrollBy({ left: -weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current)
      monthScrollContainerRef.current.scrollBy({ left: -monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  };
  const handleNext = () => {
    if (viewMode === "day" && dayScrollContainerRef.current)
      dayScrollContainerRef.current.scrollBy({ left: singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current)
      weekScrollContainerRef.current.scrollBy({ left: weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current)
      monthScrollContainerRef.current.scrollBy({ left: monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
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

  // ── 初期スクロール位置 ─────────────────────────────────────────
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

  // ── スクロールハンドラ ─────────────────────────────────────────
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

  // ── リサイズ（マウス + タッチ） ───────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingEvent) return;
      const deltaY = e.clientY - resizingEvent.startY;
      const dur = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
      setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
    };
    const onMouseUp = () => {
      if (resizingEvent) {
        handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
        setResizingEvent(null);
      }
    };
    const onTouchMoveResize = (e: TouchEvent) => {
      if (!resizingEvent) return;
      e.preventDefault();
      const deltaY = e.touches[0].clientY - resizingEvent.startY;
      const dur = Math.round((resizingEvent.initialDuration + deltaY / hourHeight) * 4) / 4;
      setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
    };
    const onTouchEndResize = () => {
      if (resizingEvent) {
        handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
        setResizingEvent(null);
      }
    };

    if (resizingEvent) {
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
  }, [resizingEvent, handleEventResize, hourHeight]);

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

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0" ref={mainWrapperRef}>
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
            selectionActive={selectionActive}
            handleSlotMouseDown={handleSlotMouseDown}
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
            selectionActive={selectionActive}
            handleSlotMouseDown={handleSlotMouseDown}
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

      {/* イベントドラッグ中のゴースト */}
      {touchDragInfo?.isDragging && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-md px-2 py-1 text-white text-xs shadow-2xl border border-white/30"
          aria-hidden="true"
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

      {/* Todo長押しドラッグ中のゴースト */}
      {todoTouchDrag?.isDragging && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-xl px-3 py-2 text-white text-xs shadow-2xl border border-white/30 flex items-center gap-1.5"
          aria-hidden="true"
          style={{
            left: todoTouchDrag.ghostX - 60,
            top: todoTouchDrag.ghostY - 20,
            backgroundColor: "#1d4ed8",
            opacity: 0.92,
            transform: "scale(1.06) rotate(-1.5deg)",
            maxWidth: 160,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span className="text-[10px]">📋</span>
          <span className="font-bold truncate">{todoTouchDrag.title}</span>
        </div>
      )}
    </main>
  );
});

export default CalendarMain;
