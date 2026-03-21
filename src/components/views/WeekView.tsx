import React from "react";
import { 
  TIME_AXIS_WIDTH_PX, 
  CALENDAR_HEADER_HEIGHT 
} from "@/constants/calendar";
import { useTouchAxisScroll } from "@/hooks/useTouchAxisScroll";

interface WeekViewProps {
  days: any[]; hours: string[]; currentHourExact: number; accentColor: string; hourHeight: number; dayWidth: number;
  selectedMemberIds: string[]; members: any[]; events: any[]; eventLayouts: any;
  selection: any; setSelection: (sel: any) => void; dragOverSlot: any; setDragOverSlot: (slot: any) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void; handleDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: any, isG: boolean, mId: string) => void; handleEventClick: (ev: any, e: React.MouseEvent) => void;
  weekScrollContainerRef: React.RefObject<HTMLDivElement | null>; handleWeekScroll: () => void;
  resizingEvent: any; setResizingEvent: (evt: any) => void; weekStartDay: number;
  handleTouchEventDragStart?: (eventId: any, isGoogle: boolean, memberId: string, clientX: number, clientY: number, title: string, color: string) => void;
}

export default function WeekView({
  days, hours, currentHourExact, accentColor, hourHeight, dayWidth,
  selectedMemberIds, members, events, eventLayouts,
  selection, setSelection, dragOverSlot, setDragOverSlot, handleDragOver, handleDrop, handleEventDragStart, handleEventClick,
  weekScrollContainerRef, handleWeekScroll, resizingEvent, setResizingEvent, weekStartDay,
  handleTouchEventDragStart,
}: WeekViewProps) {

  // ★iPhone対応: 上下なら上下、左右なら左右に軸をロック
  useTouchAxisScroll(weekScrollContainerRef);

  return (
    <div 
      className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative snap-x snap-mandatory scroll-pl-16" 
      ref={weekScrollContainerRef} 
      onScroll={handleWeekScroll} 
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="flex flex-col min-w-max">
        
        {/* ヘッダーエリア */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40 items-stretch" style={{ height: CALENDAR_HEADER_HEIGHT }}>
          <div 
            className="shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100" 
            style={{ width: TIME_AXIS_WIDTH_PX }}
          ></div>
          
          {days.map((day) => {
            const isSat = day.date.getDay() === 6; const isSun = day.date.getDay() === 0;
            const textColor = day.isToday ? 'text-white' : isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-600';
            const allDayEvents = events.filter(ev => ev.dayIndex === day.dayIndex && ev.isAllDay && selectedMemberIds.includes(ev.memberId));

            return (
              <div key={day.dayIndex} className={`shrink-0 py-2 md:py-3 border-r border-gray-100 flex flex-col ${day.date.getDay() === weekStartDay ? 'snap-start snap-always' : ''}`} style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + '10' } : {}) }}>
                <div className={`w-8 h-8 md:w-auto md:h-auto mx-auto rounded-full flex flex-col items-center justify-center mb-1.5 shrink-0 ${day.isToday ? 'shadow-sm' : ''}`} style={day.isToday ? { backgroundColor: accentColor } : {}}>
                  <span className={`text-[12px] md:text-sm font-bold md:font-medium md:px-3 md:py-1 md:rounded-full ${textColor}`} style={day.isToday ? { color: 'white' } : {}}>
                    <span className="md:hidden">{day.label}</span>
                    <span className="hidden md:inline">{`${day.label} (${["日","月","火","水","木","金","土"][day.date.getDay()]})`}</span>
                  </span>
                </div>
                
                <div className="w-full flex flex-col gap-1 px-1 mt-auto">
                  {allDayEvents.map((ev, idx) => {
                    const member = members.find(m => m.id === ev.memberId);
                    return (
                      <div key={`${ev.id}-${idx}`} onClick={(e) => handleEventClick(ev, e)} className="text-[10px] text-white rounded px-1.5 py-0.5 truncate cursor-pointer hover:brightness-105 shadow-sm text-left font-bold" style={{backgroundColor: ev.colorHex || member?.colorHex || accentColor}} title={ev.title}>
                        {ev.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間軸エリア */}
        <div className="flex-1 flex relative">
          <div 
            className="shrink-0 sticky left-0 bg-white z-30 border-r border-gray-100 flex flex-col"
            style={{ width: TIME_AXIS_WIDTH_PX }}
          >
            {hours.map((hour, i) => ( <div key={i} className="text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-100" style={{ height: hourHeight }}>{hour}</div> ))}
          </div>
          {days.some(d => d.isToday) && (
            <div className="absolute right-0 z-20 pointer-events-none flex items-center" style={{ left: TIME_AXIS_WIDTH_PX, top: `${currentHourExact * hourHeight}px` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5"></div><div className="h-[2px] bg-red-500 w-full shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
            </div>
          )}
          {days.map((day, colIndex) => (
            <div key={day.dayIndex} className={`shrink-0 border-r border-gray-100 relative ${day.date.getDay() === weekStartDay ? 'snap-start snap-always' : ''}`} style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + '05' } : {}) }}>
              {hours.map((_, i) => (
                <div key={i} className={`border-b border-gray-100 cursor-crosshair hover:bg-gray-50/50 ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? 'ring-2 ring-inset z-20 shadow-inner' : ''}`} style={{ height: hourHeight, ...(dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? { backgroundColor: accentColor + '20', borderColor: accentColor } : {}) }}
                  onMouseDown={(e) => { 
                    const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    const exactHour = (e.clientY - rect.top + e.currentTarget.parentElement!.parentElement!.scrollTop - CALENDAR_HEADER_HEIGHT) / hourHeight;
                    setSelection({ dayIndex: day.dayIndex, colIndex, startHour: exactHour, currentHour: exactHour }); 
                  }}
                  onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }} onDragLeave={() => setDragOverSlot(null)} onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                />
              ))}

              {events.filter(ev => ev.dayIndex === day.dayIndex && selectedMemberIds.includes(ev.memberId) && !ev.isAllDay).map((event, idx) => {
                const member = members.find(m => m.id === event.memberId); const layoutKey = `${event.id}-${event.memberId}`; const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 }; const widthPct = 100 / layout.totalColumns; const leftPct = (layout.column * widthPct);
                const isResizing = resizingEvent?.eventId === event.id; const displayDuration = isResizing ? resizingEvent.currentDuration : event.duration;
                const eventColor = event.colorHex || member?.colorHex || accentColor;
                
                return (
                  <div key={`${event.id}-${idx}`}
                    data-no-axis-lock
                    draggable={!isResizing}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                    onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                    onClick={(e) => { if (!isResizing) handleEventClick(event, e); }}
                    onTouchStart={(e) => {
                      if (isResizing) return;
                      e.stopPropagation();
                      const touch = e.touches[0];
                      handleTouchEventDragStart?.(event.id, event.isGoogle, event.memberId, touch.clientX, touch.clientY, event.title, eventColor);
                    }}
                    className={`calendar-event absolute rounded-md px-1.5 py-0.5 text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 z-10 border border-white/20 ${!isResizing && 'cursor-grab active:cursor-grabbing'} flex flex-col items-start`} 
                    style={{ top: `${event.startHour * hourHeight + 1}px`, height: `${displayDuration * hourHeight - 2}px`, left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`, backgroundColor: eventColor }}>
                    
                    <div className="font-semibold text-[10px] md:text-[11px] leading-tight break-words whitespace-normal w-full overflow-hidden">{event.title}</div>
                    
                    <div
                      className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-black/20 z-20 touch-none"
                      onMouseDown={(e) => { e.stopPropagation(); setResizingEvent({ eventId: event.id, initialDuration: event.duration, startY: e.clientY, currentDuration: event.duration, memberId: event.memberId }); }}
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
          {selection && (
            <div className="absolute rounded-lg shadow-lg pointer-events-none z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none" style={{ backgroundColor: accentColor + 'E6', left: `calc(${TIME_AXIS_WIDTH_PX}px + ${(selection.colIndex / 7) * 100}% + 2px)`, width: `calc(${100 / 7}% - 4px)`, top: `${Math.min(selection.startHour, selection.currentHour) * hourHeight}px`, height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * hourHeight}px` }}>
              <div className="font-bold tracking-wide">新規予定</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}