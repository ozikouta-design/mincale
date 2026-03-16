import React from "react";
import {
  Calendar as CalendarIcon,
  Users,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  LogOut,
  RefreshCw
} from "lucide-react";

interface SidebarProps {
  currentMonthYear: string;
  todayDate: number;
  setNewEventTitle: (title: string) => void;
  setNewEventDayIndex: (index: number) => void;
  setNewEventStartHour: (hour: number) => void;
  setNewEventDuration: (duration: number) => void;
  setIsCreateEventModalOpen: (isOpen: boolean) => void;
  selectAllMembers: () => void;
  members: any[];
  isLoadingData: boolean;
  selectedMemberIds: string[];
  toggleMember: (id: string) => void;
  status: "loading" | "authenticated" | "unauthenticated";
  session: any;
  syncGoogleData: () => void;
  isSyncing: boolean;
  signIn: (provider: string) => void;
  signOut: () => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  setEditingEventId: (id: any) => void; // ★ 変更: anyにする
}

export default function Sidebar({
  currentMonthYear,
  todayDate,
  setNewEventTitle,
  setNewEventDayIndex,
  setNewEventStartHour,
  setNewEventDuration,
  setIsCreateEventModalOpen,
  selectAllMembers,
  members,
  isLoadingData,
  selectedMemberIds,
  toggleMember,
  status,
  session,
  syncGoogleData,
  isSyncing,
  signIn,
  signOut,
  handlePrevWeek,
  handleNextWeek,
  setEditingEventId
}: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col z-10">
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <CalendarIcon className="w-6 h-6 text-orange-500 mr-2" />
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">みんカレ</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <button 
          onClick={() => {
            setEditingEventId(null);
            setNewEventTitle("");
            setNewEventDayIndex(0);
            setNewEventStartHour(0);
            setNewEventDuration(1);
            setIsCreateEventModalOpen(true);
          }}
          className="w-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-sm mb-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          予定を作成
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{currentMonthYear}</span>
            <div className="flex space-x-1">
              <ChevronLeft onClick={handlePrevWeek} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800 bg-white rounded-full shadow-sm" />
              <ChevronRight onClick={handleNextWeek} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="w-full bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {[...Array(31)].map((_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === todayDate;
                return (
                  <div key={i} className={`py-1 rounded-md cursor-pointer hover:bg-gray-100 ${isToday ? "bg-orange-500 text-white font-bold hover:bg-orange-600" : "text-gray-700"}`}>
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-700">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              クイック表示
            </div>
          </div>
          <ul className="space-y-1">
            <li onClick={selectAllMembers} className="text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-700 px-2 py-1.5 rounded-md cursor-pointer transition-colors">
              すべてのカレンダーを表示
            </li>
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-700">
            <span>マイカレンダー</span>
            <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-700" />
          </div>
          {members.length === 0 && !isLoadingData && (
            <div className="text-xs text-gray-400 pl-2">Googleにログインしてください</div>
          )}
          <ul className="space-y-1">
            {members.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <li
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center text-sm cursor-pointer p-1.5 rounded-md transition-all ${
                    isSelected ? "bg-orange-50 text-orange-900 font-medium" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div 
                    className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] mr-2 shadow-sm ${!isSelected && "opacity-60"}`}
                    style={{ backgroundColor: member.colorHex }}
                  >
                    {member.initials}
                  </div>
                  <span className="flex-1 truncate" title={member.name}>{member.name}</span>
                  {isSelected && <Check className="w-4 h-4" style={{ color: member.colorHex }} />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white flex flex-col space-y-4">
        {status === "loading" ? (
          <div className="flex items-center justify-center py-2 text-sm text-gray-500 animate-pulse">読み込み中...</div>
        ) : session && session.user ? (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-3 overflow-hidden">
              {session.user.image ? (
                <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {session.user.name?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-sm font-semibold text-gray-800 truncate">{session.user.name}</span>
                <span className="text-[10px] text-gray-500 truncate">{session.user.email}</span>
              </div>
            </div>
            <div className="flex space-x-1">
              <button onClick={syncGoogleData} disabled={isSyncing} className="p-1.5 text-orange-500 hover:text-white hover:bg-orange-500 rounded-md transition-colors disabled:opacity-50" title="Googleカレンダーを同期">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => signOut()} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="ログアウト">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => signIn("google")} className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Googleでログイン</span>
          </button>
        )}

        <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <Settings className="w-4 h-4 mr-2" />
          設定
        </button>
      </div>
    </aside>
  );
}