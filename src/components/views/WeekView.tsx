import React, { useState, useEffect } from "react";
import { TIME_AXIS_WIDTH_PX } from "@/constants/calendar";
import { useTouchAxisScroll } from "@/hooks/useTouchAxisScroll";
import { useWeekHorizontalScroll } from "@/hooks/useWeekHorizontalScroll";
import type {
  CalendarEvent, Member, DayData, SelectionState,
  ResizingEventState, EventLayout, DragOverSlot
} from "@/types";

interface WeekViewProps {
  days: DayData[];
  hours: string[];
  currentHourExact: number;
  accentColor: string;
  hourHeight: number;
  dayWidth: number;
  selectedMemberIds: string[];
  members: Member[];
  events: CalendarEvent[];
  eventLayouts: Record<string, EventLayout>;
  selection: SelectionState | null;
  setSelection: (sel: SelectionState | null) => void;
  dragOverSlot: DragOverSlot | null;
  setDragOverSlot: (slot: DragOverSlot | null) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: string, isG: boolean, mId: string) => void;
  handleEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  weekScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleWeekScroll: () => void;
  resizingEvent: ResizingEventState | null;
  setResizingEvent: (evt: ResizingEventState | null) => void;
  weekStartDay: number;
  handleTouchEventDragStart?: (eventId: string, isGoogle: boolean, memberId: string, clientX: number, clientY: number, title: string, color: string) => void;
  selectionActive?: boolean;
  /** CalendarMain の useSelectionDrag から渡す修正済みmousedownハンドラ */
  handleSlotMouseDown?: (e: React.MouseEvent<HTMLDivElement>, dayIndex: number, colIndex: number, memberId?: string) => void;
}

