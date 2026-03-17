"use client";

import React from "react";
import RightPanel from "@/components/RightPanel";
import Sidebar from "@/components/Sidebar";
import CalendarMain from "@/components/CalendarMain";
import Modals from "@/components/Modals";

// ★ 他のファイルで使われている関数を、新しいフックから「中継」してあげる
export { getDayIndex, formatLocalISO } from "@/hooks/useCalendarLogic";

import { useCalendarLogic } from "@/hooks/useCalendarLogic";

export default function CalendarDashboard() {
  // ★ すべての頭脳（ロジック）を1行で呼び出す！
  const logic = useCalendarLogic();

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      
      {/* スマホ用オーバーレイ */}
      {(logic.isSidebarOpen || logic.isRightPanelOpen) && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300" 
          onClick={() => { logic.setIsSidebarOpen(false); logic.setIsRightPanelOpen(false); }} 
        />
      )}

      {/* {...logic} の魔法で、必要なデータを一発ですべてのコンポーネントに渡す */}
      <Modals {...logic} />
      <Sidebar {...logic} />
      <CalendarMain {...logic} />
      <RightPanel {...logic} />
      
    </div>
  );
}