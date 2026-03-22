"use client";
import React, { memo, useRef, useEffect, useState } from "react";
import { TIME_AXIS_W, DAY_HEADER_H } from "@/constants/calendar";
import { useWeekTouch } from "@/hooks/useWeekTouch";
import { useResizeDrag } from "@/hooks/useResizeDrag";
import type {
  CalendarEvent, Member, DayData, SelectionState,
  ResizingState, EventLayout
} from "@/types";

interface Props {
  days: DayData[];
  hours: string[];
  currentHourExact: number;
  accentColor: string;
  hourHeight: number;
  weekStartDay: number;
  selectedMemberIds: string[];
  members: Member[];
  events: CalendarEvent[];
  eventLayouts: Record<string, EventLayout>;
  selection: SelectionState | null;
  onSelectionStart: (s: SelectionState) => void;
  onSelectionUpdate: (endHour: number) => void;
  onSelectionCommit: () => void;
  onSelectionCancel: () => void;
  resizing: ResizingState | null;
  setResizing: (s: ResizingState | null) => void;
  onResizeCommit: (eventId: string, memberId: string, dur: number) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  onEventDragStart: (e: React.DragEvent, id: string, isGoogle: boolean, memberId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, dayIndex: number, hour: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  // PC mousedown for new event creation
  onSlotMouseDown: (dayIndex: number, colIndex: number, hour: number) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

const WeekView = memo(function WeekView(props: Props) {
  const {
    days, hours, currentHourExact, accentColor, hourHeight, weekStartDay,
    selectedMemberIds, members, events, eventLayouts,
    selection, onSelectionStart, onSelectionUpdate, onSelectionCommit, onSelectionCancel,
    resizing, setResizing, onResizeCommit,
    onEventClick, onEventDragStart, onDragOver, onDrop,
    scrollRef, onScroll,
    onSlotMouseDown, onMouseMove, onMouseUp,
  } = props;

  // Measure the scroll container's clientWidth for an accurate dayWidth
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerW(el.clientWidth));
    obs.observe(el);
    setContainerW(el.clientWidth);
    return () => obs.disconnect();
  }, [scrollRef]);

  const dayWidth = containerW > TIME_AXIS_W ? (containerW - TIME_AXIS_W) / 7 : 48;

  // ── Touch (the ONE place for all week-view touch logic) ──────
  useWeekTouch({
    scrollRef,
    days,
    dayWidth,
    hourHeight,
    selectionActive: !!selection,
    onSelectionStart,
    onSelectionUpdate,
    onSelectionCommit,
    onSelectionCancel,
  });

  // ── Resize (separate, no conflict) ──────────────────────────
  useResizeDrag({
    resizing,
    setResizing,
    hourHeight,
    onCommit: onResizeCommit,
  });

