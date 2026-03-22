import React from "react";
import { ChevronLeft, ChevronRight, Menu, SlidersHorizontal, Link as LinkIcon } from "lucide-react";
import { useCalendar } from "@/context/CalendarContext";

interface CalendarHeaderProps {
  displayMonthYear: string;
  viewMode: "day" | "week" | "month";
  setViewMode: (mode: "day" | "week" | "month") => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleToday: () => void;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScheduleModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreateEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accentColor: string;
}

export default function CalendarHeader({
  displayMonthYear, viewMode, setViewMode, handlePrevWeek, handleNextWeek, handleToday,
  setIsSidebarOpen, setIsRightPanelOpen, setIsScheduleModalOpen, accentColor
}: CalendarHeaderProps) {
  const { setActiveTab } = useCalendar();

  return (
    <header className="h-[60px] md:h-16 flex items-center justify-between px-2 md:px-6 border-b border-gray-200 bg-white shrink-0 z-30 shadow-sm relative">

      {/* 左: メニュー + 年月 + 前後ナビ + 今日(md+) */}
      <div className="flex items-center gap-1 md:gap-4">
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm md:text-2xl font-black text-gray-800 tracking-tight min-w-[68px] md:min-w-[140px] truncate">
          {displayMonthYear}
        </h2>
        <div className="flex items-center gap-0.5 bg-gray-50 p-0.5 md:p-1 rounded-xl border border-gray-200">
          <button onClick={handlePrevWeek} className="p-1 md:p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={handleNextWeek} className="p-1 md:p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={handleToday} className="hidden md:block px-3 py-1.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm">
          今日
        </button>
      </div>

      {/* 中央: 日/週/月 (lg+のみ) */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200/50">
        {(["day", "week", "month"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${
              viewMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
          </button>
        ))}
      </div>

      {/* 右: モバイル = 日/週/月 + 今日 + 設定 / デスクトップ = リンク発行 + 設定 */}
      <div className="flex items-center gap-1 md:gap-1.5">

        {/* モバイル: 表示切替 (lg未満) */}
        <div className="flex lg:hidden items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/50">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all duration-200 ${
                viewMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
              }`}
            >
              {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
            </button>
          ))}
        </div>

        {/* モバイル: 今日ボタン (md未満) */}
        <button
          onClick={handleToday}
          className="md:hidden px-2 py-0.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm active:bg-gray-100"
        >
          今日
        </button>

        {/* デスクトップ: リンク発行 (md+) */}
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="hidden md:flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm"
          title="空き日程テキストのプレビューを開く"
        >
          <LinkIcon className="w-4 h-4 mr-2 text-gray-500" />
          <span>リンク発行</span>
        </button>

        {/* 設定 */}
        <button
          onClick={() => { setActiveTab("settings"); setIsRightPanelOpen(true); }}
          className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-gray-600 bg-white border border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

    </header>
  );
}
