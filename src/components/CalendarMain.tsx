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

  // ── 幅の計算（週・日で統一） ────────────────────────────────────
  const [weekContainerClientWidth, setWeekContainerClientWidth] = useState(0);
  useEffect(() => {
    const el = weekScrollContainerRef.current;
    if (!el) return;
    const update = () => setWeekContainerClientWidth(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewMode]);

  const [mainContainerWidth, setMainContainerWidth] = useState(0);
  useEffect(() => {
    if (!mainWrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setMainContainerWidth(e.contentRect.width);
    });
    obs.observe(mainWrapperRef.current);
    return () => obs.disconnect();
  }, [viewMode]);

  const effectiveMainWidth = mainContainerWidth > 0
    ? mainContainerWidth
    : (typeof window !== "undefined" ? window.innerWidth : 375);

  const actualWeekDayWidth = weekContainerClientWidth > TIME_AXIS_WIDTH_PX
    ? (weekContainerClientWidth - TIME_AXIS_WIDTH_PX) / 7
    : (effectiveMainWidth - TIME_AXIS_WIDTH_PX) / 7;

  const activeMemberCount = selectedMemberIds.length || 1;
  const singleDayWidth = effectiveMainWidth > TIME_AXIS_WIDTH_PX
    ? Math.max(effectiveMainWidth - TIME_AXIS_WIDTH_PX, activeMemberCount * 120)
    : Math.max(300, activeMemberCount * 120);

  // ── ★修正3: 座標ズレの解決（純粋な数学的計算に変更） ────────────────────
  const getSlotFromTouch = useCallback(
    (clientX: number, clientY: number): {
      dayIndex: number; colIndex: number; startHour: number; memberId?: string
    } | null => {
      if (viewMode === "month") return null;
      const scrollRef = viewMode === "week" ? weekScrollContainerRef : dayScrollContainerRef;
      if (!scrollRef.current) return null;

      const rect = scrollRef.current.getBoundingClientRect();
      
      // 時間軸（左）や曜日ヘッダー（上:72px）でのタッチは無効化
      if (clientX - rect.left < TIME_AXIS_WIDTH_PX) return null;
      if (clientY - rect.top < 72) return null;

      const colWidth = viewMode === "week" ? actualWeekDayWidth : singleDayWidth;
      
      // スクロール量を加味してX座標（列）を特定
      const relX = (clientX - rect.left) + scrollRef.current.scrollLeft - TIME_AXIS_WIDTH_PX;
      const colIndex = Math.floor(relX / colWidth);

      if (colIndex < 0 || colIndex >= days.length) return null;

      // スクロール量とヘッダー高さ(72px)を加味してY座標（時間）を特定
      const relY = (clientY - rect.top) + scrollRef.current.scrollTop - 72;
      const startHour = Math.max(0, Math.min(23.75, relY / hourHeight));

      let memberId: string | undefined;
      if (viewMode === "day" && selectedMemberIds.length > 0) {
        const memberColWidth = colWidth / selectedMemberIds.length;
        const dayRelX = relX - (colIndex * colWidth);
        const memberIdx = Math.min(selectedMemberIds.length - 1, Math.max(0, Math.floor(dayRelX / memberColWidth)));
        memberId = selectedMemberIds[memberIdx];
      }

      return { dayIndex: days[colIndex].dayIndex, colIndex, startHour: Math.round(startHour * 4) / 4, memberId };
    },
    [viewMode, actualWeekDayWidth, singleDayWidth, days, hourHeight, selectedMemberIds]
  );

  // ── Hook: 長押し新規予定 & マウス選択 ──────────────────────────
  const { selection, setSelection, selectionActive, handleSlotMouseDown } =
    useSelectionDrag({ wrapperRef: mainWrapperRef, hourHeight, getSlotFromTouch, handleRangeSelect });

  // ── Hook: タッチドラッグ ────────────────────────────────────────
  const { touchDragInfo, handleTouchEventDragStart } = useTouchDrag({
    getSlotFromTouch, handleDrop,
    todoTouchDrag: todoTouchDrag as TodoTouchDragState | null,
    setTodoTouchDrag: setTodoTouchDrag as React.Dispatch<React.SetStateAction<TodoTouchDragState | null>>,
    setDragOverSlot,
  });

  // ── イベントレイアウト計算 ────────────────────────────────────
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

  // ── ナビゲーション（actualWeekDayWidth で統一） ────────────────
  const handlePrev = useCallback(() => {
    if (viewMode === "day" && dayScrollContainerRef.current)
      dayScrollContainerRef.current.scrollBy({ left: -singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current)
      weekScrollContainerRef.current.scrollBy({ left: -actualWeekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current)
      monthScrollContainerRef.current.scrollBy({ left: -monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  }, [viewMode, singleDayWidth, actualWeekDayWidth]);

  const handleNext = useCallback(() => {
    if (viewMode === "day" && dayScrollContainerRef.current)
      dayScrollContainerRef.current.scrollBy({ left: singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current)
      weekScrollContainerRef.current.scrollBy({ left: actualWeekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current)
      monthScrollContainerRef.current.scrollBy({ left: monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  }, [viewMode, singleDayWidth, actualWeekDayWidth]);

  const getScrollLeftForDay = useCallback((container: HTMLElement, targetDayIndex: number) => {
    const el = container.querySelector(`[data-day-index="${targetDayIndex}"]`) as HTMLElement;
    if (el) { return el.offsetLeft - TIME_AXIS_WIDTH_PX; }
    const idx = days.findIndex((d) => d.dayIndex === targetDayIndex);
    return Math.max(0, idx * actualWeekDayWidth);
  }, [days, actualWeekDayWidth]);

  // ── ★修正1: 12月ジャンプ問題の解決（getDayIndexで統一） ────────────────
  const handleToday = useCallback(() => {
    if (viewMode === "day" && dayScrollContainerRef.current) {
      const idx = days.findIndex((d) => d.isToday);
      if (idx !== -1) dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, behavior: "smooth" });
    } else if (viewMode === "week" && weekScrollContainerRef.current) {
      const today = new Date();
      let dayOffset = today.getDay() - weekStartDay;
      if (dayOffset < 0) dayOffset += 7;
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
      const targetDayIndex = getDayIndex(weekStart); // 確実に同じロジックで検索
      const scrollLeft = getScrollLeftForDay(weekScrollContainerRef.current, targetDayIndex);
      weekScrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: "smooth" });
    } else if (viewMode === "month" && monthScrollContainerRef.current) {
      const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
      if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
    }
  }, [viewMode, days, months, singleDayWidth, getScrollLeftForDay, weekStartDay]);

  // ── ★修正2: 0時にジャンプする問題の解決（描画待機と暴発防止） ───────────
  const alignedViewRef = useRef<string | null>(null);

  useEffect(() => {
    const DEFAULT_SCROLL_HOUR = 9;
    if (viewMode === "week" && actualWeekDayWidth <= 0) return;
    if (viewMode === "day" && singleDayWidth <= 0) return;
    
    if (alignedViewRef.current === viewMode) return;

    const align = () => {
      const DEFAULT_SCROLL_TOP = DEFAULT_SCROLL_HOUR * hourHeight;
      if (viewMode === "week" && weekScrollContainerRef.current) {
        const today = new Date();
        let dayOffset = today.getDay() - weekStartDay;
        if (dayOffset < 0) dayOffset += 7;
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
        const targetDayIndex = getDayIndex(weekStart);
        const scrollLeft = getScrollLeftForDay(weekScrollContainerRef.current, targetDayIndex);
        // ★修正: left と top を1回の scrollTo で同時設定
        // 分割すると間に onScroll が発火して12月・0時ジャンプが起きる
        weekScrollContainerRef.current.scrollTo({ left: scrollLeft, top: DEFAULT_SCROLL_TOP, behavior: "auto" });
      } else if (viewMode === "day" && dayScrollContainerRef.current) {
        const idx = days.findIndex((d) => d.isToday);
        if (idx !== -1) {
          dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, top: DEFAULT_SCROLL_TOP, behavior: "auto" });
        }
      } else if (viewMode === "month" && monthScrollContainerRef.current) {
        const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
        if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "auto" });
      }
      alignedViewRef.current = viewMode;
    };
    
    const t = setTimeout(align, 150);
    return () => clearTimeout(t);
  }, [viewMode, days, months, actualWeekDayWidth, singleDayWidth, weekStartDay, hourHeight, getScrollLeftForDay]);

  // ── スクロールハンドラ ─────────────────────────────────────────
  const handleWeekScroll = useCallback(() => {
    if (viewMode !== "week" || !weekScrollContainerRef.current || actualWeekDayWidth <= 0) return;
    const scrollLeft = Math.max(0, weekScrollContainerRef.current.scrollLeft);
    const colIndex = Math.round(scrollLeft / actualWeekDayWidth);
    const dayAtWeekStart = days[Math.min(colIndex, days.length - 1)];
    if (dayAtWeekStart) setCurrentMonthYear(`${dayAtWeekStart.date.getFullYear()}年 ${dayAtWeekStart.date.getMonth() + 1}月`);
  }, [viewMode, actualWeekDayWidth, days, setCurrentMonthYear]);

  const handleDayScroll = useCallback(() => {
    if (viewMode !== "day" || !dayScrollContainerRef.current || singleDayWidth === 0) return;
    const idx = Math.max(0, Math.round(dayScrollContainerRef.current.scrollLeft / singleDayWidth));
    if (days[idx]) setCurrentMonthYear(`${days[idx].date.getFullYear()}年 ${days[idx].date.getMonth() + 1}月`);
  }, [viewMode, singleDayWidth, days, setCurrentMonthYear]);

  const handleMonthScroll = useCallback(() => {
    if (viewMode !== "month" || !monthScrollContainerRef.current) return;
    const w = monthScrollContainerRef.current.clientWidth;
    if (w === 0) return;
    const idx = Math.max(0, Math.round(monthScrollContainerRef.current.scrollLeft / w));
    if (months[idx]) setCurrentMonthYear(`${months[idx].year}年 ${months[idx].month + 1}月`);
  }, [viewMode, months, setCurrentMonthYear]);

  // ── リサイズと選択枠の操作 ───────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingEvent) {
        const dur = Math.round((resizingEvent.initialDuration + (e.clientY - resizingEvent.startY) / hourHeight) * 4) / 4;
        setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
      }
    };
    const onMouseUp = () => {
      if (resizingEvent) {
        handleEventResize(resizingEvent.eventId, resizingEvent.currentDuration, resizingEvent.memberId);
        setResizingEvent(null);
      }
    };
    const onTouchMoveResize = (e: TouchEvent) => {
      if (resizingEvent) {
        e.preventDefault();
        const dur = Math.round((resizingEvent.initialDuration + (e.touches[0].clientY - resizingEvent.startY) / hourHeight) * 4) / 4;
        setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
      }
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

  // 長押し処理は useSelectionDrag hook が一元管理

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
            singleDayWidth={singleDayWidth} resizingEvent={resizingEvent} setResizingEvent={setResizingEvent}
            handleTouchEventDragStart={handleTouchEventDragStart}
            selectionActive={selectionActive} handleSlotMouseDown={handleSlotMouseDown}
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
            weekStartDay={weekStartDay}
            dayWidth={actualWeekDayWidth}
            handleTouchEventDragStart={handleTouchEventDragStart}
            selectionActive={selectionActive} handleSlotMouseDown={handleSlotMouseDown}
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
      {touchDragInfo?.isDragging && (
        <div className="fixed pointer-events-none z-[9999] rounded-md px-2 py-1 text-white text-xs shadow-2xl border border-white/30" aria-hidden="true"
          style={{ left: touchDragInfo.ghostX - 40, top: touchDragInfo.ghostY - 16, backgroundColor: touchDragInfo.color, opacity: 0.85, transform: "scale(1.08)", maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {touchDragInfo.title}
        </div>
      )}
      {todoTouchDrag?.isDragging && (
        <div className="fixed pointer-events-none z-[9999] rounded-xl px-3 py-2 text-white text-xs shadow-2xl border border-white/30 flex items-center gap-1.5" aria-hidden="true"
          style={{ left: todoTouchDrag.ghostX - 60, top: todoTouchDrag.ghostY - 20, backgroundColor: "#1d4ed8", opacity: 0.92, transform: "scale(1.06) rotate(-1.5deg)", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span className="text-[10px]">📋</span>
          <span className="font-bold truncate">{todoTouchDrag.title}</span>
        </div>
      )}
    </main>
  );
});

export default CalendarMain;