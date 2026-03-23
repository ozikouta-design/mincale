import React, { useState } from "react";
import { useTouchAxisScroll } from "@/hooks/useTouchAxisScroll";
import type {
  CalendarEvent, Member, DayData, SelectionState,
  ResizingState, EventLayout
} from "@/types";

interface DayViewProps {
  days: DayData[];
  hours: string[];
  currentHourExact: number;
  accentColor: string;
  hourHeight: number;
  selectedMemberIds: string[];
  members: Member[];
  events: CalendarEvent[];
  eventLayouts: Record<string, EventLayout>;
  selection: SelectionState | null;
  setSelection: (sel: SelectionState | null) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  onEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: string, isG: boolean, mId: string) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  resizing: ResizingState | null;
  setResizing: (evt: ResizingState | null) => void;
  onResizeCommit: (eventId: string, memberId: string, dur: number) => void;
  singleDayWidth: number;
  onSlotMouseDown?: (dayIndex: number, colIndex: number, hour: number) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onRangeSelect?: (dayIndex: number, startHour: number, duration: number) => void;
}

export default function DayView({
  days, hours, currentHourExact, accentColor, hourHeight, selectedMemberIds, members,
  events, eventLayouts, selection, setSelection,
  onDragOver, onDrop, onEventDragStart, onEventClick,
  scrollRef, resizing, setResizing, onResizeCommit, singleDayWidth,
  onSlotMouseDown, onMouseMove, onMouseUp,
}: DayViewProps) {

  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; startHour: number } | null>(null);
  const selectionActive = !!selection;

  useTouchAxisScroll(scrollRef, !selectionActive);

  const activeMembers = selectedMemberIds.length > 0
    ? members.filter((m) => selectedMemberIds.includes(m.id))
    : [{ id: "all", name: "マイカレンダー", colorHex: accentColor, initials: "マ", primary: true }];

  return (
    <div
      className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative snap-x snap-mandatory scroll-pl-16"
      ref={scrollRef}
      style={{ scrollbarWidth: "none" }}
      role="grid"
    >
      <div className="flex flex-col min-w-max">

        {/* ヘッダーエリア */}
        <div
          className="flex sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm min-w-max"
          style={{ height: 72 }}
          role="row"
        >
          <div
            className="shrink-0 sticky left-0 z-50 bg-white border-r border-gray-100 flex flex-col items-center justify-center py-2"
            style={{ width: 64 }}
          />
          {days.map((day) => {
            const isSat = day.date.getDay() === 6;
            const isSun = day.date.getDay() === 0;
            const textColor = day.isToday ? "text-white" : isSat ? "text-blue-500" : isSun ? "text-red-500" : "text-gray-700";
            return (
              <div
                key={day.dayIndex}
                role="columnheader"
                aria-label={`${day.date.getFullYear()}年${day.date.getMonth() + 1}月${day.label}日`}
                className="shrink-0 snap-start snap-always border-r border-gray-200 flex flex-col"
                style={{ width: singleDayWidth, ...(day.isToday ? { backgroundColor: accentColor + "05" } : {}) }}
              >
                <div className="flex items-center justify-center border-b border-gray-50 h-10 shrink-0 bg-gray-50/30">
                  <div
                    className={`flex items-center justify-center px-3 py-0.5 rounded-full ${day.isToday ? "shadow-sm" : ""}`}
                    style={day.isToday ? { backgroundColor: accentColor } : {}}
                  >
                    <span className={`text-xs font-bold ${textColor}`} style={day.isToday ? { color: "white" } : {}}>
                      {day.label} ({["日","月","火","水","木","金","土"][day.date.getDay()]})
                    </span>
                  </div>
                </div>
                <div className="flex flex-1">
                  {activeMembers.map((member) => {
                    const allDayEvents = events.filter(
                      (ev) => ev.dayIndex === day.dayIndex && ev.memberId === member.id && ev.isAllDay
                    );
                    return (
                      <div
                        key={member.id}
                        className="flex-1 min-w-0 py-1.5 border-r border-gray-100 flex flex-col items-center justify-start last:border-r-0 px-1 gap-1"
                      >
                        <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full mr-1 shrink-0 shadow-sm" style={{ backgroundColor: member.colorHex || accentColor }} />
                          <span className="truncate">{member.name}</span>
                        </span>
                        <div className="w-full flex flex-col gap-1">
                          {allDayEvents.map((ev, idx) => (
                            <button
                              key={`${ev.id}-${idx}`}
                              onClick={(e) => onEventClick(ev, e)}
                              aria-label={`終日: ${ev.title}`}
                              className="text-[10px] text-white rounded px-1.5 py-0.5 truncate hover:brightness-105 shadow-sm text-left font-bold w-full"
                              style={{ backgroundColor: ev.colorHex || member.colorHex || accentColor }}
                              title={ev.title}
                            >
                              {ev.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間軸エリア */}
        <div className="flex-1 flex relative min-w-max">
          <div className="shrink-0 sticky left-0 z-30 bg-white border-r border-gray-100 flex flex-col" style={{ width: 64 }}>
            {hours.map((hour, i) => (
              <div key={i} className="text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-50" style={{ height: hourHeight }} aria-label={hour}>
                {hour}
              </div>
            ))}
          </div>

          {days.map((day, dayIdx) => (
            <div
              key={day.dayIndex}
              data-day-index={day.dayIndex}
              role="gridcell"
              className="shrink-0 snap-start snap-always border-r border-gray-200 relative flex"
              style={{ width: singleDayWidth, ...(day.isToday ? { backgroundColor: accentColor + "02" } : {}) }}
            >
              {day.isToday && (
                <div
                  className="absolute right-0 z-20 pointer-events-none flex items-center"
                  style={{ left: 0, top: `${currentHourExact * hourHeight}px` }}
                  aria-hidden="true"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5" />
                  <div className="h-[2px] bg-red-500 w-full shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                </div>
              )}

              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  data-member-id={member.id}
                  className="flex-1 min-w-0 border-r border-gray-50 relative group last:border-r-0"
                >
                  {hours.map((_, i) => (
                    <div
                      key={i}
                      className={`border-b border-gray-50 cursor-crosshair hover:bg-gray-50/50 ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? "ring-2 ring-inset z-20 shadow-inner" : ""}`}
                      style={{
                        height: hourHeight,
                        ...(dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i
                          ? { backgroundColor: accentColor + "20", borderColor: accentColor }
                          : {}),
                      }}
                      onMouseDown={() => {
                        if (onSlotMouseDown) {
                          onSlotMouseDown(day.dayIndex, dayIdx, i);
                        }
                      }}
                      onDragOver={(e) => { onDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={(e) => { setDragOverSlot(null); onDrop(e, day.dayIndex, i); }}
                    />
                  ))}

                  {selection && selection.dayIndex === day.dayIndex && selection.memberId === member.id && (
                    <div
                      className="absolute rounded-lg shadow-lg pointer-events-none z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                      aria-live="polite"
                      style={{
                        backgroundColor: accentColor + "E6",
                        left: "2px", right: "4px",
                        top: `${Math.min(selection.startHour, selection.endHour) * hourHeight}px`,
                        height: `${Math.max(0.15, Math.abs(selection.endHour - selection.startHour)) * hourHeight}px`,
                      }}
                    >
                      <div className="font-bold tracking-wide">新規予定</div>
                    </div>
                  )}

                  {events
                    .filter((ev) => ev.dayIndex === day.dayIndex && ev.memberId === member.id && !ev.isAllDay)
                    .map((event, idx) => {
                      const layoutKey = `${event.id}-${event.memberId}`;
                      const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 };
                      const widthPct = 100 / layout.totalColumns;
                      const leftPct = layout.column * widthPct;
                      const isResizing = resizing?.eventId === event.id;
                      const displayDuration = isResizing ? resizing!.currentDuration : event.duration;
                      const eventColor = event.colorHex || member.colorHex || accentColor;

                      return (
                        <div
                          key={`${event.id}-${idx}`}
                          data-no-axis-lock
                          draggable={!isResizing}
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => {
                            e.currentTarget.style.opacity = "0.6";
                            e.currentTarget.style.transform = "scale(0.95)";
                            onEventDragStart(e, event.id, event.isGoogle, event.memberId);
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = "1";
                            e.currentTarget.style.transform = "scale(1)";
                            setDragOverSlot(null);
                          }}
                          onClick={(e) => { if (!isResizing) onEventClick(event, e); }}
                          role="button"
                          aria-label={`予定: ${event.title}`}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEventClick(event, e as unknown as React.MouseEvent); }}
                          className={`calendar-event absolute rounded-md px-1.5 py-0.5 text-white shadow-sm overflow-hidden transition-all hover:brightness-105 active:scale-[0.98] z-10 border border-white/20 ${!isResizing && "cursor-grab active:cursor-grabbing"} flex flex-col items-start`}
                          style={{
                            top: `${event.startHour * hourHeight + 1}px`,
                            height: `${displayDuration * hourHeight - 2}px`,
                            left: `calc(${leftPct}% + 1px)`,
                            width: `calc(${widthPct}% - 2px)`,
                            backgroundColor: eventColor,
                          }}
                        >
                          <div className="font-bold text-[10px] md:text-[11px] leading-tight break-words whitespace-normal w-full overflow-hidden">
                            {event.title}
                          </div>
                          <div
                            className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-black/20 z-20 touch-none"
                            aria-label="リサイズ"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizing({ eventId: event.id, initialDuration: event.duration, startY: e.clientY, currentDuration: event.duration, memberId: event.memberId });
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizing({ eventId: event.id, initialDuration: event.duration, startY: e.touches[0].clientY, currentDuration: event.duration, memberId: event.memberId });
                            }}
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