export default function WeekView({
  days, hours, currentHourExact, accentColor, hourHeight, dayWidth,
  selectedMemberIds, members, events, eventLayouts,
  selection, setSelection, dragOverSlot, setDragOverSlot,
  handleDragOver, handleDrop, handleEventDragStart, handleEventClick,
  weekScrollContainerRef, handleWeekScroll,
  resizingEvent, setResizingEvent, weekStartDay,
  handleTouchEventDragStart, selectionActive = false,
  handleSlotMouseDown,
}: WeekViewProps) {

  // WeekView自身でスクロールコンテナの実測幅を計算
  const [selfMeasuredWidth, setSelfMeasuredWidth] = useState(0);
  useEffect(() => {
    const el = weekScrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setSelfMeasuredWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [weekScrollContainerRef]);

  const actualDayWidth = selfMeasuredWidth > TIME_AXIS_WIDTH_PX
    ? (selfMeasuredWidth - TIME_AXIS_WIDTH_PX) / 7
    : dayWidth;

  // ★ 週1単位スクロール制限（数ヶ月ジャンプを防止）
  useWeekHorizontalScroll(weekScrollContainerRef, actualDayWidth, !selectionActive);

  // ★ 縦横の軸ロック（長押し中は無効）
  useTouchAxisScroll(weekScrollContainerRef, !selectionActive);

  return (
    <div
      className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative"
      ref={weekScrollContainerRef}
      onScroll={handleWeekScroll}
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex flex-col min-w-max">

        {/* ヘッダーエリア */}
        <div
          className="flex border-b border-gray-200 sticky top-0 bg-white z-40 items-stretch"
          style={{ height: 72 }}
          role="row"
        >
          <div className="shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100" style={{ width: TIME_AXIS_WIDTH_PX }} />
          {days.map((day) => {
            const isSat = day.date.getDay() === 6;
            const isSun = day.date.getDay() === 0;
            const textColor = day.isToday ? "text-white" : isSat ? "text-blue-500" : isSun ? "text-red-500" : "text-gray-600";
            const allDayEvents = events.filter(
              (ev) => ev.dayIndex === day.dayIndex && ev.isAllDay && selectedMemberIds.includes(ev.memberId)
            );
            return (
              <div
                key={day.dayIndex}
                role="columnheader"
                aria-label={`${day.date.getFullYear()}年${day.date.getMonth() + 1}月${day.label}日`}
                className={`shrink-0 py-2 md:py-3 border-r border-gray-100 flex flex-col ${day.date.getDay() === weekStartDay ? "snap-start snap-always" : ""}`}
                style={{ width: actualDayWidth, ...(day.isToday ? { backgroundColor: accentColor + "10" } : {}) }}
              >
                <div
                  className={`w-8 h-8 md:w-auto md:h-auto mx-auto rounded-full flex flex-col items-center justify-center mb-1.5 shrink-0 ${day.isToday ? "shadow-sm" : ""}`}
                  style={day.isToday ? { backgroundColor: accentColor } : {}}
                >
                  <span
                    className={`text-[12px] md:text-sm font-bold md:font-medium md:px-3 md:py-1 md:rounded-full ${textColor}`}
                    style={day.isToday ? { color: "white" } : {}}
                  >
                    <span className="md:hidden">{day.label}</span>
                    <span className="hidden md:inline">{`${day.label} (${["日","月","火","水","木","金","土"][day.date.getDay()]})`}</span>
                  </span>
                </div>
                <div className="w-full flex flex-col gap-1 px-1 mt-auto">
                  {allDayEvents.map((ev, idx) => {
                    const member = members.find((m) => m.id === ev.memberId);
                    return (
                      <button
                        key={`${ev.id}-${idx}`}
                        onClick={(e) => handleEventClick(ev, e)}
                        aria-label={`終日: ${ev.title}`}
                        className="text-[10px] text-white rounded px-1.5 py-0.5 truncate hover:brightness-105 shadow-sm text-left font-bold w-full"
                        style={{ backgroundColor: ev.colorHex || member?.colorHex || accentColor }}
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間軸エリア */}
        <div className="flex-1 flex relative" role="grid">
          <div className="shrink-0 sticky left-0 bg-white z-30 border-r border-gray-100 flex flex-col" style={{ width: TIME_AXIS_WIDTH_PX }}>
            {hours.map((hour, i) => (
              <div key={i} className="text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-100" style={{ height: hourHeight }} aria-label={hour}>
                {hour}
              </div>
            ))}
          </div>

          {days.some((d) => d.isToday) && (
            <div
              className="absolute right-0 z-20 pointer-events-none flex items-center"
              style={{ left: TIME_AXIS_WIDTH_PX, top: `${currentHourExact * hourHeight}px` }}
              aria-hidden="true"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5" />
              <div className="h-[2px] bg-red-500 w-full shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            </div>
          )}

          {days.map((day, colIndex) => (
            <div
              key={day.dayIndex}
              data-day-index={day.dayIndex}
              role="gridcell"
              aria-label={`${day.label}日の時間グリッド`}
              className={`shrink-0 border-r border-gray-100 relative ${day.date.getDay() === weekStartDay ? "snap-start snap-always" : ""}`}
              style={{ width: actualDayWidth, ...(day.isToday ? { backgroundColor: accentColor + "05" } : {}) }}
            >
              {hours.map((_, i) => (
                <div
                  key={i}
                  className={`border-b border-gray-100 cursor-crosshair hover:bg-gray-50/50 ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? "ring-2 ring-inset z-20 shadow-inner" : ""}`}
                  style={{
                    height: hourHeight,
                    ...(dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i
                      ? { backgroundColor: accentColor + "20", borderColor: accentColor }
                      : {}),
                  }}
                  onMouseDown={(e) => {
                    if (handleSlotMouseDown) {
                      handleSlotMouseDown(e, day.dayIndex, colIndex);
                    }
                  }}
                  onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                />
              ))}

              {events
                .filter((ev) => ev.dayIndex === day.dayIndex && selectedMemberIds.includes(ev.memberId) && !ev.isAllDay)
                .map((event, idx) => {
                  const member = members.find((m) => m.id === event.memberId);
                  const layoutKey = `${event.id}-${event.memberId}`;
                  const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 };
                  const widthPct = 100 / layout.totalColumns;
                  const leftPct = layout.column * widthPct;
                  const isResizing = resizingEvent?.eventId === event.id;
                  const displayDuration = isResizing ? resizingEvent!.currentDuration : event.duration;
                  const eventColor = event.colorHex || member?.colorHex || accentColor;

                  return (
                    <div
                      key={`${event.id}-${idx}`}
                      data-no-axis-lock
                      draggable={!isResizing}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.transform = "scale(0.95)";
                        handleEventDragStart(e, event.id, event.isGoogle, event.memberId);
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1)";
                        setDragOverSlot(null);
                      }}
                      onClick={(e) => { if (!isResizing) handleEventClick(event, e); }}
                      onTouchStart={(e) => {
                        if (isResizing) return;
                        e.stopPropagation();
                        const touch = e.touches[0];
                        handleTouchEventDragStart?.(event.id, event.isGoogle, event.memberId, touch.clientX, touch.clientY, event.title, eventColor);
                      }}
                      role="button"
                      aria-label={`予定: ${event.title}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleEventClick(event, e as unknown as React.MouseEvent); }}
                      className={`calendar-event absolute rounded-md px-1.5 py-0.5 text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 z-10 border border-white/20 ${!isResizing && "cursor-grab active:cursor-grabbing"} flex flex-col items-start`}
                      style={{
                        top: `${event.startHour * hourHeight + 1}px`,
                        height: `${displayDuration * hourHeight - 2}px`,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        backgroundColor: eventColor,
                      }}
                    >
                      <div className="font-semibold text-[10px] md:text-[11px] leading-tight break-words whitespace-normal w-full overflow-hidden">
                        {event.title}
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-black/20 z-20 touch-none"
                        aria-label="リサイズ"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingEvent({ eventId: event.id, initialDuration: event.duration, startY: e.clientY, currentDuration: event.duration, memberId: event.memberId });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setResizingEvent({ eventId: event.id, initialDuration: event.duration, startY: e.touches[0].clientY, currentDuration: event.duration, memberId: event.memberId });
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          ))}

          {/* 選択枠 */}
          {selection && (
            <div
              className="absolute rounded-lg shadow-lg pointer-events-none z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
              aria-live="polite"
              aria-label={`新規予定: ${Math.round(Math.abs(selection.currentHour - selection.startHour) * 60)}分`}
              style={{
                backgroundColor: accentColor + "E6",
                left: `${TIME_AXIS_WIDTH_PX + selection.colIndex * actualDayWidth + 2}px`,
                width: `${actualDayWidth - 4}px`,
                top: `${Math.min(selection.startHour, selection.currentHour) * hourHeight}px`,
                height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * hourHeight}px`,
              }}
            >
              <div className="font-bold tracking-wide">新規予定</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
