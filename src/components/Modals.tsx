import React, { useEffect, useState } from "react";
import { X, CheckCircle, Clock, Calendar as CalendarIcon, AlignLeft, Trash2, Pencil, MapPin } from "lucide-react";

interface ModalsProps {
  isScheduleModalOpen: boolean; setIsScheduleModalOpen: (isOpen: boolean) => void;
  isCreateEventModalOpen: boolean; setIsCreateEventModalOpen: (isOpen: boolean) => void;
  isGroupModalOpen: boolean; handleCloseGroupModal: () => void; // ★ 変更
  isTaskEditModalOpen: boolean; setIsTaskEditModalOpen: (isOpen: boolean) => void;
  editingEventId: any; editingEventIsGoogle: boolean;
  newEventTitle: string; setNewEventTitle: (title: string) => void;
  newEventMemberId: string; setNewEventMemberId: (id: string) => void;
  newEventDayIndex: number; setNewEventDayIndex: (idx: number) => void;
  newEventStartHour: number; setNewEventStartHour: (h: number) => void;
  newEventDuration: number; setNewEventDuration: (d: number) => void;
  newEventLocation: string; setNewEventLocation: (loc: string) => void;
  newEventDescription: string; setNewEventDescription: (desc: string) => void;
  handleCreateEvent: () => void; handleDeleteEvent: (id: any, isG: boolean, mId: string) => void;
  members: any[];
  newGroupName: string; setNewGroupName: (name: string) => void;
  newGroupMemberIds: string[]; setNewGroupMemberIds: (ids: string[]) => void;
  handleSaveGroup: () => void;
  editTaskTitle: string; setEditTaskTitle: (t: string) => void;
  editTaskProject: string; setEditTaskProject: (p: string) => void;
  handleUpdateTask: () => void;
  isCopied: boolean; handleCopyToClipboard: () => void; getCommonFreeTimeText: () => string;
  accentColor: string;
  selectedEventDetails: any; setSelectedEventDetails: (d: any) => void;
  eventPopupPosition: { x: number, y: number } | null;
  handleEditEventClick: () => void;
}

