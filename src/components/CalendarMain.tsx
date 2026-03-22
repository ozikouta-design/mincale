"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import toast from "react-hot-toast";
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
    todoTouchDrag, setTodoTouchDrag,
  } = useCalendar();

  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; startHour: number } | null>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ eventId: string; initialDuration: number; startY: number; currentDuration: number; memberId: string } | null>(null);

  const [touchDragInfo, setTouchDragInfo] = useState<{
    eventId: string; memberId: string; isGoogle: boolean;
    ghostX: number; ghostY: number; title: string; color: string;
    isDragging: boolean; initX: number; initY: number;
    isPending: boolean;
    dragAxis?: 'x' | 'y';
  } | null>(null);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const monthScrollContainerRef = useRef<HTMLDivElement>(null);

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const weekScrollSnapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const currentHourExact = currentTime.getHours() + currentTime.getMinutes() / 60;

  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 0
  );
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

  // ★★★ 座標ずれの根本修正 ★★★
  //
  // 旧実装の問題:
  //   scrollLeft / scrollTop / CALENDAR_HEADER_HEIGHT / TIME_AXIS_WIDTH_PX を
  //   手計算で組み合わせていた → iOSのstickyヘッダーとの組み合わせで座標がずれる
  //
  // 新実装:
  //   1. document.elementFromPoint() でブラウザに正確なヒットテストをさせる
  //   2. 日カラム要素の data-day-index 属性から dayIndex を取得
  //   3. startHour は日カラムの getBoundingClientRect().top から直接計算
  //   → scrollLeft/scrollTop/ヘッダー高/軸幅の手計算が一切不要
  const getSlotFromTouch = useCallback(
    (clientX: number, clientY: number): { dayIndex: number; colIndex: number; startHour: number; memberId?: string } | null => {
      if (viewMode === "month") return null;

      // ブラウザのヒットテストで実際にタッチされた要素を取得
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;

      // data-day-index を持つ日カラム要素を探す（WeekView/DayView共通）
      const dayCol = el.closest('[data-day-index]') as HTMLElement | null;
      if (!dayCol) return null;

      const dayIndex = Number(dayCol.getAttribute('data-day-index'));
      const colIndex = days.findIndex(d => d.dayIndex === dayIndex);
      if (colIndex === -1) return null;

      // startHour: 日カラムの上端（= 時間グリッドの 0:00）からの距離で計算
      // getBoundingClientRect はビューポート座標で正確な値を返すので
      // scroll位置やstickyヘッダーの影響を受けない
      const dayRect = dayCol.getBoundingClientRect();
      const relY = clientY - dayRect.top;
      const startHour = Math.max(0, Math.min(23.75, relY / hourHeight));

      // DayView: メンバーカラムを特定（data-member-id属性で）
      let memberId: string | undefined;
      if (viewMode === "day") {
        const memberCol = el.closest('[data-member-id]') as HTMLElement | null;
        if (memberCol) {
          memberId = memberCol.getAttribute('data-member-id') || undefined;
        } else if (selectedMemberIds.length > 0) {
          // フォールバック: X座標からメンバーカラムを推定
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

  const handleTouchEventDragStart = useCallback(
    (eventId: string, isGoogle: boolean, memberId: string, clientX: number, clientY: number, title: string, color: string) => {
      setTouchDragInfo({ eventId, memberId, isGoogle, ghostX: clientX, ghostY: clientY, title, color, isDragging: false, initX: clientX, initY: clientY, isPending: true });

      touchTimerRef.current = setTimeout(() => {
        setTouchDragInfo((prev) => prev ? { ...prev, isPending: false } : null);
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(30);
      }, 400);
    },
    []
  );

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

  const clearWeekSnap = () => {
    if (weekScrollSnapTimerRef.current) clearTimeout(weekScrollSnapTimerRef.current);
  };
  const handlePrev = () => {
    clearWeekSnap();
    if (viewMode === "day" && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: -singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: -weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: -monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  };
  const handleNext = () => {
    clearWeekSnap();
    if (viewMode === "day" && dayScrollContainerRef.current) dayScrollContainerRef.current.scrollBy({ left: singleDayWidth, behavior: "smooth" });
    else if (viewMode === "week" && weekScrollContainerRef.current) weekScrollContainerRef.current.scrollBy({ left: weekDayWidth * 7, behavior: "smooth" });
    else if (viewMode === "month" && monthScrollContainerRef.current) monthScrollContainerRef.current.scrollBy({ left: monthScrollContainerRef.current.clientWidth, behavior: "smooth" });
  };
  const handleToday = () => {
    clearWeekSnap();
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
    const el = weekScrollContainerRef.current;
    const idx = Math.max(0, Math.floor((el.scrollLeft + weekDayWidth / 2) / weekDayWidth));
    if (days[idx]) setCurrentMonthYear(`${days[idx].date.getFullYear()}年 ${days[idx].date.getMonth() + 1}月`);

    // スクロール停止後に最寄りの週先頭にスナップ（スワイプ対応）
    if (weekScrollSnapTimerRef.current) clearTimeout(weekScrollSnapTimerRef.current);
    weekScrollSnapTimerRef.current = setTimeout(() => {
      if (!weekScrollContainerRef.current || weekDayWidth === 0) return;
      const weekWidth = weekDayWidth * 7;
      const nearestWeek = Math.round(el.scrollLeft / weekWidth) * weekWidth;
      if (Math.abs(el.scrollLeft - nearestWeek) > 2) {
        el.scrollTo({ left: nearestWeek, behavior: "smooth" });
      }
    }, 150);
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

  // ── マウス & リサイズのタッチ ──────────────────────────────────
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
        const end   = Math.max(selection.startHour, selection.currentHour);
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

    if (resizingEvent) {
      window.addEventListener("touchmove", onTouchMoveResize, { passive: false });
      window.addEventListener("touchend", onTouchEndResize);
    }
    if (selection || resizingEvent) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMoveResize);
      window.removeEventListener("touchend", onTouchEndResize);
    };
  }, [selection, resizingEvent, handleRangeSelect, handleEventResize, hourHeight]);

  // ★機能1: 長押しでの新規予定作成（Google Calendar風）
  useEffect(() => {
    const wrapper = mainWrapperRef.current;
    if (!wrapper) return;

    const selRef = { current: null as { dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null };
    let longPressTimer: NodeJS.Timeout | null = null;
    let startX = 0, startY = 0;
    let longPressActivated = false;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('.calendar-event') ||
        target.closest('.modal-content') ||
        target.closest('[data-no-axis-lock]')
      ) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      longPressActivated = false;

      longPressTimer = setTimeout(() => {
        const slot = getSlotFromTouch(startX, startY);
        if (!slot) return;

        longPressActivated = true;
        const newSel = {
          dayIndex: slot.dayIndex,
          colIndex: slot.colIndex,
          memberId: slot.memberId,
          startHour: slot.startHour,
          currentHour: slot.startHour + 1,
        };
        selRef.current = newSel;
        setSelection(newSel);
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      }, 450);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressActivated && selRef.current) {
        e.preventDefault();
        const touch = e.touches[0];

        // ★ touchmove中: 日カラム要素の rect.top を直接使って currentHour を計算
        //    elementFromPoint は指の下にゴーストがある場合うまくいかないことがあるため、
        //    長押し開始時の dayIndex の日カラム要素を直接参照する
        const dayCol = document.querySelector(`[data-day-index="${selRef.current.dayIndex}"]`) as HTMLElement | null;
        if (dayCol) {
          const dayRect = dayCol.getBoundingClientRect();
          const relY = touch.clientY - dayRect.top;
          const newHour = Math.max(0, Math.min(23.75, relY / hourHeight));
          selRef.current = { ...selRef.current, currentHour: Math.round(newHour * 4) / 4 };
          setSelection({ ...selRef.current });
        }
        return;
      }
      if (longPressTimer) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

      if (longPressActivated && selRef.current) {
        const sel = selRef.current;
        const touch = e.changedTouches[0];

        const dayCol = document.querySelector(`[data-day-index="${sel.dayIndex}"]`) as HTMLElement | null;
        let finalHour = sel.currentHour;
        if (dayCol) {
          const dayRect = dayCol.getBoundingClientRect();
          const relY = touch.clientY - dayRect.top;
          finalHour = Math.max(0, Math.min(23.75, Math.round((relY / hourHeight) * 4) / 4));
        }

        const startHr = Math.min(sel.startHour, finalHour);
        const endHr   = Math.max(sel.startHour, finalHour);
        let duration = Math.round((endHr - startHr) * 4) / 4;
        if (duration < 0.25) duration = 1;

        handleRangeSelect(sel.dayIndex, Math.round(startHr * 4) / 4, duration);
        setSelection(null);
        selRef.current = null;
        longPressActivated = false;
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(20);
      }
    };

    const handleTouchCancel = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (longPressActivated) {
        setSelection(null);
        selRef.current = null;
        longPressActivated = false;
      }
    };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    wrapper.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchmove', handleTouchMove);
      wrapper.removeEventListener('touchend', handleTouchEnd);
      wrapper.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [getSlotFromTouch, handleRangeSelect, hourHeight]);

  // ★機能2: タッチドラッグの移動軸ロック
  useEffect(() => {
    if (!touchDragInfo) return;

    const DRAG_THRESHOLD = 8;

    const onTouchMoveDrag = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchDragInfo.initX;
      const dy = touch.clientY - touchDragInfo.initY;

      if (touchDragInfo.isPending) {
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
          setTouchDragInfo(null);
        }
        return;
      }

      e.preventDefault();

      let newAxis = touchDragInfo.dragAxis;
      if (!newAxis && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        newAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      let currentX = touch.clientX;
      let currentY = touch.clientY;

      if (newAxis === 'x') {
        currentY = touchDragInfo.initY;
      } else if (newAxis === 'y') {
        currentX = touchDragInfo.initX;
      }

      const slot = getSlotFromTouch(currentX, currentY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      setTouchDragInfo((prev) => prev ? { ...prev, ghostX: currentX, ghostY: currentY, isDragging: true, dragAxis: newAxis } : null);
    };

    const onTouchEndDrag = (e: TouchEvent) => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

      if (!touchDragInfo.isDragging) {
        setTouchDragInfo(null);
        setDragOverSlot(null);
        return;
      }

      const touch = e.changedTouches[0];
      let finalX = touch.clientX, finalY = touch.clientY;
      if (touchDragInfo.dragAxis === 'x') finalY = touchDragInfo.initY;
      else if (touchDragInfo.dragAxis === 'y') finalX = touchDragInfo.initX;

      const slot = getSlotFromTouch(finalX, finalY);
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

  // ★機能3: TodoカードのiPhone長押しドラッグ → カレンダーへドロップ
  useEffect(() => {
    if (!todoTouchDrag?.isDragging) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setTodoTouchDrag((prev) => prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY } : null);
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      else setDragOverSlot(null);
    };

    const onEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot && todoTouchDrag) {
        const { todoId } = todoTouchDrag;
        const fake = {
          preventDefault: () => {},
          dataTransfer: {
            getData: (k: string) => ({ type: "todo", todoId: todoId.toString() } as Record<string, string>)[k] ?? "",
          },
        } as unknown as React.DragEvent<HTMLDivElement>;
        handleDrop(fake, slot.dayIndex, slot.startHour);
      } else if (todoTouchDrag && !slot) {
        toast.error("カレンダーの時間帯にドロップしてください");
      }
      setTodoTouchDrag(null);
      setDragOverSlot(null);
    };

    const onCancel = () => {
      setTodoTouchDrag(null);
      setDragOverSlot(null);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [todoTouchDrag, getSlotFromTouch, handleDrop, setTodoTouchDrag]);

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
            selectionActive={!!selection}
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
            dayWidth={weekDayWidth}
            handleTouchEventDragStart={handleTouchEventDragStart}
            selectionActive={!!selection}
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

      {todoTouchDrag?.isDragging && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-xl px-3 py-2 text-white text-xs shadow-2xl border border-white/30 flex items-center gap-1.5"
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