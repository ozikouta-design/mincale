import React from "react";
import { Search, Link as LinkIcon, ChevronLeft, ChevronRight, Menu, ListTodo, Plus } from "lucide-react";

interface CalendarHeaderProps {
  displayMonthYear: string; viewMode: "day" | "week" | "month"; setViewMode: (mode: "day" | "week" | "month") => void;
  handlePrevWeek: () => void; handleNextWeek: () => void; handleToday: () => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScheduleModalOpen: (isOpen: boolean) => void; setIsCreateEventModalOpen: (isOpen: boolean) => void;
  accentColor: string;
}

export default function CalendarHeader({
  displayMonthYear, viewMode, setViewMode, handlePrevWeek, handleNextWeek, handleToday,
  setIsSidebarOpen, setIsRightPanelOpen, setIsScheduleModalOpen, setIsCreateEventModalOpen, accentColor
}: CalendarHeaderProps) {
  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-gray-200 overflow-x-auto no-scrollbar shrink-0 bg-white">
      <div className="flex items-center space-x-2 md:space-x-6 shrink-0">
        {/* ★ 修正：トグル式で開閉できるようにする */}
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
        <div className="md:hidden relative">
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg pl-3 pr-6 py-1.5 focus:outline-none transition-shadow" style={{ '--tw-ring-color': accentColor } as any}>
            <option value="day">日</option><option value="week">週</option><option value="month">月</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
        </div>

        <button onClick={() => setIsScheduleModalOpen(true)} className="hidden md:flex text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all items-center shrink-0 border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
          <LinkIcon className="w-3.5 h-3.5 mr-1.5" />リンク発行
        </button>
        
        {/* ★ 修正：ボタンの名称を「予定調整」に変更 */}
        <button onClick={() => setIsCreateEventModalOpen(true)} className="text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center shrink-0 hover:brightness-110" style={{ backgroundColor: accentColor }}>
          <Plus className="w-3.5 h-3.5 mr-1" />予定調整
        </button>

        <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg shrink-0" title="右パネルを開閉"><ListTodo className="w-5 h-5 text-gray-700" /></button>
      </div>
    </header>
  );
}