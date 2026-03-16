import React from "react";
import { Search, Link as LinkIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
  handleEmptySlotClick: (dayIndex: number, startHour: number) => void;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleEventClick: (event: any, e: React.MouseEvent) => void; 
}

export default function CalendarMain({
  currentMonthYear,
  days,
  hours,
  isLoadingData,
  events,
  selectedMemberIds,
  members,
  handleDragOver,
  handleDrop,
  handleEmptySlotClick,
  setIsScheduleModalOpen,
  handlePrevWeek,
  handleNextWeek,
  handleEventClick
}: CalendarMainProps) {
  return (
    <main className="flex-1 flex flex-col min-w-0 z-0 relative">
      <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <button className="text-xl font-bold text-gray-800">{currentMonthYear}</button>
          <div className="flex items-center space-x-1 ml-2">
            <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
            <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 rounded-md p-1 ml-4">
            <button className="px-3 py-1 text-sm bg-white rounded shadow-sm font-medium">週</button>
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-medium">月</button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="予定を検索、または 'Cmd+K'" className="pl-9 pr-4 py-2 w-64 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" />
          </div>
          
          <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all shadow-sm flex items-center group">
            <LinkIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-orange-500 transition-colors" />
            日程調整リンク
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto flex flex-col bg-white">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="w-16 flex-shrink-0"></div>
          {days.map((day, index) => (
            <div key={index} className="flex-1 py-3 text-center border-l border-gray-200">
              <span className="text-sm font-medium text-gray-600">{day}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {isLoadingData && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}
          {hours.map((hour, hourIndex) => (
            <div key={hourIndex} className="flex border-b border-gray-100 h-16">
              <div className="w-16 flex-shrink-0 text-right pr-2 py-2 text-xs text-gray-400">{hour}</div>
              {days.map((_, dayIndex) => (
                <div key={dayIndex} className="flex-1 border-l border-gray-100 relative group hover:bg-orange-50/50 cursor-crosshair transition-colors" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayIndex, hourIndex)} onClick={() => handleEmptySlotClick(dayIndex, hourIndex)}>
                  {events
                    .filter((event) => event.dayIndex === dayIndex && event.startHour === hourIndex)
                    .filter((event) => selectedMemberIds.includes(event.memberId))
                    .map((event) => {
                      const member = members.find((m) => m.id === event.memberId);
                      const heightPct = event.duration * 100;
                      const bgColor = member?.colorHex || "#f97316"; 
                      return (
                        <div 
                          key={event.id} 
                          onClick={(e) => handleEventClick(event, e)}
                          className="absolute w-[92%] left-[4%] rounded-md px-2 py-1.5 text-xs text-white shadow-sm overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer z-10" 
                          style={{ top: '2%', height: `calc(${heightPct}% - 4%)`, backgroundColor: bgColor }} 
                          title="クリックして詳細を表示"
                        >
                          <div className="font-semibold truncate">{event.title}</div>
                          <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80"></span>{member?.name || "カレンダー"}</div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}