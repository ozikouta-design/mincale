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
  handleCreateEvent: (e: React.FormEvent) => void;
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
  editingEventId: number | null; // ★ 追加
  setEditingEventId: (id: number | null) => void; // ★ 追加
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
  editingEventId, // ★ 追加
  setEditingEventId // ★ 追加
}: ModalsProps) {

  // ★ 追加：モーダルを閉じる時に編集状態もリセットする
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

      {/* ========== モーダル：手動予定作成 ＆ 編集 ========== */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-800">
                {editingEventId ? "予定の編集" : "新しい予定を作成"} {/* ★ 文言切り替え */}
              </h2>
              <button onClick={closeEventModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input type="text" required value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="例：チームミーティング" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">保存先カレンダー</label>
                <select value={newEventMemberId} onChange={(e) => setNewEventMemberId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                  <select value={newEventDayIndex} onChange={(e) => setNewEventDayIndex(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                    {days.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                  <select value={newEventStartHour} onChange={(e) => setNewEventStartHour(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                    {hours.map((hour, idx) => <option key={idx} value={idx}>{hour}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所要時間</label>
                <select value={newEventDuration} onChange={(e) => setNewEventDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                  <option value={0.5}>30分</option>
                  <option value={1}>1時間</option>
                  <option value={1.5}>1時間30分</option>
                  <option value={2}>2時間</option>
                  <option value={3}>3時間</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeEventModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                  キャンセル
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-sm">
                  {editingEventId ? "更新する" : "保存する"} {/* ★ 文言切り替え */}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}