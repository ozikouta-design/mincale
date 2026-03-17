import React from "react";
import { Search, Link as LinkIcon, ChevronLeft, ChevronRight, Menu, ListTodo } from "lucide-react";

interface CalendarHeaderProps {
  displayMonthYear: string;
  viewMode: "day" | "week" | "month";
  setViewMode: (mode: "day" | "week" | "month") => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleToday: () => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  accentColor: string;
}

export default function CalendarHeader({
  displayMonthYear, viewMode, setViewMode, handlePrevWeek, handleNextWeek, handleToday,
  setIsSidebarOpen, setIsRightPanelOpen, setIsScheduleModalOpen, accentColor
}: CalendarHeaderProps) {
  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-gray-200 overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center space-x-2 md:space-x-6 shrink-0">
        <button onClick={() => setIsSidebarOpen(prev => !prev)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors" title="サイドバーを開閉"><Menu className="w-5 h-5 text-gray-700" /></button>
        
        <div className="flex items-center space-x-1 md:space-x-3">
          <h1 className="text-base md:text-xl font-semibold text-gray-800 tracking-tight shrink-0">{displayMonthYear}</h1>
          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 md:p-1 border border-gray-200 shrink-0">
            <button onClick={handlePrevWeek} className="p-1 md:p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={handleNextWeek} className="p-1 md:p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={handleToday} className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-bold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-all shadow-sm bg-white shrink-0">今日</button>
        </div>

        <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shrink-0">
          {["day", "week", "month"].map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === mode ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} style={viewMode === mode ? { color: accentColor } : {}}>
              {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 shrink-0 ml-2">
        <div className="hidden lg:block relative group">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'currentColor' }} />
          <input type="text" placeholder="予定、メンバーを検索" className="pl-9 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none transition-all focus:ring-2 focus:ring-opacity-20" style={{ '--tw-ring-color': accentColor } as React.CSSProperties} />
        </div>
        <button onClick={() => setIsScheduleModalOpen(true)} className="text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs font-bold shadow-sm md:shadow-lg transition-all flex items-center shrink-0 hover:brightness-110" style={{ backgroundColor: accentColor }}>
          <LinkIcon className="w-3.5 h-3.5 mr-1 md:mr-2" />日程調整
        </button>
        <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg shrink-0" title="右パネルを開閉"><ListTodo className="w-5 h-5 text-gray-700" /></button>
      </div>
    </header>
  );
}