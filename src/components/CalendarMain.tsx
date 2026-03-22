"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import CalendarHeader from "./CalendarHeader";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";
import { TIME_AXIS_WIDTH_PX, CALENDAR_HEADER_HEIGHT } from "@/constants/calendar";
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

  // ── 幅の計算 ────────────────────────────────────
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

  // ── ★修正3: タッチ座標 → スロット変換（数学的計算へ変更・座標ズレの解決） ──
  const getSlotFromTouch = useCallback(
    (clientX: number, clientY: number): {
      dayIndex: number; colIndex: number; startHour: number; memberId?: string
    } | null => {
      if (viewMode === "month") return null;
      const scrollRef = viewMode === "week" ? weekScrollContainerRef : dayScrollContainerRef;
      if (!scrollRef.current) return null;

      const rect = scrollRef.current.getBoundingClientRect();
      const colWidth = viewMode === "week" ? actualWeekDayWidth : singleDayWidth;

      const relX = clientX - rect.left + scrollRef.current.scrollLeft - TIME_AXIS_WIDTH_PX;
      const relY = clientY - rect.top + scrollRef.current.scrollTop - CALENDAR_HEADER_HEIGHT;

      if (relX < 0 || relY < 0) return null;

      const colIndex = Math.floor(relX / colWidth);
      if (colIndex < 0 || colIndex >= days.length) return null;

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

  // ── Hook ──────────────────────────
  const { selection, setSelection, selectionActive, handleSlotMouseDown } =
    useSelectionDrag({ wrapperRef: mainWrapperRef, hourHeight, getSlotFromTouch, handleRangeSelect });

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

  // ── ナビゲーション ────────────────
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

  // ── ★修正1: 「今日」ボタン・12月ジャンプ問題の解決 ──
  const handleToday = useCallback(() => {
    if (viewMode === "day" && dayScrollContainerRef.current) {
      const idx = days.findIndex((d) => d.isToday);
      if (idx !== -1) dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, behavior: "smooth" });
    } else if (viewMode === "week" && weekScrollContainerRef.current) {
      const today = new Date();
      let dayOffset = today.getDay() - weekStartDay;
      if (dayOffset < 0) dayOffset += 7;
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
      const targetDayIndex = weekStart.getFullYear() * 10000 + (weekStart.getMonth() + 1) * 100 + weekStart.getDate();
      const idx = days.findIndex((d) => d.dayIndex === targetDayIndex);
      if (idx !== -1) {
        weekScrollContainerRef.current.scrollTo({ left: idx * actualWeekDayWidth, behavior: "smooth" });
      }
    } else if (viewMode === "month" && monthScrollContainerRef.current) {
      const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
      if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
    }
  }, [viewMode, days, months, singleDayWidth, actualWeekDayWidth, weekStartDay]);

  // ── ★修正2: いきなり0時に移動する問題の解決（alignedViewRefの導入） ──
  const alignedViewRef = useRef<string | null>(null);

  useEffect(() => {
    const DEFAULT_SCROLL_HOUR = 9;
    if (viewMode === "week" && actualWeekDayWidth <= 0) return;
    if (viewMode === "day" && singleDayWidth <= 0) return;
    
    // 既に現在のviewModeで初期スクロールが完了していれば何もしない（暴発防止）
    if (alignedViewRef.current === viewMode) return;

    const align = () => {
      if (viewMode === "week" && weekScrollContainerRef.current) {
        const today = new Date();
        let dayOffset = today.getDay() - weekStartDay;
        if (dayOffset < 0) dayOffset += 7;
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
        const targetDayIndex = weekStart.getFullYear() * 10000 + (weekStart.getMonth() + 1) * 100 + weekStart.getDate();
        const idx = days.findIndex((d) => d.dayIndex === targetDayIndex);

        if (idx !== -1) weekScrollContainerRef.current.scrollTo({ left: idx * actualWeekDayWidth, behavior: "auto" });
        weekScrollContainerRef.current.scrollTop = DEFAULT_SCROLL_HOUR * hourHeight;
      } else if (viewMode === "day" && dayScrollContainerRef.current) {
        const idx = days.findIndex((d) => d.isToday);
        if (idx !== -1) dayScrollContainerRef.current.scrollTo({ left: idx * singleDayWidth, behavior: "auto" });
        dayScrollContainerRef.current.scrollTop = DEFAULT_SCROLL_HOUR * hourHeight;
      } else if (viewMode === "month" && monthScrollContainerRef.current) {
        const idx = months.findIndex((m) => m.monthIndex === new Date().getFullYear() * 100 + new Date().getMonth());
        if (idx !== -1) monthScrollContainerRef.current.scrollTo({ left: idx * monthScrollContainerRef.current.clientWidth, behavior: "auto" });
      }
      // 初期スクロール完了マークを付ける
      alignedViewRef.current = viewMode;
    };
    
    const t = setTimeout(align, 100);
    return () => clearTimeout(t);
  }, [viewMode, days, months, actualWeekDayWidth, singleDayWidth, weekStartDay, hourHeight]);

  // ── スクロールハンドラ ─────────────────────────────────────────
  const handleWeekScroll = useCallback(() => {
    if (viewMode !== "week" || !weekScrollContainerRef.current || actualWeekDayWidth <= 0) return;
    const scrollLeft = Math.max(0, weekScrollContainerRef.current.scrollLeft);
    const colIndex = Math.round(scrollLeft / actualWeekDayWidth); // /7 * 7の誤作動を排除
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

  // ── リサイズ（マウス + タッチ）と選択枠の拡張 ───────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingEvent) {
        const dur = Math.round((resizingEvent.initialDuration + (e.clientY - resizingEvent.startY) / hourHeight) * 4) / 4;
        setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
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
      if (resizingEvent) {
        e.preventDefault();
        const dur = Math.round((resizingEvent.initialDuration + (e.touches[0].clientY - resizingEvent.startY) / hourHeight) * 4) / 4;
        setResizingEvent((prev) => (prev ? { ...prev, currentDuration: Math.max(0.25, dur) } : null));
      } else if (selection && mainWrapperRef.current) {
        e.preventDefault(); // スクロールを防いで枠を広げる
        const rect = mainWrapperRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.touches[0].clientY - rect.top, rect.height));
        setSelection((prev) => prev ? { ...prev, currentHour: Math.max(0, (y - CALENDAR_HEADER_HEIGHT) / hourHeight) } : null);
      }
    };
    const onTouchEndResize = () => {
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

    if (resizingEvent || selection) {
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
  }, [resizingEvent, selection, handleEventResize, handleRangeSelect, hourHeight, setSelection]);

  // ── 長押しでの新規作成枠呼び出し ───────────────────────────────
  useEffect(() => {
    const wrapper = mainWrapperRef.current;
    if (!wrapper) return;

    let timer: NodeJS.Timeout | null = null;
    let startX = 0, startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('button') || 
          (e.target as HTMLElement).closest('.calendar-event') || 
          (e.target as HTMLElement).closest('.modal-content')) return;
      
      const touch = e.touches[0];
      startX = touch.clientX; startY = touch.clientY;

      timer = setTimeout(() => {
        const slot = getSlotFromTouch(startX, startY);
        if (slot) {
           setSelection({ dayIndex: slot.dayIndex, colIndex: slot.colIndex, startHour: slot.startHour, currentHour: slot.startHour + 1 });
           if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(40);
        }
      }, 450);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (timer) {
         const touch = e.touches[0];
         if (Math.sqrt(Math.pow(touch.clientX - startX, 2) + Math.pow(touch.clientY - startY, 2)) > 10) {
           clearTimeout(timer); timer = null; 
         }
      }
    };

    const handleTouchEnd = () => { if (timer) { clearTimeout(timer); timer = null; } };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchmove', handleTouchMove);
      wrapper.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getSlotFromTouch, setSelection]);

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