  if (dayWidth <= 0) return null;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-x-hidden overflow-y-auto bg-white select-none"
      style={{ scrollbarWidth: "none" }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div style={{ minWidth: TIME_AXIS_W + dayWidth * days.length, position: "relative" }}>

        {/* ── Sticky day header ───────────────────────────── */}
        <div
          className="flex sticky top-0 bg-white z-40 border-b border-gray-200"
          style={{ height: DAY_HEADER_H }}
        >
          <div className="shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100"
            style={{ width: TIME_AXIS_W }} />
          {days.map((day) => {
            const dow = day.date.getDay();
            const isSat = dow === 6;
            const isSun = dow === 0;
            const isStart = dow === weekStartDay;
            const allDay = events.filter(
              (e) => e.dayIndex === day.dayIndex && e.isAllDay && selectedMemberIds.includes(e.memberId)
            );
            return (
              <div
                key={day.dayIndex}
                className={`shrink-0 flex flex-col items-center justify-center border-r border-gray-100 py-1 ${isStart ? "border-l-2 border-l-blue-100" : ""}`}
                style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + "12" } : {}) }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={day.isToday ? { backgroundColor: accentColor, color: "#fff" } : {
                    color: isSat ? "#3b82f6" : isSun ? "#ef4444" : "#374151",
                  }}
                >
                  {day.label}
                </div>
                {allDay.slice(0, 2).map((ev, i) => (
                  <div
                    key={i}
                    onClick={(e) => onEventClick(ev, e)}
                    className="w-full mx-1 mt-0.5 px-1 text-[9px] font-bold text-white rounded truncate cursor-pointer"
                    style={{ backgroundColor: ev.colorHex ?? members.find(m => m.id === ev.memberId)?.colorHex ?? accentColor }}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* ── Time grid ───────────────────────────────────── */}
        <div className="flex relative">

          {/* Time axis */}
          <div className="shrink-0 sticky left-0 bg-white z-30 border-r border-gray-100" style={{ width: TIME_AXIS_W }}>
            {hours.map((h, i) => (
              <div key={i} className="text-right pr-2 text-[10px] text-gray-400 border-b border-gray-100 flex items-start justify-end pt-0.5"
                style={{ height: hourHeight }}>
                {h}
              </div>
            ))}
          </div>

          {/* Current time indicator */}
          {days.some((d) => d.isToday) && (
            <div
              className="absolute pointer-events-none z-20 flex items-center"
              style={{ left: TIME_AXIS_W, right: 0, top: currentHourExact * hourHeight }}
              aria-hidden
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          )}

          {/* Day columns */}
          {days.map((day, colIndex) => {
            const dow = day.date.getDay();
            const isStart = dow === weekStartDay;
            const colEvents = events.filter(
              (e) => e.dayIndex === day.dayIndex && !e.isAllDay && selectedMemberIds.includes(e.memberId)
            );

            return (
              <div
                key={day.dayIndex}
                data-day-index={day.dayIndex}
                className={`shrink-0 relative border-r border-gray-100 ${isStart ? "border-l-2 border-l-blue-100" : ""}`}
                style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + "06" } : {}) }}
              >
                {/* Hour slots */}
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-gray-100 cursor-crosshair hover:bg-blue-50/30"
                    style={{ height: hourHeight }}
                    onMouseDown={() => onSlotMouseDown(day.dayIndex, colIndex, i)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, day.dayIndex, i)}
                  />
                ))}

                {/* Events */}
                {colEvents.map((ev) => {
                  const layout = eventLayouts[`${ev.id}-${ev.memberId}`] ?? { column: 0, totalColumns: 1 };
                  const isR = resizing?.eventId === ev.id;
                  const dur = isR ? resizing!.currentDuration : ev.duration;
                  const member = members.find((m) => m.id === ev.memberId);
                  const color = ev.colorHex ?? member?.colorHex ?? accentColor;
                  const wPct = 100 / layout.totalColumns;
                  const lPct = layout.column * wPct;

                  return (
                    <div
                      key={ev.id}
                      className="cal-event absolute rounded text-white text-[10px] font-semibold px-1 py-0.5 overflow-hidden cursor-pointer border border-white/20 hover:brightness-105 active:brightness-90"
                      style={{
                        top: ev.startHour * hourHeight + 1,
                        height: Math.max(hourHeight * 0.25, dur * hourHeight - 2),
                        left: `calc(${lPct}% + 1px)`,
                        width: `calc(${wPct}% - 2px)`,
                        backgroundColor: color,
                        zIndex: isR ? 20 : 10,
                      }}
                      onClick={(e) => onEventClick(ev, e)}
                      draggable
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.currentTarget.style.opacity = "0.5";
                        onEventDragStart(e, ev.id, ev.isGoogle, ev.memberId);
                      }}
                      onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
                      aria-label={ev.title}
                    >
                      <div className="leading-tight break-words">{ev.title}</div>
                      {/* Resize handle */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizing({ eventId: ev.id, memberId: ev.memberId, initialDuration: ev.duration, startY: e.clientY, currentDuration: ev.duration });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setResizing({ eventId: ev.id, memberId: ev.memberId, initialDuration: ev.duration, startY: e.touches[0].clientY, currentDuration: ev.duration });
                        }}
                      />
                    </div>
                  );
                })}

                {/* New-event selection rect */}
                {selection && selection.dayIndex === day.dayIndex && (
                  <div
                    className="absolute pointer-events-none rounded border-2 border-white z-30 px-1 py-0.5 text-white text-[10px] font-bold"
                    style={{
                      backgroundColor: accentColor + "CC",
                      left: 2,
                      right: 2,
                      top: Math.min(selection.startHour, selection.endHour) * hourHeight,
                      height: Math.max(hourHeight * 0.25, Math.abs(selection.endHour - selection.startHour) * hourHeight),
                    }}
                    aria-live="polite"
                  >
                    新規予定
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WeekView;
