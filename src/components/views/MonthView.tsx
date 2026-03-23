import React from "react";
import { getDayIndex } from "@/hooks/useInitialScroll";

interface MonthViewProps {
  months: any[];
  events: any[]; selectedMemberIds: string[]; members: any[]; accentColor: string;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, d: number, h: number) => void;
  onEventDragStart: (e: React.DragEvent<HTMLDivElement>, id: any, isG: boolean, mId: string) => void;
  onEventClick: (ev: any, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  weekStartDay: number;
}

export default function MonthView({
  months, events, selectedMemberIds, members, accentColor,
  onDragOver, onDrop, onEventDragStart, onEventClick,
  scrollRef, weekStartDay
}: MonthViewProps) {
  
  const weekDays = weekStartDay === 1 ? ['月', '火', '水', '木', '金', '土', '日'] : ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory bg-gray-50 scroll-pl-0" ref={scrollRef} style={{ scrollbarWidth: 'none' }}>
      
      {months.map((mData) => {
        // 各月ごとの42マス（カレンダー枠）を計算
        const startDate = new Date(mData.year, mData.month, 1);
        let dayOffset = startDate.getDay() - weekStartDay;
        if (dayOffset < 0) dayOffset += 7;
        startDate.setDate(startDate.getDate() - dayOffset);

        const calendarDays = [];
        for (let i = 0; i < 42; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          calendarDays.push(d);
        }

        return (
          <div key={`${mData.year}-${mData.month}`} className="min-w-full flex-shrink-0 snap-start snap-always flex flex-col h-full bg-white border-r border-gray-200">
            
            <div className="grid grid-cols-7 border-b border-gray-200 bg-white shrink-0">
              {weekDays.map(w => ( <div key={w} className={`py-2 text-center text-[10px] font-bold uppercase tracking-widest border-r border-gray-100 last:border-0 ${w === '土' ? 'text-blue-500' : w === '日' ? 'text-red-500' : 'text-gray-500'}`}>{w}</div> ))}
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-gray-100 min-h-0">
              {calendarDays.map((d, i) => {
                const isCurrentMonth = d.getMonth() === mData.month; 
                const dayIdx = getDayIndex(d); 
                const isToday = dayIdx === getDayIndex(new Date());
                
                const dayEvents = events.filter(e => e.dayIndex === dayIdx && selectedMemberIds.includes(e.memberId)); 
                dayEvents.sort((a, b) => a.startHour - b.startHour);
                const maxVisible = 2; 
                const visibleEvents = dayEvents.slice(0, maxVisible); 
                const hiddenCount = dayEvents.length - maxVisible;

                const isSat = d.getDay() === 6; const isSun = d.getDay() === 0;
                const textColor = isToday ? 'text-white' : isSat ? 'text-blue-500' : isSun ? 'text-red-500' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300';

                return (
                  <div key={i} className={`border-b border-r border-gray-100 p-1 flex flex-col relative hover:bg-gray-50 transition-colors group ${!isCurrentMonth && 'bg-gray-50/40'} min-h-0 overflow-hidden`} onDragOver={(e) => onDragOver(e)} onDrop={(e) => onDrop(e, dayIdx, 0)}>
                    <div className={`text-[11px] w-6 h-6 mx-auto rounded-full flex items-center justify-center mb-1 font-medium shrink-0 ${textColor} ${isToday ? 'font-bold shadow-sm' : ''}`} style={isToday ? { backgroundColor: accentColor } : {}}>
                      {d.getDate() === 1 ? `${d.getMonth() + 1}/${d.getDate()}` : d.getDate()}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                      {visibleEvents.map((e, evIdx) => {
                        const member = members.find(m => m.id === e.memberId); const bgColor = e.colorHex || member?.colorHex || accentColor;
                        return (
                          <div key={evIdx} draggable={true} onDragStart={(evt) => { evt.currentTarget.style.opacity = '0.6'; onEventDragStart(evt, e.id, e.isGoogle, e.memberId); }} onDragEnd={(evt) => { evt.currentTarget.style.opacity = '1'; }} className="shrink-0 flex items-center text-xs px-1.5 rounded truncate cursor-pointer hover:brightness-90 text-white font-medium shadow-sm transition-all h-[22px]" style={{ backgroundColor: bgColor }} onClick={(evt) => { evt.stopPropagation(); onEventClick(e, evt); }}>
                            <span className="font-semibold mr-1 text-[10px] opacity-90">{e.startHour != null ? `${Math.floor(e.startHour).toString().padStart(2, '0')}:${Math.round((e.startHour % 1) * 60).toString().padStart(2, '0')}` : ''}</span><span className="truncate leading-none">{e.title}</span>
                          </div>
                        );
                      })}
                      {hiddenCount > 0 && ( <div className="text-[10px] font-bold text-gray-500 pl-1.5 py-0.5 hover:bg-gray-100 rounded cursor-pointer mt-0.5 shrink-0">他 {hiddenCount} 件</div> )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}