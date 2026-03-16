import React from "react";
import { Check, X, Copy, Link as LinkIcon } from "lucide-react";

interface ModalsProps {
  isScheduleModalOpen: boolean;
  setIsScheduleModalOpen: (isOpen: boolean) => void;
  getCommonFreeTimeText: () => string;
  handleCopyToClipboard: () => void;
  isCopied: boolean;
  isCreateEventModalOpen: boolean;
  setIsCreateEventModalOpen: (isOpen: boolean) => void;
  handleCreateEvent: () => void;
  newEventTitle: string;
  setNewEventTitle: (title: string) => void;
  newEventMemberId: string;
  setNewEventMemberId: (id: string) => void;
  members: any[];
  newEventDayIndex: number;
  setNewEventDayIndex: (index: number) => void;
  days: string[];
  newEventStartHour: number;
  setNewEventStartHour: (hour: number) => void;
  hours: string[];
  newEventDuration: number;
  setNewEventDuration: (duration: number) => void;
  editingEventId: number | null;
  setEditingEventId: (id: number | null) => void;
  editingEventIsGoogle: boolean; // ★ 追加
  handleDeleteEvent: (eventId: number, isGoogle: boolean) => void; // ★ 追加
}

export default function Modals({
  isScheduleModalOpen,
  setIsScheduleModalOpen,
  getCommonFreeTimeText,
  handleCopyToClipboard,
  isCopied,
  isCreateEventModalOpen,
  setIsCreateEventModalOpen,
  handleCreateEvent,
  newEventTitle,
  setNewEventTitle,
  newEventMemberId,
  setNewEventMemberId,
  members,
  newEventDayIndex,
  setNewEventDayIndex,
  days,
  newEventStartHour,
  setNewEventStartHour,
  hours,
  newEventDuration,
  setNewEventDuration,
  editingEventId,
  setEditingEventId,
  editingEventIsGoogle,
  handleDeleteEvent
}: ModalsProps) {

  const closeEventModal = () => {
    setIsCreateEventModalOpen(false);
    setEditingEventId(null);
  };

  return (
    <>
      {/* ========== モーダル：日程調整リンク発行 ========== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[560px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <LinkIcon className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">日程調整リンクの発行</h2>
                  <p className="text-xs text-gray-500 mt-0.5">選択中のカレンダーから共通の空き時間を抽出しました</p>
                </div>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap leading-relaxed h-[240px] overflow-y-auto">
                {getCommonFreeTimeText()}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                キャンセル
              </button>
              <button onClick={handleCopyToClipboard} className={`flex items-center px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${isCopied ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                {isCopied ? <><Check className="w-4 h-4 mr-2" />コピーしました！</> : <><Copy className="w-4 h-4 mr-2" />テキストをコピー</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== モーダル：Appleライクな 予定作成 ＆ 編集 ========== */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-[#f2f2f7] rounded-xl shadow-2xl w-[480px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Apple風 ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
              <button onClick={closeEventModal} className="text-orange-500 text-base font-medium">
                キャンセル
              </button>
              <h2 className="text-base font-semibold text-gray-900">
                {editingEventId ? "詳細" : "新規イベント"}
              </h2>
              {editingEventIsGoogle ? (
                <div className="w-16"></div> /* Googleの場合は完了ボタンを非表示 */
              ) : (
                <button onClick={handleCreateEvent} className="text-orange-500 text-base font-semibold">
                  {editingEventId ? "完了" : "追加"}
                </button>
              )}
            </div>
            
            {/* Apple風 フォームボディ（グレー背景） */}
            <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">
              
              {/* タイトル入力（白角丸） */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <input 
                  type="text" 
                  required 
                  disabled={editingEventIsGoogle}
                  value={newEventTitle} 
                  onChange={(e) => setNewEventTitle(e.target.value)} 
                  placeholder="タイトル" 
                  className="w-full px-4 py-3 text-lg outline-none text-gray-900 placeholder-gray-400 disabled:bg-white disabled:text-gray-500" 
                />
              </div>

              {/* 時間設定（白角丸のリスト） */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden text-base">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <span className="text-gray-900">日付</span>
                  <select 
                    disabled={editingEventIsGoogle}
                    value={newEventDayIndex} 
                    onChange={(e) => setNewEventDayIndex(Number(e.target.value))} 
                    className="bg-transparent text-gray-500 outline-none text-right appearance-none disabled:opacity-80"
                  >
                    {days.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <span className="text-gray-900">開始</span>
                  <select 
                    disabled={editingEventIsGoogle}
                    value={newEventStartHour} 
                    onChange={(e) => setNewEventStartHour(Number(e.target.value))} 
                    className="bg-transparent text-gray-500 outline-none text-right appearance-none disabled:opacity-80"
                  >
                    {hours.map((hour, idx) => <option key={idx} value={idx}>{hour}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-900">所要時間</span>
                  <select 
                    disabled={editingEventIsGoogle}
                    value={newEventDuration} 
                    onChange={(e) => setNewEventDuration(Number(e.target.value))} 
                    className="bg-transparent text-gray-500 outline-none text-right appearance-none disabled:opacity-80"
                  >
                    <option value={0.5}>30分</option><option value={1}>1時間</option>
                    <option value={1.5}>1時間30分</option><option value={2}>2時間</option>
                    <option value={3}>3時間</option>
                  </select>
                </div>
              </div>

              {/* カレンダー選択（白角丸） */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden text-base">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-900">カレンダー</span>
                  <select 
                    disabled={editingEventIsGoogle}
                    value={newEventMemberId} 
                    onChange={(e) => setNewEventMemberId(e.target.value)} 
                    className="w-32 bg-transparent text-gray-500 outline-none text-right truncate appearance-none disabled:opacity-80"
                  >
                    {members.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                </div>
              </div>

              {/* Apple風 削除ボタン（編集時のみ、かつGoogle以外） */}
              {editingEventId && !editingEventIsGoogle && (
                <button 
                  onClick={() => handleDeleteEvent(editingEventId, false)} 
                  className="w-full bg-white rounded-xl py-3 text-red-500 font-semibold shadow-sm text-center"
                >
                  予定を削除
                </button>
              )}

              {/* Google予定の注意書き */}
              {editingEventId && editingEventIsGoogle && (
                <p className="text-xs text-center text-gray-400 mt-4 px-4">
                  Googleカレンダーの予定は、Googleカレンダーアプリ側で編集・削除してください。
                </p>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}