export default function Modals({
  isScheduleModalOpen, setIsScheduleModalOpen, isCreateEventModalOpen, setIsCreateEventModalOpen,
  isGroupModalOpen, handleCloseGroupModal, isTaskEditModalOpen, setIsTaskEditModalOpen,
  editingEventId, editingEventIsGoogle, newEventTitle, setNewEventTitle,
  newEventMemberId, setNewEventMemberId, newEventDayIndex, setNewEventDayIndex,
  newEventStartHour, setNewEventStartHour, newEventDuration, setNewEventDuration,
  newEventLocation, setNewEventLocation, newEventDescription, setNewEventDescription,
  handleCreateEvent, handleDeleteEvent, members,
  newGroupName, setNewGroupName, newGroupMemberIds, setNewGroupMemberIds, handleSaveGroup,
  editTaskTitle, setEditTaskTitle, editTaskProject, setEditTaskProject, handleUpdateTask,
  isCopied, handleCopyToClipboard, getCommonFreeTimeText, accentColor,
  selectedEventDetails, setSelectedEventDetails, eventPopupPosition, handleEditEventClick
}: ModalsProps) {

  const [scheduleText, setScheduleText] = useState("");
  useEffect(() => { if (isScheduleModalOpen) setScheduleText(getCommonFreeTimeText()); }, [isScheduleModalOpen]);

  const y = Math.floor(newEventDayIndex / 10000); const m = Math.floor((newEventDayIndex % 10000) / 100); const d = newEventDayIndex % 100;
  const dateStr = y ? `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}` : "";
  const sh = Math.floor(newEventStartHour); const sm = Math.round((newEventStartHour % 1) * 60);
  const startTimeStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
  const endHCalc = newEventStartHour + newEventDuration; const eh = Math.floor(endHCalc); const em = Math.round((endHCalc % 1) * 60);
  const endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value); if (isNaN(date.getTime())) return;
    setNewEventDayIndex(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate());
  };
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, min] = e.target.value.split(':').map(Number); setNewEventStartHour(h + min / 60);
  };
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, min] = e.target.value.split(':').map(Number); let newEnd = h + min / 60;
    if (newEnd <= newEventStartHour) newEnd = newEventStartHour + 0.5;
    setNewEventDuration(newEnd - newEventStartHour);
  };

  return (
    <>
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsScheduleModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">日程調整テキストを生成</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4 font-medium">選択中のメンバーの空き時間を元に、以下のテキストを生成しました。</p>
              <div className="relative group">
                <textarea readOnly value={scheduleText} className="w-full h-48 p-4 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 outline-none resize-none focus:ring-2 focus:ring-blue-100 transition-all font-mono" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={handleCopyToClipboard} className="px-6 py-2.5 text-white text-sm font-bold rounded-xl flex items-center shadow-sm hover:brightness-110 transition-all" style={{ backgroundColor: isCopied ? "#10b981" : accentColor }}>
                {isCopied ? <><CheckCircle className="w-4 h-4 mr-2" />コピーしました！</> : "テキストをコピー"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreateEventModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-800">{editingEventId ? "予定を編集" : "新しい予定"}</h2>
              <button onClick={() => setIsCreateEventModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <input type="text" autoFocus value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="タイトルを追加" className="w-full p-2 text-xl font-bold border-b border-gray-200 outline-none focus:border-blue-500 placeholder-gray-300 transition-colors" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                <input type="date" value={dateStr} onChange={handleDateChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                <input type="time" value={startTimeStr} onChange={handleStartTimeChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                <span className="text-gray-400">-</span>
                <input type="time" value={endTimeStr} onChange={handleEndTimeChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-400 shrink-0" />
                <select value={newEventMemberId} onChange={(e) => setNewEventMemberId(e.target.value)} className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-white focus:border-blue-500">
                  {members.map(m => ( <option key={m.id} value={m.id}>{m.name}</option> ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                <input type="text" value={newEventLocation} onChange={(e) => setNewEventLocation(e.target.value)} placeholder="場所を追加" className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-start gap-2">
                <AlignLeft className="w-5 h-5 text-gray-400 shrink-0 mt-2" />
                <textarea value={newEventDescription} onChange={(e) => setNewEventDescription(e.target.value)} placeholder="説明を追加" rows={3} className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl shrink-0">
              <button onClick={() => setIsCreateEventModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">キャンセル</button>
              <button onClick={handleCreateEvent} disabled={!newEventTitle} className="px-6 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 shadow-sm hover:brightness-110" style={{ backgroundColor: accentColor }}>保存する</button>
            </div>
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseGroupModal}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              {/* ★ タイトルも動的に変更 */}
              <h2 className="text-base font-bold text-gray-800">{newGroupName ? "グループを編集" : "グループを作成"}</h2>
              <button onClick={handleCloseGroupModal} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">グループ名</label>
                <input type="text" autoFocus value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="開発チーム、営業部など..." className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">含めるメンバー</label>
                <div className="max-h-48 overflow-y-auto space-y-1 p-2 border border-gray-100 rounded-xl bg-gray-50">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                      <input type="checkbox" checked={newGroupMemberIds.includes(m.id)} onChange={(e) => { if (e.target.checked) setNewGroupMemberIds([...newGroupMemberIds, m.id]); else setNewGroupMemberIds(newGroupMemberIds.filter(id => id !== m.id)); }} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" style={{ accentColor }} />
                      <span className="ml-3 text-sm font-medium text-gray-700">{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
              <button onClick={handleCloseGroupModal} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">キャンセル</button>
              <button onClick={handleSaveGroup} disabled={!newGroupName || newGroupMemberIds.length === 0} className="px-6 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 shadow-sm hover:brightness-110" style={{ backgroundColor: accentColor }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {isTaskEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsTaskEditModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">タスクを編集</h2>
              <button onClick={() => setIsTaskEditModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">タスク名</label>
                <input type="text" autoFocus value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">プロジェクト (任意)</label>
                <input type="text" value={editTaskProject} onChange={(e) => setEditTaskProject(e.target.value)} className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setIsTaskEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">キャンセル</button>
              <button onClick={handleUpdateTask} disabled={!editTaskTitle} className="px-6 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 shadow-sm hover:brightness-110" style={{ backgroundColor: accentColor }}>更新する</button>
            </div>
          </div>
        </div>
      )}

      {selectedEventDetails && (
        <>
          <div className="hidden md:block fixed inset-0 z-40" onClick={() => setSelectedEventDetails(null)} />
          
          <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <button onClick={() => setSelectedEventDetails(null)} className="p-2 -ml-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              <div className="flex items-center gap-2">
                <button onClick={handleEditEventClick} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Pencil className="w-5 h-5" /></button>
                <button onClick={() => { handleDeleteEvent(selectedEventDetails.id, selectedEventDetails.isGoogle, selectedEventDetails.memberId); }} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="w-4 h-4 rounded-full mb-4 shadow-sm" style={{ backgroundColor: selectedEventDetails.colorHex || accentColor }} />
              <h2 className="text-2xl font-black text-gray-900 mb-6 leading-tight break-words">{selectedEventDetails.title}</h2>
              <div className="space-y-5">
                <div className="flex items-start text-gray-600">
                  <Clock className="w-6 h-6 mr-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-base">
                    {Math.floor(selectedEventDetails.startHour).toString().padStart(2, '0')}:{Math.round((selectedEventDetails.startHour % 1) * 60).toString().padStart(2, '0')} 〜 
                    {Math.floor(selectedEventDetails.startHour + selectedEventDetails.duration).toString().padStart(2, '0')}:{Math.round(((selectedEventDetails.startHour + selectedEventDetails.duration) % 1) * 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-start text-gray-600">
                  <CalendarIcon className="w-6 h-6 mr-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-base">{members.find(m => m.id === selectedEventDetails.memberId)?.name || "カレンダー"}</span>
                </div>
                {selectedEventDetails.location && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-6 h-6 mr-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-base break-words">{selectedEventDetails.location}</span>
                  </div>
                )}
                {selectedEventDetails.description && (
                  <div className="flex items-start text-gray-600">
                    <AlignLeft className="w-6 h-6 mr-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-sm whitespace-pre-wrap break-words leading-relaxed">{selectedEventDetails.description}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:block fixed z-50 animate-in fade-in zoom-in-95 duration-200" style={{ left: eventPopupPosition?.x, top: eventPopupPosition?.y, transform: 'translate(-50%, -100%)', marginTop: '-12px' }}>
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 w-80 relative">
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-b border-r border-gray-100 rotate-45 shadow-[4px_4px_4px_rgba(0,0,0,0.02)]"></div>
              <div className="p-5 relative z-10 max-h-[400px] overflow-y-auto">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-3.5 h-3.5 rounded-full mt-1.5 shadow-sm shrink-0" style={{ backgroundColor: selectedEventDetails.colorHex || accentColor }} />
                  <div className="flex gap-1 -mt-1 -mr-2 shrink-0">
                    <button onClick={handleEditEventClick} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="編集"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { handleDeleteEvent(selectedEventDetails.id, selectedEventDetails.isGoogle, selectedEventDetails.memberId); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="削除"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setSelectedEventDetails(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors ml-1"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 leading-snug pr-4 break-words">{selectedEventDetails.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-start text-gray-600 text-sm font-medium">
                    <Clock className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                    <span>
                      {Math.floor(selectedEventDetails.startHour).toString().padStart(2, '0')}:{Math.round((selectedEventDetails.startHour % 1) * 60).toString().padStart(2, '0')} - {Math.floor(selectedEventDetails.startHour + selectedEventDetails.duration).toString().padStart(2, '0')}:{Math.round(((selectedEventDetails.startHour + selectedEventDetails.duration) % 1) * 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-start text-gray-600 text-sm font-medium">
                    <CalendarIcon className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                    <span>{members.find(m => m.id === selectedEventDetails.memberId)?.name || "カレンダー"}</span>
                  </div>
                  {selectedEventDetails.location && (
                    <div className="flex items-start text-gray-600 text-sm font-medium">
                      <MapPin className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                      <span className="break-words">{selectedEventDetails.location}</span>
                    </div>
                  )}
                  {selectedEventDetails.description && (
                    <div className="flex items-start text-gray-600 text-xs mt-4 pt-4 border-t border-gray-100">
                      <AlignLeft className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                      <span className="whitespace-pre-wrap break-words leading-relaxed">{selectedEventDetails.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}