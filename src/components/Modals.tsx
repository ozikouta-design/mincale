import React from "react";
import { Check, X, Copy, Link as LinkIcon, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

interface ModalsProps {
  isScheduleModalOpen: boolean; setIsScheduleModalOpen: (isOpen: boolean) => void;
  getCommonFreeTimeText: () => string; handleCopyToClipboard: () => void; isCopied: boolean;
  isCreateEventModalOpen: boolean; setIsCreateEventModalOpen: (isOpen: boolean) => void; handleCreateEvent: () => void;
  newEventTitle: string; setNewEventTitle: (title: string) => void;
  newEventMemberId: string; setNewEventMemberId: (id: string) => void;
  members: any[];
  newEventDayIndex: number; setNewEventDayIndex: (index: number) => void; days: string[];
  newEventStartHour: number; setNewEventStartHour: (hour: number) => void; hours: string[];
  newEventDuration: number; setNewEventDuration: (duration: number) => void;
  editingEventId: any; setEditingEventId: (id: any) => void;
  editingEventIsGoogle: boolean; handleDeleteEvent: (eventId: any, isGoogle: boolean, calendarId: string) => void;
  isGroupModalOpen?: boolean; setIsGroupModalOpen?: (isOpen: boolean) => void;
  newGroupName?: string; setNewGroupName?: (name: string) => void;
  newGroupMemberIds?: string[]; setNewGroupMemberIds?: (ids: string[]) => void;
  handleSaveGroup?: () => void;
  isTaskEditModalOpen?: boolean; setIsTaskEditModalOpen?: (isOpen: boolean) => void;
  editTaskTitle?: string; setEditTaskTitle?: (title: string) => void;
  editTaskProject?: string; setEditTaskProject?: (project: string) => void;
  handleUpdateTask?: () => void;
}

export default function Modals({
  isScheduleModalOpen, setIsScheduleModalOpen, getCommonFreeTimeText, handleCopyToClipboard, isCopied,
  isCreateEventModalOpen, setIsCreateEventModalOpen, handleCreateEvent,
  newEventTitle, setNewEventTitle, newEventMemberId, setNewEventMemberId, members,
  newEventDayIndex, setNewEventDayIndex, days, newEventStartHour, setNewEventStartHour, hours,
  newEventDuration, setNewEventDuration, editingEventId, setEditingEventId, editingEventIsGoogle, handleDeleteEvent,
  isGroupModalOpen, setIsGroupModalOpen, newGroupName, setNewGroupName, newGroupMemberIds, setNewGroupMemberIds, handleSaveGroup,
  isTaskEditModalOpen, setIsTaskEditModalOpen, editTaskTitle, setEditTaskTitle, editTaskProject, setEditTaskProject, handleUpdateTask
}: ModalsProps) {

  const closeEventModal = () => { setIsCreateEventModalOpen(false); setEditingEventId(null); };

  // ★ 15分刻み（0.25単位）の開始時間の選択肢を自動生成 (9:00〜19:00)
  const timeOptions = [];
  for (let i = 0; i <= 10; i += 0.25) {
    const totalMinutes = Math.round(i * 60) + 9 * 60;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const label = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    timeOptions.push({ value: i, label });
  }

  // ★ 15分刻み（0.25単位）の所要時間（長さ）の選択肢を自動生成
  const durationOptions = [];
  for (let i = 0.25; i <= 10; i += 0.25) {
    const h = Math.floor(i);
    const m = Math.round((i % 1) * 60);
    let label = "";
    if (h > 0) label += `${h}時間`;
    if (m > 0) label += `${m}分`;
    durationOptions.push({ value: i, label });
  }

  return (
    <>
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-[560px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.98] duration-300 ease-out">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center"><div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3"><LinkIcon className="w-4 h-4 text-orange-600" /></div><div><h2 className="text-base font-bold text-gray-800">日程調整リンクの発行</h2><p className="text-xs text-gray-500 mt-0.5">選択中のカレンダーから共通の空き時間を抽出しました</p></div></div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6"><div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap leading-relaxed h-[240px] overflow-y-auto">{getCommonFreeTimeText()}</div></div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button>
              <button onClick={handleCopyToClipboard} className={`flex items-center px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${isCopied ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                {isCopied ? <><Check className="w-4 h-4 mr-2" />コピーしました！</> : <><Copy className="w-4 h-4 mr-2" />テキストをコピー</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 予定作成 ＆ 編集（ダークポップオーバー風） */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-sm transition-opacity duration-300" onMouseDown={closeEventModal}>
          <div className="bg-[#282828]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[380px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.95] duration-200 ease-out" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div><input type="text" autoFocus required value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="新規予定" className="w-full bg-transparent text-xl font-bold outline-none text-white placeholder-gray-500" /></div>
              <div className="h-px w-full bg-white/10 my-2"></div>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-300">
                  <CalendarIcon className="w-4 h-4 mr-3 text-gray-400" />
                  <select value={newEventDayIndex} onChange={(e) => setNewEventDayIndex(Number(e.target.value))} className="bg-transparent outline-none cursor-pointer hover:text-white transition-colors appearance-none">
                    {days.map((day, idx) => <option key={idx} value={idx} className="bg-gray-800">{day}</option>)}
                  </select>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <Clock className="w-4 h-4 mr-3 text-gray-400" />
                  <div className="flex items-center space-x-2">
                    
                    {/* ★ ここに15分刻みの開始時間の選択肢を流し込む */}
                    <select value={newEventStartHour} onChange={(e) => setNewEventStartHour(Number(e.target.value))} className="bg-transparent outline-none cursor-pointer hover:text-white transition-colors appearance-none">
                      {timeOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>)}
                    </select>
                    
                    <span>から</span>
                    
                    {/* ★ ここにドラッグした長さが 15分(0.25)刻みでそのまま入る！ */}
                    <select value={newEventDuration} onChange={(e) => setNewEventDuration(Number(e.target.value))} className="bg-transparent outline-none cursor-pointer hover:text-white transition-colors appearance-none text-blue-400 font-medium">
                      {durationOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>)}
                    </select>
                    
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                  <select value={newEventMemberId} onChange={(e) => setNewEventMemberId(e.target.value)} className="w-48 bg-transparent outline-none cursor-pointer hover:text-white transition-colors truncate appearance-none">
                    {members.map(m => (<option key={m.id} value={m.id} className="bg-gray-800">{m.name}</option>))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end px-4 py-3 bg-white/5 border-t border-white/10 space-x-2">
              {editingEventId && <button onClick={() => handleDeleteEvent(editingEventId, editingEventIsGoogle, newEventMemberId)} className="px-4 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors mr-auto">削除</button>}
              <button onClick={closeEventModal} className="px-4 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">キャンセル</button>
              <button onClick={handleCreateEvent} className="px-4 py-1.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors shadow-sm">{editingEventId ? "完了" : "追加"}</button>
            </div>
          </div>
        </div>
      )}

      {isGroupModalOpen && setIsGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#f2f2f7] rounded-xl shadow-2xl w-[400px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.98] duration-300 ease-out">
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
              <button onClick={() => setIsGroupModalOpen(false)} className="text-orange-500 text-base font-medium">キャンセル</button>
              <h2 className="text-base font-semibold text-gray-900">グループ作成</h2>
              <button onClick={handleSaveGroup} className="text-orange-500 text-base font-semibold" disabled={!newGroupName || newGroupMemberIds?.length === 0}>保存</button>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName && setNewGroupName(e.target.value)} placeholder="グループ名 (例: 開発チーム)" className="w-full px-4 py-3 text-base outline-none text-gray-900 placeholder-gray-400" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 pl-2">表示するメンバー</h3>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden text-base">
                  {members.map((m, idx) => (
                    <label key={m.id} className={`flex items-center justify-between px-4 py-3 cursor-pointer ${idx !== members.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="flex items-center"><div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] mr-3" style={{ backgroundColor: m.colorHex }}>{m.initials}</div><span className="text-gray-900">{m.name}</span></div>
                      <input type="checkbox" checked={newGroupMemberIds?.includes(m.id)} onChange={(e) => { if (!setNewGroupMemberIds || !newGroupMemberIds) return; if (e.target.checked) setNewGroupMemberIds([...newGroupMemberIds, m.id]); else setNewGroupMemberIds(newGroupMemberIds.filter(id => id !== m.id)); }} className="w-5 h-5 accent-orange-500" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTaskEditModalOpen && setIsTaskEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#f2f2f7] rounded-xl shadow-2xl w-[400px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.98] duration-300 ease-out">
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
              <button onClick={() => setIsTaskEditModalOpen(false)} className="text-orange-500 text-base font-medium">キャンセル</button>
              <h2 className="text-base font-semibold text-gray-900">タスク編集</h2>
              <button onClick={handleUpdateTask} className="text-orange-500 text-base font-semibold" disabled={!editTaskTitle}>保存</button>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden text-base">
                <div className="border-b border-gray-100">
                  <input type="text" value={editTaskTitle} onChange={(e) => setEditTaskTitle && setEditTaskTitle(e.target.value)} placeholder="タスク名" className="w-full px-4 py-3 text-base outline-none text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <input type="text" value={editTaskProject} onChange={(e) => setEditTaskProject && setEditTaskProject(e.target.value)} placeholder="プロジェクト名 (任意)" className="w-full px-4 py-3 text-base outline-none text-gray-900 placeholder-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}