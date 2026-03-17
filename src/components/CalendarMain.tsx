"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Link as LinkIcon, ChevronLeft, ChevronRight, Menu, ListTodo } from "lucide-react";
import { getDayIndex } from "@/app/page";

interface CalendarMainProps {
  currentMonthYear: string;
  setCurrentMonthYear: (month: string) => void;
  currentViewDate: Date;
  viewMode: "day" | "week" | "month";
  setViewMode: (mode: "day" | "week" | "month") => void;
  scrollTrigger: any;
  days: any[];
  hours: string[];
  isLoadingData: boolean;
  events: any[];
  selectedMemberIds: string[];
  members: any[];
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => void;
  handleRangeSelect: (dayIndex: number, startHour: number, duration: number) => void;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleEventClick: (event: any, e: React.MouseEvent) => void; 
  handleEventDragStart: (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleToday: () => void;
}

export default function CalendarMain({
  currentMonthYear, setCurrentMonthYear, currentViewDate, viewMode, setViewMode, scrollTrigger, days, hours, isLoadingData, events, selectedMemberIds, members,
  handleDragOver, handleDrop, handleRangeSelect,
  setIsScheduleModalOpen, handlePrevWeek, handleNextWeek, handleEventClick, handleEventDragStart, setIsSidebarOpen, setIsRightPanelOpen, handleToday
}: CalendarMainProps) {
  
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number, startHour: number } | null>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; memberId?: string; startHour: number; currentHour: number } | null>(null);

  const weekScrollContainerRef = useRef<HTMLDivElement>(null);
  const weekGridRef = useRef<HTMLDivElement>(null);
  
  const dayScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayGridRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const monthScrollContainerRef = useRef<HTMLDivElement>(null);

  const eventLayouts = useMemo(() => {
    const layouts: Record<string, { column: number, totalColumns: number }> = {};
    const visibleEvents = events.filter(e => selectedMemberIds.includes(e.memberId));

    if (viewMode === 'day') {
      days.forEach(day => {
        selectedMemberIds.forEach(memberId => {
          const colEvents = visibleEvents.filter(e => e.dayIndex === day.dayIndex && e.memberId === memberId);
          colEvents.sort((a, b) => a.startHour - b.startHour || (b.startHour + b.duration) - (a.startHour + a.duration));
          
          let clusters: any[][] = [];
          let currentCluster: any[] = [];
          let clusterEnd = 0;

          colEvents.forEach(ev => {
            if (currentCluster.length === 0) {
              currentCluster.push(ev); clusterEnd = ev.startHour + ev.duration;
            } else if (ev.startHour < clusterEnd) {
              currentCluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.startHour + ev.duration);
            } else {
              clusters.push(currentCluster); currentCluster = [ev]; clusterEnd = ev.startHour + ev.duration;
            }
          });
          if (currentCluster.length > 0) clusters.push(currentCluster);

          clusters.forEach(cluster => {
            let columns: any[][] = [];
            cluster.forEach(ev => {
              let placed = false;
              for (let i = 0; i < columns.length; i++) {
                let lastEv = columns[i][columns[i].length - 1];
                if (lastEv.startHour + lastEv.duration <= ev.startHour + 0.001) {
                  columns[i].push(ev); layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 }; placed = true; break;
                }
              }
              if (!placed) { columns.push([ev]); layouts[`${ev.id}-${ev.memberId}`] = { column: columns.length - 1, totalColumns: 0 }; }
            });
            const totalCols = columns.length;
            cluster.forEach(ev => { layouts[`${ev.id}-${ev.memberId}`].totalColumns = totalCols; });
          });
        });
      });
    } else {
      days.forEach(day => {
        const dayEvents = visibleEvents.filter(e => e.dayIndex === day.dayIndex);
        dayEvents.sort((a, b) => a.startHour - b.startHour || (b.startHour + b.duration) - (a.startHour + a.duration));

        let clusters: any[][] = [];
        let currentCluster: any[] = [];
        let clusterEnd = 0;

        dayEvents.forEach(ev => {
          if (currentCluster.length === 0) {
            currentCluster.push(ev); clusterEnd = ev.startHour + ev.duration;
          } else if (ev.startHour < clusterEnd) {
            currentCluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.startHour + ev.duration);
          } else {
            clusters.push(currentCluster); currentCluster = [ev]; clusterEnd = ev.startHour + ev.duration;
          }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);

        clusters.forEach(cluster => {
          let columns: any[][] = [];
          cluster.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
              let lastEv = columns[i][columns[i].length - 1];
              if (lastEv.startHour + lastEv.duration <= ev.startHour + 0.001) {
                columns[i].push(ev); layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 }; placed = true; break;
              }
            }
            if (!placed) { columns.push([ev]); layouts[`${ev.id}-${ev.memberId}`] = { column: columns.length - 1, totalColumns: 0 }; }
          });
          const totalCols = columns.length;
          cluster.forEach(ev => { layouts[`${ev.id}-${ev.memberId}`].totalColumns = totalCols; });
        });
      });
    }
    return layouts;
  }, [events, selectedMemberIds, days, viewMode]);

  useEffect(() => {
    if (viewMode === 'week' && weekScrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(currentViewDate));
      if (targetColIndex !== -1) {
        weekScrollContainerRef.current.scrollTo({ left: Math.max(0, targetColIndex * 192 - 192), behavior: 'auto' });
      }
    }
  }, [viewMode, currentViewDate, days]);

  useEffect(() => {
    if (viewMode === 'week' && scrollTrigger && weekScrollContainerRef.current) {
      if (scrollTrigger.direction === 'today') {
        const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(new Date()));
        if (targetColIndex !== -1) weekScrollContainerRef.current.scrollTo({ left: Math.max(0, targetColIndex * 192 - 192), behavior: 'smooth' });
      } else {
        const amount = scrollTrigger.direction === 'next' ? 192 * 7 : -192 * 7;
        weekScrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      }
    }
  }, [scrollTrigger, viewMode, days]);

  const handleWeekScroll = () => {
    if (viewMode !== 'week' || !weekScrollContainerRef.current) return;
    const scrollLeft = weekScrollContainerRef.current.scrollLeft;
    const visibleColIndex = Math.max(0, Math.floor(scrollLeft / 192));
    if (days[visibleColIndex]) {
      const d = days[visibleColIndex].date;
      setCurrentMonthYear(`${d.getFullYear()}年 ${d.getMonth() + 1}月`);
    }
  };

  useEffect(() => {
    if (viewMode === 'day' && dayScrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(currentViewDate));
      if (targetColIndex !== -1) {
        dayScrollContainerRef.current.scrollLeft = targetColIndex * dayScrollContainerRef.current.clientWidth;
      }
    }
  }, [viewMode, currentViewDate, days]);

  const handleDayScroll = () => {
    if (viewMode !== 'day' || !dayScrollContainerRef.current) return;
    const width = dayScrollContainerRef.current.clientWidth;
    if (width === 0) return;
    const scrollLeft = dayScrollContainerRef.current.scrollLeft;
    const visibleColIndex = Math.round(scrollLeft / width);
    if (days[visibleColIndex]) {
      const d = days[visibleColIndex].date;
      setCurrentMonthYear(`${d.getFullYear()}年 ${d.getMonth() + 1}月`);
    }
  };

  useEffect(() => {
    if (viewMode === 'month' && scrollTrigger && monthScrollContainerRef.current) {
      if (scrollTrigger.direction === 'today') {
        monthScrollContainerRef.current.scrollTo({ left: monthScrollContainerRef.current.clientWidth, behavior: 'smooth' });
      }
    }
  }, [scrollTrigger, viewMode]);

  const handleMonthScroll = () => {
    if (viewMode !== 'month' || !monthScrollContainerRef.current) return;
    const el = monthScrollContainerRef.current;
    const width = el.clientWidth;
    if (width === 0) return;

    if (el.scrollLeft === 0) {
      handlePrevWeek(); 
    } else if (el.scrollLeft >= width * 2 - 10) {
      handleNextWeek(); 
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (selection) {
        let gridEl = null;
        if (viewMode === 'day') gridEl = dayGridRefs.current[selection.dayIndex];
        else if (viewMode === 'week') gridEl = weekGridRef.current;

        if (gridEl) {
          const rect = gridEl.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const clampedY = Math.max(0, Math.min(y, rect.height));
          setSelection(prev => prev ? { ...prev, currentHour: clampedY / 64 } : null);
        }
      }
    };
    const handleMouseUp = () => {
      if (selection) {
        const start = Math.min(selection.startHour, selection.currentHour);
        const end = Math.max(selection.startHour, selection.currentHour);
        let duration = Math.round((end - start) * 4) / 4;
        if (duration < 0.25) duration = 1;
        handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, duration);
        setSelection(null);
      }
    };
    if (selection) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [selection, handleRangeSelect, viewMode]);

  const renderDayView = () => {
    const activeMembers = members.filter(m => selectedMemberIds.includes(m.id));

    return (
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory bg-white relative"
        ref={dayScrollContainerRef}
        onScroll={handleDayScroll}
        style={{ scrollbarWidth: 'none' }}
      >
        {days.map((day) => (
          <div key={day.dayIndex} className="min-w-full flex-shrink-0 snap-start flex flex-col h-full bg-white">
            
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
              <div className="w-16 shrink-0 border-r border-gray-100 bg-white flex flex-col items-center justify-center py-2">
                <span className={`text-2xl font-light ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day.date.getDate()}</span>
                <span className={`text-xs ${day.isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>{["日","月","火","水","木","金","土"][day.date.getDay()]}</span>
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

            {/* ★ 変更：ref に渡すアロー関数を波括弧で囲み、void を返すように修正 */}
            <div className="flex-1 overflow-y-auto relative flex" ref={el => { dayGridRefs.current[day.dayIndex] = el; }}>
              <div className="w-16 shrink-0 border-r border-gray-100 bg-white z-20">
                {hours.map((hour, i) => <div key={i} className="h-16 text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-50">{hour}</div>)}
              </div>

              <div className="flex-1 flex relative">
                {selection && selection.dayIndex === day.dayIndex && selection.memberId && (
                  <div 
                    className="absolute bg-blue-500/90 rounded-lg shadow-lg pointer-events-none border border-blue-400/50 z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                    style={{
                      left: `${(activeMembers.findIndex(m => m.id === selection.memberId) / activeMembers.length) * 100}%`,
                      width: `${100 / activeMembers.length}%`,
                      top: `${Math.min(selection.startHour, selection.currentHour) * 64}px`,
                      height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * 64}px`,
                    }}
                  >
                     <div className="font-bold tracking-wide">新規予定</div>
                     <div className="text-[10px] opacity-90 mt-0.5">
                       {(() => {
                         const totalMinutes = Math.round(Math.min(selection.startHour, selection.currentHour) * 60);
                         const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60;
                         return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                       })()} から作成
                     </div>
                  </div>
                )}

                {activeMembers.map((member) => (
                  <div key={member.id} className="flex-1 min-w-[120px] border-r border-gray-50 relative group">
                    {hours.map((_, i) => (
                      <div 
                        key={i} className={`h-16 border-b border-gray-50 cursor-crosshair hover:bg-gray-50/30 transition-colors ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? 'bg-blue-100/60 ring-2 ring-blue-500 ring-inset z-20 shadow-inner' : ''}`}
                        onMouseDown={(e) => {
                          const rect = dayGridRefs.current[day.dayIndex]?.getBoundingClientRect();
                          if (!rect) return;
                          const exactHour = (e.clientY - rect.top) / 64;
                          setSelection({ dayIndex: day.dayIndex, memberId: member.id, startHour: exactHour, currentHour: exactHour, colIndex: 0 });
                        }}
                        onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                      />
                    ))}
                    
                    {events
                      .filter(ev => ev.dayIndex === day.dayIndex && ev.memberId === member.id)
                      .map((event, idx) => {
                        const layoutKey = `${event.id}-${event.memberId}`;
                        const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 };
                        const widthPct = 100 / layout.totalColumns;
                        const leftPct = (layout.column * widthPct);

                        return (
                          <div 
                            key={`${event.id}-${idx}`}
                            draggable={true} 
                            onMouseDown={(e) => e.stopPropagation()} 
                            onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                            onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                            onClick={(e) => handleEventClick(event, e)}
                            className="absolute rounded-lg px-2 py-1 text-[11px] text-white shadow-sm overflow-hidden transition-all hover:brightness-105 active:scale-[0.98] z-10 border border-white/20 cursor-grab active:cursor-grabbing"
                            style={{ 
                              top: `${event.startHour * 64 + 1}px`, 
                              height: `${event.duration * 64 - 2}px`, 
                              left: `calc(${leftPct}% + 1px)`,
                              width: `calc(${widthPct}% - 2px)`,
                              backgroundColor: event.colorHex || member.colorHex 
                            }}
                          >
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
  };

  const renderWeekView = () => (
    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative" ref={weekScrollContainerRef} onScroll={handleWeekScroll}>
      <div className="flex flex-col min-w-max">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
          <div className="w-16 shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100"></div>
          {days.map((day) => (
            <div key={day.dayIndex} className={`w-48 shrink-0 py-3 text-center border-r border-gray-100 ${day.isToday ? 'bg-blue-50/30' : ''}`}>
              <span className={`text-sm font-medium ${day.isToday ? 'text-blue-600 bg-blue-100 px-3 py-1 rounded-full' : 'text-gray-600'}`}>{day.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative" ref={weekGridRef}>
          <div className="w-16 shrink-0 sticky left-0 bg-white z-30 border-r border-gray-100 flex flex-col">
            {hours.map((hour, i) => (
              <div key={i} className="h-16 text-right pr-2 py-2 text-[10px] text-gray-400 border-b border-gray-100">{hour}</div>
            ))}
          </div>

          {days.map((day, colIndex) => (
            <div key={day.dayIndex} className={`w-48 shrink-0 border-r border-gray-100 relative ${day.isToday ? 'bg-blue-50/10' : ''}`}>
              {hours.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-16 border-b border-gray-100 cursor-crosshair hover:bg-gray-50/50 ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === i ? 'bg-blue-100/60 ring-2 ring-blue-500 ring-inset z-20 shadow-inner' : ''}`}
                  onMouseDown={(e) => {
                    if (!weekGridRef.current) return;
                    const rect = weekGridRef.current.getBoundingClientRect();
                    const exactHour = (e.clientY - rect.top) / 64; 
                    setSelection({ dayIndex: day.dayIndex, colIndex, startHour: exactHour, currentHour: exactHour });
                  }}
                  onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: i }); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, i); }}
                />
              ))}

              {events
                .filter(ev => ev.dayIndex === day.dayIndex && selectedMemberIds.includes(ev.memberId))
                .map((event, idx) => {
                  const member = members.find(m => m.id === event.memberId);
                  const layoutKey = `${event.id}-${event.memberId}`;
                  const layout = eventLayouts[layoutKey] || { column: 0, totalColumns: 1 };
                  const widthPct = 100 / layout.totalColumns;
                  const leftPct = (layout.column * widthPct);

                  return (
                    <div 
                      key={`${event.id}-${idx}`}
                      draggable={true} 
                      onMouseDown={(e) => e.stopPropagation()} 
                      onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                      onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                      onClick={(e) => handleEventClick(event, e)}
                      className="absolute rounded-lg px-2 py-1.5 text-[11px] text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 active:scale-[0.98] z-10 border border-white/20 cursor-grab active:cursor-grabbing"
                      style={{ 
                        top: `${event.startHour * 64 + 1}px`, 
                        height: `${event.duration * 64 - 2}px`, 
                        left: `calc(${leftPct}% + 1px)`, 
                        width: `calc(${widthPct}% - 2px)`,
                        backgroundColor: event.colorHex || member?.colorHex || "#f97316" 
                      }} 
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="text-[9px] opacity-90 truncate mt-0.5 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80"></span>{member?.name || "カレンダー"}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}

          {selection && viewMode === 'week' && (
            <div className="absolute bg-blue-500/90 rounded-lg shadow-lg pointer-events-none border border-blue-400/50 z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                 style={{ 
                   left: `calc(4rem + ${selection.colIndex * 192}px + 2px)`, 
                   width: `calc(192px - 4px)`, 
                   top: `${Math.min(selection.startHour, selection.currentHour) * 64}px`, 
                   height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * 64}px` 
                 }}>
              <div className="font-bold tracking-wide">新規予定</div>
              <div className="text-[10px] opacity-90 mt-0.5">
                {(() => {
                  const totalMinutes = Math.round(Math.min(selection.startHour, selection.currentHour) * 60);
                  const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60;
                  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                })()} から作成
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMonthView = () => {
    const baseDate = currentViewDate;
    const monthsData = [-1, 0, 1].map(offset => {
      const targetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const startDate = new Date(year, month, 1);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      const calendarDays = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        calendarDays.push(d);
      }
      return { year, month, calendarDays, label: `${year}年 ${month + 1}月` };
    });

    return (
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory bg-gray-50" 
        ref={monthScrollContainerRef} 
        onScroll={handleMonthScroll} 
        style={{ scrollbarWidth: 'none' }}
      >
        {monthsData.map((mData, mIdx) => (
          <div key={mIdx} className="min-w-full flex-shrink-0 snap-start flex flex-col h-full bg-white border-r border-gray-200">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-white shrink-0">
              {['日', '月', '火', '水', '木', '金', '土'].map(w => (
                <div key={w} className="py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100 last:border-0">{w}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-gray-100">
              {mData.calendarDays.map((d, i) => {
                const isCurrentMonth = d.getMonth() === mData.month;
                const dayIdx = getDayIndex(d);
                const isToday = dayIdx === getDayIndex(new Date());
                const dayEvents = events.filter(e => e.dayIndex === dayIdx && selectedMemberIds.includes(e.memberId));
                
                dayEvents.sort((a, b) => a.startHour - b.startHour);
                
                const maxVisible = 4;
                const visibleEvents = dayEvents.slice(0, maxVisible);
                const hiddenCount = dayEvents.length - maxVisible;

                return (
                  <div 
                    key={i} 
                    className={`border-b border-r border-gray-100 p-1 flex flex-col relative hover:bg-gray-50 transition-colors group ${!isCurrentMonth && 'bg-gray-50/40'}`}
                    onClick={() => handleRangeSelect(dayIdx, 0, 1)}
                    onDragOver={(e) => handleDragOver(e)} 
                    onDrop={(e) => handleDrop(e, dayIdx, 0)}
                  >
                    <div className={`text-[11px] w-6 h-6 mx-auto rounded-full flex items-center justify-center mb-1 ${isToday ? 'bg-blue-600 text-white font-bold' : isCurrentMonth ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                      {d.getDate() === 1 ? `${d.getMonth() + 1}/${d.getDate()}` : d.getDate()}
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                      {visibleEvents.map((e, evIdx) => {
                        const member = members.find(m => m.id === e.memberId);
                        const bgColor = e.colorHex || member?.colorHex || "#f97316";
                        return (
                          <div 
                            key={evIdx} 
                            draggable={true} 
                            onDragStart={(evt) => { evt.currentTarget.style.opacity = '0.6'; handleEventDragStart(evt, e.id, e.isGoogle, e.memberId); }}
                            onDragEnd={(evt) => { evt.currentTarget.style.opacity = '1'; }}
                            className="text-[10px] px-1.5 py-0.5 rounded-[4px] truncate cursor-pointer hover:brightness-90 text-white font-medium shadow-sm transition-all"
                            style={{ backgroundColor: bgColor }}
                            onClick={(evt) => { evt.stopPropagation(); handleEventClick(e, evt); }}
                          >
                            <span className="font-semibold mr-1">
                              {e.startHour != null ? `${Math.floor(e.startHour).toString().padStart(2, '0')}:${Math.round((e.startHour % 1) * 60).toString().padStart(2, '0')}` : ''}
                            </span>
                            {e.title}
                          </div>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <div className="text-[10px] font-bold text-gray-500 pl-1.5 py-0.5 hover:bg-gray-100 rounded cursor-pointer mt-0.5">
                          他 {hiddenCount} 件
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const displayMonthYear = `${currentViewDate.getFullYear()}年 ${currentViewDate.getMonth() + 1}月`;

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative w-full select-none bg-white">
      <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        <div className="flex items-center space-x-4 md:space-x-6">
          <button onClick={() => setIsSidebarOpen(prev => !prev)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Menu className="w-5 h-5 text-gray-700" /></button>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-800 tracking-tight min-w-[130px]">{displayMonthYear}</h1>
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={handleNextWeek} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button onClick={handleToday} className="px-3 py-1.5 text-sm font-bold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-all shadow-sm bg-white ml-2">
              今日
            </button>
          </div>

          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
            {["day", "week", "month"].map((mode) => (
              <button 
                key={mode} onClick={() => setViewMode(mode as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden lg:block relative group">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500" />
            <input type="text" placeholder="予定、メンバーを検索" className="pl-9 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
          </div>
          <button onClick={() => setIsScheduleModalOpen(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center">
            <LinkIcon className="w-3.5 h-3.5 mr-2" />
            日程調整
          </button>
          <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-2 hover:bg-gray-100 rounded-lg"><ListTodo className="w-5 h-5 text-gray-700" /></button>
        </div>
      </header>

      {viewMode === 'month' ? renderMonthView() : viewMode === 'day' ? renderDayView() : renderWeekView()}
      
    </main>
  );
}