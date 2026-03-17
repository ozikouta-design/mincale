import React from "react";
import { Menu, ChevronLeft, ChevronRight, Plus, List } from "lucide-react";

interface CalendarHeaderProps {
  displayMonthYear: string;
  viewMode: "day" | "week" | "month";
  setViewMode: (mode: "day" | "week" | "month") => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleToday: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsRightPanelOpen: (isOpen: boolean) => void;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  accentColor: string;
}

export default function CalendarHeader({
  displayMonthYear, viewMode, setViewMode, handlePrevWeek, handleNextWeek, handleToday,
  setIsSidebarOpen, setIsRightPanelOpen, setIsScheduleModalOpen, accentColor
}: CalendarHeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-3 md:px-6 shrink-0 z-30">
      
      {/* 左側：メニュー、今日、月移動、年月表示 */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* 左サイドバーを開く（スマホのみ表示） */}
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg md:hidden text-gray-600 transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        <button onClick={handleToday} className="hidden sm:block px-4 py-1.5 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
          今日
        </button>
        
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5">
          <button onClick={handlePrevWeek} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={handleNextWeek} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRight className="w-4 h-4" /></button>
        </div>
        
        <h2 className="text-base md:text-xl font-bold text-gray-800 min-w-[90px] md:min-w-[120px]">{displayMonthYear}</h2>
      </div>

      {/* 右側：ビュー切り替え、予定作成、右パネル */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {/* ★ スマホ用：省スペースなセレクトボックス */}
        <div className="md:hidden relative">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
            style={{ '--tw-ring-color': accentColor } as any}
          >
            <option value="day">日</option>
            <option value="week">週</option>
            <option value="month">月</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        {/* ★ PC用：横並びのボタングループ */}
        <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5">
          <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>日</button>
          <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>週</button>
          <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>月</button>
        </div>

        {/* 予定を作成ボタン */}
        <button onClick={() => setIsScheduleModalOpen(true)} className="p-1.5 md:px-4 md:py-1.5 text-white text-sm font-bold rounded-lg shadow-sm hover:brightness-110 transition-all flex items-center" style={{ backgroundColor: accentColor }}>
          <Plus className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" />
          <span className="hidden md:inline">予定を追加</span>
        </button>

        {/* 右サイドバーを開く（スマホのみ表示） */}
        <button onClick={() => setIsRightPanelOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors md:hidden">
          <List className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}