import React from "react";
import { getDayIndex } from "@/app/page";

interface MonthViewProps {
  currentViewDate: Date; events: any[]; selectedMemberIds: string[]; members: any[];
  accentColor: string;
  handleRangeSelect: (dayIndex: number, startHour: number, duration: number) => void;
  handleDragOver: (e: React.DragEvent) => void; handleDrop: (e: React.DragEvent, d: number, h: number) => void;
  handleEventDragStart: (e: React.DragEvent, id: any, isG: boolean, mId: string) => void;
  handleEventClick: (ev: any, e: React.MouseEvent) => void;
  monthScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMonthScroll: () => void;
}

export default function MonthView({
  currentViewDate, events, selectedMemberIds, members, accentColor,
  handleRangeSelect, handleDragOver, handleDrop, handleEventDragStart, handleEventClick,
  monthScrollContainerRef, handleMonthScroll
}: MonthViewProps) {
  
  const monthsData = [-1, 0, 1].map(offset => {
    const targetMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + offset, 1);
    const year = targetMonth.getFullYear(); const month = targetMonth.getMonth();
    const startDate = new Date(year, month, 1); startDate.setDate(startDate.getDate() - startDate.getDay());
    const calendarDays = [];
    for (let i = 0; i < 42; i++) { const d = new Date(startDate); d.setDate(startDate.getDate() + i); calendarDays.push(d); }
    return { year, month, calendarDays, label: `${year}年 ${month + 1}月` };
  });

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory bg-gray-50" ref={monthScrollContainerRef} onScroll={handleMonthScroll} style={{ scrollbarWidth: 'none' }}>
      {monthsData.map((mData, mIdx) => (
        <div key={mIdx} className="min-w-full flex-shrink-0 snap-start flex flex-col h-full bg-white border-r border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-white shrink-0">
            {['日', '月', '火', '水', '木', '金', '土'].map(w => ( <div key={w} className="py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100 last:border-0">{w}</div> ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-gray-100">
            {mData.calendarDays.map((d, i) => {
              const isCurrentMonth = d.getMonth() === mData.month; const dayIdx = getDayIndex(d); const isToday = dayIdx === getDayIndex(new Date());
              const dayEvents = events.filter(e => e.dayIndex === dayIdx && selectedMemberIds.includes(e.memberId)); dayEvents.sort((a, b) => a.startHour - b.startHour);
              const maxVisible = 4; const visibleEvents = dayEvents.slice(0, maxVisible); const hiddenCount = dayEvents.length - maxVisible;

              return (
                <div key={i} className={`border-b border-r border-gray-100 p-1 flex flex-col relative hover:bg-gray-50 transition-colors group ${!isCurrentMonth && 'bg-gray-50/40'}`} onClick={() => handleRangeSelect(dayIdx, 0, 1)} onDragOver={(e) => handleDragOver(e)} onDrop={(e) => handleDrop(e, dayIdx, 0)}>
                  <div className={`text-[11px] w-6 h-6 mx-auto rounded-full flex items-center justify-center mb-1 ${isToday ? 'text-white font-bold' : isCurrentMonth ? 'text-gray-700 font-medium' : 'text-gray-300'}`} style={isToday ? { backgroundColor: accentColor } : {}}>
                    {d.getDate() === 1 ? `${d.getMonth() + 1}/${d.getDate()}` : d.getDate()}
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {visibleEvents.map((e, evIdx) => {
                      const member = members.find(m => m.id === e.memberId); const bgColor = e.colorHex || member?.colorHex || accentColor;
                      return (
                        <div key={evIdx} draggable={true} onDragStart={(evt) => { evt.currentTarget.style.opacity = '0.6'; handleEventDragStart(evt, e.id, e.isGoogle, e.memberId); }} onDragEnd={(evt) => { evt.currentTarget.style.opacity = '1'; }} className="text-[10px] px-1.5 py-0.5 rounded-[4px] truncate cursor-pointer hover:brightness-90 text-white font-medium shadow-sm transition-all" style={{ backgroundColor: bgColor }} onClick={(evt) => { evt.stopPropagation(); handleEventClick(e, evt); }}>
                          <span className="font-semibold mr-1">{e.startHour != null ? `${Math.floor(e.startHour).toString().padStart(2, '0')}:${Math.round((e.startHour % 1) * 60).toString().padStart(2, '0')}` : ''}</span>{e.title}
                        </div>
                      );
                    })}
                    {hiddenCount > 0 && ( <div className="text-[10px] font-bold text-gray-500 pl-1.5 py-0.5 hover:bg-gray-100 rounded cursor-pointer mt-0.5">他 {hiddenCount} 件</div> )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}