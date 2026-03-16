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
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsRightPanelOpen: (isOpen: boolean) => void;
}

export default function CalendarMain({
  currentMonthYear, setCurrentMonthYear, currentViewDate, viewMode, setViewMode, scrollTrigger, days, hours, isLoadingData, events, selectedMemberIds, members,
  handleDragOver, handleDrop, handleRangeSelect,
  setIsScheduleModalOpen, handlePrevWeek, handleNextWeek, handleEventClick, handleEventDragStart, setIsSidebarOpen, setIsRightPanelOpen
}: CalendarMainProps) {
  
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number, startHour: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; colIndex: number; startHour: number; currentHour: number } | null>(null);

  // ★ 初期マウント時やビュー切り替え時にスクロール位置を調整
  useEffect(() => {
    if (viewMode === 'week' && scrollContainerRef.current) {
      const targetColIndex = days.findIndex(d => d.dayIndex === getDayIndex(new Date()));
      if (targetColIndex !== -1) {
        const targetScroll = Math.max(0, targetColIndex * 192 - 192);
        scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'auto' });
      }
    }
  }, [viewMode]);

  // ★ 週ビューの前へ・次へスクロール
  useEffect(() => {
    if (viewMode === 'week' && scrollTrigger && scrollContainerRef.current) {
      const amount = scrollTrigger.direction === 'next' ? 192 * 7 : -192 * 7;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }, [scrollTrigger, viewMode]);

  const handleScroll = () => {
    if (viewMode !== 'week' || !scrollContainerRef.current) return;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const visibleColIndex = Math.max(0, Math.floor(scrollLeft / 192));
    if (days[visibleColIndex]) {
      const d = days[visibleColIndex].date;
      setCurrentMonthYear(`${d.getFullYear()}年 ${d.getMonth() + 1}月`);
    }
  };

  const eventLayouts = useMemo(() => {
    const layouts: Record<string, { column: number, totalColumns: number }> = {};
    const visibleEvents = events.filter(e => selectedMemberIds.includes(e.memberId));

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
    return layouts;
  }, [events, selectedMemberIds, days]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (selection && gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const clampedY = Math.max(0, Math.min(y, rect.height));
        setSelection(prev => prev ? { ...prev, currentHour: clampedY / 64 } : null);
      }
    };
    const handleMouseUp = () => {
      if (selection) {
        const start = Math.min(selection.startHour, selection.currentHour);
        const end = Math.max(selection.startHour, selection.currentHour);
        let roundedDuration = Math.round((end - start) * 4) / 4;
        if (roundedDuration < 0.25) roundedDuration = 1;

        handleRangeSelect(selection.dayIndex, Math.round(start * 4) / 4, roundedDuration);
        setSelection(null);
      }
    };
    if (selection) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [selection, handleRangeSelect]);

  // ==============================
  // ▼ 1. 単日（デイリー）ビューの描画
  // ==============================
  const renderDayView = () => {
    const targetDayIndex = getDayIndex(currentViewDate);
    const targetDay = days.find(d => d.dayIndex === targetDayIndex) || days[0];

    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-white relative">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
          <div className="w-16 flex-shrink-0 border-r border-gray-100"></div>
          <div className="flex-1 py-3 text-center">
            <span className={`text-sm font-medium ${targetDay.isToday ? 'text-orange-600 bg-orange-100 px-3 py-1 rounded-full' : 'text-gray-600'}`}>{targetDay.label}</span>
          </div>
        </div>

        <div className="flex-1 relative" ref={gridRef}>
          {selection && selection.dayIndex === targetDayIndex && (
            <div className="absolute bg-blue-500/90 rounded-lg shadow-lg pointer-events-none border border-blue-400/50 z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                 style={{ left: `calc(4rem + 4px)`, width: `calc(100% - 4rem - 8px)`, top: `${Math.min(selection.startHour, selection.currentHour) * 64}px`, height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * 64}px` }}>
              <div className="font-bold tracking-wide">新規予定</div>
            </div>
          )}

          {hours.map((hour, hourIndex) => (
            <div key={hourIndex} className="flex h-16 border-b border-gray-100">
              <div className="w-16 flex-shrink-0 text-right pr-2 py-2 text-xs text-gray-400 border-r border-gray-100">{hour}</div>
              <div 
                className="flex-1 relative group cursor-crosshair hover:bg-gray-50/50"
                onMouseDown={(e) => {
                  if (!gridRef.current) return;
                  setSelection({ dayIndex: targetDayIndex, colIndex: 0, startHour: (e.clientY - gridRef.current.getBoundingClientRect().top) / 64, currentHour: (e.clientY - gridRef.current.getBoundingClientRect().top) / 64 });
                }}
                onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: targetDayIndex, startHour: hourIndex }); }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => { setDragOverSlot(null); handleDrop(e, targetDayIndex, hourIndex); }}
              >
                {events
                  .filter((event) => event.dayIndex === targetDayIndex && Math.floor(event.startHour) === hourIndex)
                  .filter((event) => selectedMemberIds.includes(event.memberId))
                  .map((event, idx) => {
                    const member = members.find((m) => m.id === event.memberId);
                    const layout = eventLayouts[`${event.id}-${event.memberId}`] || { column: 0, totalColumns: 1 };
                    return (
                      <div 
                        key={event.id} draggable={true} 
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                        onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                        onClick={(e) => handleEventClick(event, e)}
                        className="absolute rounded-lg px-2 py-1.5 text-xs text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 active:scale-95 cursor-grab active:cursor-grabbing z-10 hover:z-20 border border-white/20" 
                        style={{ top: `calc(${(event.startHour % 1) * 100}% + 2px)`, height: `calc(${event.duration * 100}% - 4px)`, left: `calc(${(layout.column * (100 / layout.totalColumns))}% + 2px)`, width: `calc(${100 / layout.totalColumns}% - 4px)`, backgroundColor: event.colorHex || member?.colorHex || "#f97316" }} 
                      >
                        <div className="font-semibold truncate">{event.title}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==============================
  // ▼ 2. 週（ウィークリー）ビューの描画
  // ==============================
  const renderWeekView = () => (
    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white relative" ref={scrollContainerRef} onScroll={handleScroll}>
      <div className="flex flex-col min-w-max">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-40">
          <div className="w-16 flex-shrink-0 sticky left-0 bg-white z-50 border-r border-gray-100"></div>
          {days.map((day) => (
            <div key={day.dayIndex} className={`w-48 flex-shrink-0 py-3 text-center border-r border-gray-100 ${day.isToday ? 'bg-orange-50/30' : ''}`}>
              <span className={`text-sm font-medium ${day.isToday ? 'text-orange-600 bg-orange-100 px-3 py-1 rounded-full' : 'text-gray-600'}`}>{day.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative" ref={gridRef}>
          {selection && (
            <div className="absolute bg-blue-500/90 rounded-lg shadow-lg pointer-events-none border border-blue-400/50 z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                 style={{ left: `calc(4rem + ${selection.colIndex * 192}px + 4px)`, width: `calc(192px - 8px)`, top: `${Math.min(selection.startHour, selection.currentHour) * 64}px`, height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * 64}px` }}>
              <div className="font-bold tracking-wide">新規予定</div>
            </div>
          )}

          {hours.map((hour, hourIndex) => (
            <div key={hourIndex} className="flex h-16 border-b border-gray-100">
              <div className="w-16 flex-shrink-0 sticky left-0 bg-white z-30 text-right pr-2 py-2 text-xs text-gray-400 border-r border-gray-100">{hour}</div>
              {days.map((day, colIndex) => (
                <div 
                  key={day.dayIndex} 
                  className={`w-48 flex-shrink-0 border-r border-gray-100 relative group transition-all duration-150 cursor-crosshair ${dragOverSlot?.dayIndex === day.dayIndex && dragOverSlot?.startHour === hourIndex ? 'bg-orange-100/60 ring-2 ring-orange-500 ring-inset z-20 shadow-inner' : 'hover:bg-gray-50/50'} ${day.isToday ? 'bg-orange-50/10' : ''}`}
                  onMouseDown={(e) => {
                    if (!gridRef.current) return;
                    const exactHour = (e.clientY - gridRef.current.getBoundingClientRect().top) / 64; 
                    setSelection({ dayIndex: day.dayIndex, colIndex, startHour: exactHour, currentHour: exactHour });
                  }}
                  onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex: day.dayIndex, startHour: hourIndex }); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => { setDragOverSlot(null); handleDrop(e, day.dayIndex, hourIndex); }}
                >
                  {events
                    .filter((event) => event.dayIndex === day.dayIndex && Math.floor(event.startHour) === hourIndex)
                    .filter((event) => selectedMemberIds.includes(event.memberId))
                    .map((event, idx) => {
                      const member = members.find((m) => m.id === event.memberId);
                      const layout = eventLayouts[`${event.id}-${event.memberId}`] || { column: 0, totalColumns: 1 };
                      return (
                        <div 
                          key={`${event.id}-${event.memberId}-${idx}`} draggable={true} 
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                          onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                          onClick={(e) => handleEventClick(event, e)}
                          className="absolute rounded-lg px-2 py-1.5 text-xs text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 active:scale-95 cursor-grab active:cursor-grabbing z-10 hover:z-20 border border-white/20" 
                          style={{ top: `calc(${(event.startHour % 1) * 100}% + 2px)`, height: `calc(${event.duration * 100}% - 4px)`, left: `calc(${(layout.column * (100 / layout.totalColumns))}% + 2px)`, width: `calc(${100 / layout.totalColumns}% - 4px)`, backgroundColor: event.colorHex || member?.colorHex || "#f97316" }} 
                        >
                          <div className="font-semibold truncate">{event.title}</div>
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

  // ==============================
  // ▼ 3. 月（マンスリー）ビューの描画
  // ==============================
  const renderMonthView = () => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // 日曜始まりのグリッドを計算

    const calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      calendarDays.push(d);
    }

    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0">
          {['日', '月', '火', '水', '木', '金', '土'].map(w => (
            <div key={w} className="py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 last:border-0">{w}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {calendarDays.map((d, i) => {
            const isCurrentMonth = d.getMonth() === month;
            const dayIdx = getDayIndex(d);
            const isToday = dayIdx === getDayIndex(new Date());
            const dayEvents = events.filter(e => e.dayIndex === dayIdx && selectedMemberIds.includes(e.memberId));

            return (
              <div 
                key={i} 
                className={`border-b border-r border-gray-100 p-1 flex flex-col cursor-pointer hover:bg-gray-50/80 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/30'}`}
                onClick={() => handleRangeSelect(dayIdx, 0, 1)} // 月ビューではクリックで朝9時の枠として作成
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, dayIdx, 0)}
              >
                <div className={`text-xs text-center mb-1 w-6 h-6 mx-auto rounded-full flex items-center justify-center ${isToday ? 'bg-orange-500 text-white font-bold shadow-sm' : isCurrentMonth ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {d.getDate()}
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {dayEvents.map((e, evIdx) => {
                    const member = members.find(m => m.id === e.memberId);
                    const bgColor = e.colorHex || member?.colorHex || "#f97316";
                    return (
                      <div 
                        key={evIdx} 
                        className="text-[10px] text-white px-1.5 py-0.5 rounded truncate shadow-sm hover:brightness-110 active:scale-95 transition-all"
                        style={{ backgroundColor: bgColor }}
                        onClick={(evt) => handleEventClick(e, evt)}
                      >
                        {/* 小数の時間を XX:XX に戻して表示 */}
                        {e.startHour ? `${Math.floor(e.startHour + 9)}:${Math.round((e.startHour % 1) * 60).toString().padStart(2, '0')} ` : ''}{e.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  // ★ ヘッダーの年月表示をビューに合わせて賢く切り替え
  const displayMonthYear = viewMode === 'week' ? currentMonthYear : `${currentViewDate.getFullYear()}年 ${currentViewDate.getMonth() + 1}月`;

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative w-full select-none">
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"><Menu className="w-5 h-5 text-gray-700" /></button>
          
          <button className="text-lg md:text-xl font-bold text-gray-800 w-32 text-left">{displayMonthYear}</button>
          
          <div className="flex items-center space-x-1 md:ml-2">
            <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
            <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>
          
          {/* ★ 新規追加：日・週・月の切り替えトグルボタン */}
          <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-md p-1 ml-4 shadow-inner">
            <button onClick={() => setViewMode('day')} className={`px-3 py-1 text-sm rounded shadow-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 shadow-none'}`}>日</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded shadow-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 shadow-none'}`}>週</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-sm rounded shadow-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 shadow-none'}`}>月</button>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:block relative"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" /><input type="text" placeholder="予定を検索..." className="pl-9 pr-4 py-2 w-48 lg:w-64 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" /></div>
          <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white border border-gray-200 text-gray-800 px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all shadow-sm flex items-center group"><LinkIcon className="w-4 h-4 md:mr-2 text-gray-400 group-hover:text-orange-500 transition-colors" /><span className="hidden md:inline">日程調整リンク</span></button>
          <button onClick={() => setIsRightPanelOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"><ListTodo className="w-5 h-5 text-gray-700" /></button>
        </div>
      </header>

      {/* ★ ビューモードに応じてレンダリングを完全に切り替え */}
      {viewMode === 'month' ? renderMonthView() : viewMode === 'day' ? renderDayView() : renderWeekView()}
      
    </main>
  );
}