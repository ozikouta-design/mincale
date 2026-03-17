import React from "react";
import { Calendar as CalendarIcon, Users, Plus, ChevronLeft, ChevronRight, Check, LogOut, RefreshCw, X } from "lucide-react"; 

interface SidebarProps {
  currentMonthYear: string; todayDate: number; setNewEventTitle: (title: string) => void; setNewEventDayIndex: (index: number) => void; setNewEventStartHour: (hour: number) => void; setNewEventDuration: (duration: number) => void; setIsCreateEventModalOpen: (isOpen: boolean) => void; selectAllMembers: () => void; members: any[]; isLoadingData: boolean; selectedMemberIds: string[]; toggleMember: (id: string) => void; status: "loading" | "authenticated" | "unauthenticated"; session: any; syncGoogleData: () => void; isSyncing: boolean; signIn: (provider: string) => void; signOut: () => void; handlePrevWeek: () => void; handleNextWeek: () => void; setEditingEventId: (id: any) => void; isSidebarOpen: boolean; setIsSidebarOpen: (isOpen: boolean) => void; groups: any[]; setIsGroupModalOpen: (isOpen: boolean) => void; setSelectedMemberIds: (ids: string[]) => void; handleDeleteGroup: (groupId: string, e: React.MouseEvent) => void;
  accentColor: string; // ★ 追加
}

export default function Sidebar({
  currentMonthYear, todayDate, selectAllMembers, members, isLoadingData, selectedMemberIds, toggleMember, status, session, syncGoogleData, isSyncing, signIn, signOut, handlePrevWeek, handleNextWeek, isSidebarOpen, setIsSidebarOpen, groups, setIsGroupModalOpen, setSelectedMemberIds, handleDeleteGroup, accentColor
}: SidebarProps) {
  return (
    <aside className={`fixed md:relative z-40 inset-y-0 left-0 h-full flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden border-none"}`}>
      <div className="h-16 min-h-[64px] flex items-center justify-between px-4 border-b border-gray-200">
        <div className="flex items-center whitespace-nowrap">
          <CalendarIcon className="w-6 h-6 mr-2" style={{ color: accentColor }} />
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">みんカレ</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full md:hidden"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto whitespace-nowrap">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 mt-2"><span className="font-semibold text-sm">{currentMonthYear}</span><div className="flex space-x-1"><ChevronLeft onClick={handlePrevWeek} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800 bg-white rounded-full shadow-sm" /><ChevronRight onClick={handleNextWeek} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800 bg-white rounded-full shadow-sm" /></div></div>
          <div className="w-full bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1"><div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div></div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">{[...Array(31)].map((_, i) => { const dayNum = i + 1; const isToday = dayNum === todayDate; return ( <div key={i} className={`py-1 rounded-md cursor-pointer hover:bg-gray-100 ${isToday ? "text-white font-bold" : "text-gray-700"}`} style={isToday ? { backgroundColor: accentColor } : {}}>{dayNum}</div> ); })}</div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-700"><div className="flex items-center"><Users className="w-4 h-4 mr-2" />クイック表示</div><Plus onClick={() => setIsGroupModalOpen(true)} className="w-4 h-4 text-gray-400 cursor-pointer transition-colors hover:scale-110" style={{ hover: { color: accentColor } } as any} /></div>
          <ul className="space-y-1">
            <li onClick={selectAllMembers} className="text-sm text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-md cursor-pointer transition-colors">すべてのカレンダーを表示</li>
            {groups.map(group => ( <li key={group.id} onClick={() => { setSelectedMemberIds(group.memberIds); setIsSidebarOpen(false); }} className="flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-md cursor-pointer transition-colors group"><span className="truncate">{group.name}</span><button onClick={(e) => handleDeleteGroup(group.id, e)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"><X className="w-3 h-3" /></button></li> ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-700"><span>マイカレンダー</span><Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-700" /></div>
          {members.length === 0 && !isLoadingData && <div className="text-xs text-gray-400 pl-2">Googleにログインしてください</div>}
          <ul className="space-y-1">
            {members.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <li key={member.id} onClick={() => toggleMember(member.id)} className={`flex items-center text-sm cursor-pointer p-1.5 rounded-md transition-all ${isSelected ? "font-medium" : "text-gray-700 hover:bg-gray-200"}`} style={isSelected ? { backgroundColor: accentColor + '1A', color: accentColor } : {}}>
                  <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] mr-2 shadow-sm ${!isSelected && "opacity-60"}`} style={{ backgroundColor: member.colorHex }}>{member.initials}</div>
                  <span className="flex-1 truncate" title={member.name}>{member.name}</span>
                  {isSelected && <Check className="w-4 h-4" style={{ color: member.colorHex }} />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white flex flex-col space-y-4 whitespace-nowrap">
        {status === "loading" ? <div className="flex items-center justify-center py-2 text-sm text-gray-500 animate-pulse">読み込み中...</div> : session && session.user ? (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-3 overflow-hidden">
              {session.user.image ? <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" /> : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: accentColor }}>{session.user.name?.charAt(0) || "U"}</div>}
              <div className="flex flex-col truncate"><span className="text-sm font-semibold text-gray-800 truncate">{session.user.name}</span><span className="text-[10px] text-gray-500 truncate">{session.user.email}</span></div>
            </div>
            <div className="flex space-x-1"><button onClick={syncGoogleData} disabled={isSyncing} className="p-1.5 hover:text-white rounded-md transition-colors disabled:opacity-50" style={{ color: accentColor }}><RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} /></button><button onClick={() => signOut()} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><LogOut className="w-4 h-4" /></button></div>
          </div>
        ) : ( <button onClick={() => signIn("google")} className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"><span>Googleでログイン</span></button> )}
      </div>
    </aside>
  );
}