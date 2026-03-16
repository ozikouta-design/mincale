"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Link as LinkIcon, ChevronLeft, ChevronRight, Menu, ListTodo } from "lucide-react";

interface CalendarMainProps {
  currentMonthYear: string;
  days: string[];
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
  currentMonthYear, days, hours, isLoadingData, events, selectedMemberIds, members,
  handleDragOver, handleDrop, handleRangeSelect,
  setIsScheduleModalOpen, handlePrevWeek, handleNextWeek, handleEventClick, handleEventDragStart, setIsSidebarOpen, setIsRightPanelOpen
}: CalendarMainProps) {
  
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number, startHour: number } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ dayIndex: number; startHour: number; currentHour: number } | null>(null);

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
        const duration = end - start;
        
        const roundedStart = Math.round(start * 4) / 4;
        let roundedDuration = Math.round(duration * 4) / 4;
        
        if (roundedDuration < 0.25) {
          roundedDuration = 1;
        }

        handleRangeSelect(selection.dayIndex, roundedStart, roundedDuration);
        setSelection(null);
      }
    };

    if (selection) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selection, handleRangeSelect]);

  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative w-full select-none">
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"><Menu className="w-5 h-5 text-gray-700" /></button>
          <button className="text-lg md:text-xl font-bold text-gray-800">{currentMonthYear}</button>
          <div className="flex items-center space-x-1 md:ml-2">
            <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
            <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-md p-1 ml-4"><button className="px-3 py-1 text-sm bg-white rounded shadow-sm font-medium">週</button><button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-medium">月</button></div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:block relative"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" /><input type="text" placeholder="予定を検索..." className="pl-9 pr-4 py-2 w-48 lg:w-64 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" /></div>
          <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white border border-gray-200 text-gray-800 px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all shadow-sm flex items-center group"><LinkIcon className="w-4 h-4 md:mr-2 text-gray-400 group-hover:text-orange-500 transition-colors" /><span className="hidden md:inline">日程調整リンク</span></button>
          <button onClick={() => setIsRightPanelOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"><ListTodo className="w-5 h-5 text-gray-700" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col bg-white">
        <div className="min-w-[700px] flex-1 flex flex-col">
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
            <div className="w-16 flex-shrink-0"></div>
            {days.map((day, index) => <div key={index} className="flex-1 py-3 text-center border-l border-gray-200"><span className="text-sm font-medium text-gray-600">{day}</span></div>)}
          </div>

          <div className="flex-1 relative" ref={gridRef}>
            {isLoadingData && <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>}
            
            {selection && (
              <div 
                className="absolute bg-blue-500/90 rounded-lg shadow-lg pointer-events-none border border-blue-400/50 z-30 px-3 py-2 text-xs text-white overflow-hidden transition-none"
                style={{
                  left: `calc(4rem + ${selection.dayIndex} * (100% - 4rem) / 5 + 4px)`,
                  width: `calc((100% - 4rem) / 5 - 8px)`,
                  top: `${Math.min(selection.startHour, selection.currentHour) * 64}px`,
                  height: `${Math.max(0.15, Math.abs(selection.currentHour - selection.startHour)) * 64}px`,
                }}
              >
                <div className="font-bold tracking-wide">新規予定</div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {(() => {
                    const totalMinutes = Math.round(Math.min(selection.startHour, selection.currentHour) * 60) + 9 * 60;
                    const h = Math.floor(totalMinutes / 60);
                    const m = totalMinutes % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  })()} から作成
                </div>
              </div>
            )}

            {hours.map((hour, hourIndex) => (
              <div key={hourIndex} className="flex border-b border-gray-100 h-16">
                <div className="w-16 flex-shrink-0 text-right pr-2 py-2 text-xs text-gray-400">{hour}</div>
                
                {days.map((_, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className={`flex-1 border-l border-gray-100 relative group transition-all duration-150 cursor-crosshair
                      ${dragOverSlot?.dayIndex === dayIndex && dragOverSlot?.startHour === hourIndex ? 'bg-orange-100/60 ring-2 ring-orange-500 ring-inset z-20 shadow-inner' : 'hover:bg-gray-50/50'}`}
                    
                    onMouseDown={(e) => {
                      if (!gridRef.current) return;
                      const rect = gridRef.current.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const exactHour = y / 64; 
                      setSelection({ dayIndex, startHour: exactHour, currentHour: exactHour });
                    }}
                    
                    onDragOver={(e) => { handleDragOver(e); setDragOverSlot({ dayIndex, startHour: hourIndex }); }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => { setDragOverSlot(null); handleDrop(e, dayIndex, hourIndex); }}
                  >
                    {events
                      // ★ 修正：小数（15分刻み）の予定も、対応する1時間の枠内に正しく描画させるためのフィルタ
                      .filter((event) => event.dayIndex === dayIndex && Math.floor(event.startHour) === hourIndex)
                      .filter((event) => selectedMemberIds.includes(event.memberId))
                      .map((event, idx) => {
                        const member = members.find((m) => m.id === event.memberId);
                        
                        // ★ 修正：小数の時間（10:15など）に合わせて、上からの距離(top)を正確にピクセル計算する
                        const topPct = (event.startHour % 1) * 100;
                        const heightPct = event.duration * 100;
                        const bgColor = event.colorHex || member?.colorHex || "#f97316"; 
                        
                        return (
                          <div 
                            key={`${event.id}-${event.memberId}-${idx}`} 
                            draggable={true} 
                            onMouseDown={(e) => e.stopPropagation()}
                            onDragStart={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)'; handleEventDragStart(e, event.id, event.isGoogle, event.memberId); }}
                            onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; setDragOverSlot(null); }}
                            onClick={(e) => handleEventClick(event, e)}
                            className="absolute w-[92%] left-[4%] rounded-lg px-2 py-1.5 text-xs text-white shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 active:scale-95 cursor-grab active:cursor-grabbing z-10 hover:z-20 border border-white/20" 
                            style={{ top: `calc(${topPct}% + 2px)`, height: `calc(${heightPct}% - 4px)`, backgroundColor: bgColor }} 
                            title="ドラッグで移動、クリックで詳細を表示"
                          >
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80"></span>{member?.name || "カレンダー"}
                            </div>
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
    </main>
  );
}