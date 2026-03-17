import React from "react";

interface DayViewProps {
  days: any[]; hours: string[]; currentHourExact: number;
  accentColor: string; hourHeight: number;
  selectedMemberIds: string[]; members: any[]; events: any[]; eventLayouts: any;
  selection: any; setSelection: (sel: any) => void;
  dragOverSlot: any; setDragOverSlot: (slot: any) => void;
  // ★ 修正：<HTMLDivElement> を追加
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void; 
  handleDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: any, isG: boolean, mId: string) => void;
  handleEventClick: (ev: any, e: React.MouseEvent) => void;
  dayScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleDayScroll: () => void;
  dayGridRefs: React.MutableRefObject<any>;
}

export default function DayView({
  days, hours, currentHourExact, accentColor, hourHeight, selectedMemberIds, members, events, eventLayouts,
  selection, setSelection, dragOverSlot, setDragOverSlot, handleDragOver, handleDrop, handleEventDragStart, handleEventClick,
  dayScrollContainerRef, handleDayScroll, dayGridRefs
}: DayViewProps) {
  const activeMembers = members.filter(m => selectedMemberIds.includes(m.id));

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto flex snap-x snap-mandatory bg-white relative" ref={dayScrollContainerRef} onScroll={handleDayScroll} style={{ scrollbarWidth: 'none' }}>
      {days.map((day) => (
        <div key={day.dayIndex} className="min-w-full flex-shrink-0 snap-start flex flex-col h-full bg-white relative">
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
            <div className="w-16 shrink-0 border-r border-gray-100 bg-white flex flex-col items-center justify-center py-2">
              <span className={`text-2xl font-light ${day.isToday ? 'font-bold' : 'text-gray-700'}`} style={day.isToday ? { color: accentColor } : {}}>{day.date.getDate()}</span>
              <span className={`text-xs ${day.isToday ? 'font-bold' : 'text-gray-500'}`} style={day.isToday ? { color: accentColor } : {}}>{["日","月","火","水","木","金","土"][day.date.getDay()]}</span>
            </div>
            <div className="flex-1 flex overflow-hidden">
              {activeMembers.map(member => (
                <div key={member.id} className="flex-1 min-w-[120px] py-2 border-r border-gray-100 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mb-1 shadow-sm" style={{ backgroundColor: member.colorHex }}>{member.initials}</div>
                  <span className="text-[11px] font-semibold text-gray-700 truncate px-2 w-full text-center">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 relative flex" ref={el => { dayGridRefs.current[day.dayIndex] = el; }}>
            <div className="w-16 shrink-0 border-r border-gray-100 bg-white z-20">
              {hours.map((hour, i) => ( <div key={i} className="text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-50" style={{ height: hourHeight }}>{hour}</div> ))}
            </div>
            <div className="flex-1 flex relative">
              {day.isToday && (
                <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${currentHourExact * hourHeight}px` }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5"></div><div className="h-[2px] bg-red-500 w-full shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
                </div>
              )}
              {selection && selection.dayIndex === day.dayIndex && selection.memberId && (
                <div className="absolute rounded-lg shadow-lg pointer-events-none z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none" style={{ backgroundColor: accentColor + 'E6', left: `${(activeMembers.findIndex(m => m.id === selection.memberId) / activeMembers.length) * 100}%`, width: `${100 / activeMembers.length}%`, top: `${Math.min(selection.startHour, selection.currentHour) * hourHeight}px`, height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * hourHeight}px` }}>
                   <div className="font-bold tracking-wide">新規予定</div>
                </div>
              )}
              {activeMembers.map((member) => (
                <div key={member.id} className="flex-1 min-w-[120px] border-r border-gray-50 relative group">
                  {hours.map((_, i) => (
                    <div key={i} className={`border-b border-gray-50 cursor-crosshair hover:bg-gray-50/30 transition-colors ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? 'ring-2 ring-inset z-20 shadow-inner' : ''}`} style={{ height: hourHeight, ...(dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? { backgroundColor: accentColor + '20', borderColor: accentColor } : {}) }}
                      onMouseDown={(e) => { const rect = dayGridRefs.current[day.dayIndex]?.getBoundingClientRect(); if (!rect) return; const exactHour = (e.clientY - rect.top) / hourHeight; setSelection({ dayIndex: day.dayIndex, memberId: member.id, startHour: exactHour, currentHour: exactHour, colIndex: 0 }); }}
                      onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }} onDragLeave={() => setDragOverSlot(null)} onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                    />
                  ))}
                  {events.filter(ev => ev.dayIndex === day.dayIndex && ev.memberId === member.id).map((event, idx) => {
                    const layoutKey = `${event.id}-${event.memberId}`; const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 }; const widthPct = 100 / layout.totalColumns; const leftPct = (layout.column * widthPct);
                    return (
                      <div key={`${event.id}-${idx}`} draggable={true} onMouseDown={(e) => e.stopPropagation()} onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }} onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }} onClick={(e) => handleEventClick(event, e)} className="absolute rounded-lg px-2 py-1 text-[11px] text-white shadow-sm overflow-hidden transition-all hover:brightness-105 active:scale-[0.98] z-10 border border-white/20 cursor-grab active:cursor-grabbing" style={{ top: `${event.startHour * hourHeight + 1}px`, height: `${event.duration * hourHeight - 2}px`, left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`, backgroundColor: event.colorHex || member.colorHex }}>
                        <div className="font-bold truncate">{event.title}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}