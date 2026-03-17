import React from "react";

interface WeekViewProps {
  days: any[]; hours: string[]; currentHourExact: number;
  accentColor: string; hourHeight: number; dayWidth: number; // ★ 追加
  selectedMemberIds: string[]; members: any[]; events: any[]; eventLayouts: any;
  selection: any; setSelection: (sel: any) => void;
  dragOverSlot: any; setDragOverSlot: (slot: any) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void; handleDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: any, isG: boolean, mId: string) => void;
  handleEventClick: (ev: any, e: React.MouseEvent) => void;
  weekScrollContainerRef: React.RefObject<HTMLDivElement | null>; handleWeekScroll: () => void; weekGridRef: React.RefObject<HTMLDivElement | null>;
  resizingEvent: any; setResizingEvent: (evt: any) => void; weekStartDay: number;
}

export default function WeekView({
  days, hours, currentHourExact, accentColor, hourHeight, dayWidth,
  selectedMemberIds, members, events, eventLayouts,
  selection, setSelection, dragOverSlot, setDragOverSlot, handleDragOver, handleDrop, handleEventDragStart, handleEventClick,
  weekScrollContainerRef, handleWeekScroll, weekGridRef, resizingEvent, setResizingEvent, weekStartDay
}: WeekViewProps) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative snap-x snap-mandatory scroll-pl-16" ref={weekScrollContainerRef} onScroll={handleWeekScroll} style={{ scrollbarWidth: 'none' }}>
      <div className="flex flex-col min-w-max">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
          <div className="w-16 shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100"></div>
          {days.map((day) => {
            const isSat = day.date.getDay() === 6; const isSun = day.date.getDay() === 0;
            const textColor = day.isToday ? 'text-white' : isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-600';
            return (
              // ★ 修正：動的計算された dayWidth を適用
              <div key={day.dayIndex} className={`shrink-0 py-3 text-center border-r border-gray-100 ${day.date.getDay() === weekStartDay ? 'snap-start' : ''}`} style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + '10' } : {}) }}>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${textColor}`} style={day.isToday ? { backgroundColor: accentColor } : {}}>{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 flex relative" ref={weekGridRef}>
          <div className="w-16 shrink-0 sticky left-0 bg-white z-30 border-r border-gray-100 flex flex-col">
            {hours.map((hour, i) => ( <div key={i} className="text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-100" style={{ height: hourHeight }}>{hour}</div> ))}
          </div>
          {days.some(d => d.isToday) && (
            <div className="absolute left-16 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${currentHourExact * hourHeight}px` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5"></div><div className="h-[2px] bg-red-500 w-full shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
            </div>
          )}
          {days.map((day, colIndex) => (
            // ★ 修正：動的計算された dayWidth を適用
            <div key={day.dayIndex} className={`shrink-0 border-r border-gray-100 relative ${day.date.getDay() === weekStartDay ? 'snap-start' : ''}`} style={{ width: dayWidth, ...(day.isToday ? { backgroundColor: accentColor + '05' } : {}) }}>
              {hours.map((_, i) => (
                <div key={i} className={`border-b border-gray-100 cursor-crosshair hover:bg-gray-50/50 ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? 'ring-2 ring-inset z-20 shadow-inner' : ''}`} style={{ height: hourHeight, ...(dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? { backgroundColor: accentColor + '20', borderColor: accentColor } : {}) }}
                  onMouseDown={(e) => { if (!weekGridRef.current) return; const rect = weekGridRef.current.getBoundingClientRect(); const exactHour = (e.clientY - rect.top) / hourHeight; setSelection({ dayIndex: day.dayIndex, colIndex, startHour: exactHour, currentHour: exactHour }); }}
                  onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }} onDragLeave={() => setDragOverSlot(null)} onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                />
              ))}
              {events.filter(ev => ev.dayIndex === day.dayIndex && selectedMemberIds.includes(ev.memberId)).map((event, idx) => {
                const member = members.find(m => m.id === event.memberId); const layoutKey = `${event.id}-${event.memberId}`; const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 }; const widthPct = 100 / layout.totalColumns; const leftPct = (layout.column * widthPct);
                const isResizing = resizingEvent?.eventId === event.id;
                const displayDuration = isResizing ? resizingEvent.currentDuration : event.duration;

                return (
                  <div key={`${event.id}-${idx}`} draggable={!isResizing} onMouseDown={(e) => e.stopPropagation()} onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }} onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }} onClick={(e) => { if (!isResizing) handleEventClick(event, e); }} 
                    className={`absolute rounded-lg px-2 py-1.5 text-[11px] text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 z-10 border border-white/20 ${!isResizing && 'cursor-grab active:cursor-grabbing'}`} 
                    style={{ top: `${event.startHour * hourHeight + 1}px`, height: `${displayDuration * hourHeight - 2}px`, left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`, backgroundColor: event.colorHex || member?.colorHex || accentColor }}>
                    <div className="font-semibold truncate">{event.title}</div><div className="text-[9px] opacity-90 truncate mt-0.5 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80"></span>{member?.name || "カレンダー"}</div>
                    <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/20 z-20" onMouseDown={(e) => { e.stopPropagation(); setResizingEvent({ eventId: event.id, initialDuration: event.duration, startY: e.clientY, currentDuration: event.duration, memberId: event.memberId }); }} />
                  </div>
                );
              })}
            </div>
          ))}
          {selection && (
            // ★ 修正：新規選択時の幅と位置も dayWidth を基準に計算
            <div className="absolute rounded-lg shadow-lg pointer-events-none z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none" style={{ backgroundColor: accentColor + 'E6', left: `calc(4rem + ${selection.colIndex * dayWidth}px + 2px)`, width: `calc(${dayWidth}px - 4px)`, top: `${Math.min(selection.startHour, selection.currentHour) * hourHeight}px`, height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * hourHeight}px` }}>
              <div className="font-bold tracking-wide">新規予定</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}