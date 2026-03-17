import React from "react";
import { CheckSquare, Plus, Trash2, X, Pencil, Settings, Check } from "lucide-react";

interface RightPanelProps {
  activeTab: "todo" | "settings"; setActiveTab: (tab: "todo" | "settings") => void; isLoadingData: boolean; todos: any[]; handleDragStart: (e: React.DragEvent<HTMLDivElement>, todoId: number) => void; isAddingTask: boolean; setIsAddingTask: (isAdding: boolean) => void; newTaskTitle: string; setNewTaskTitle: (title: string) => void; newTaskProject: string; setNewTaskProject: (project: string) => void; handleAddTask: (e: React.FormEvent) => void; handleDeleteTask: (taskId: number, e: React.MouseEvent) => void; isRightPanelOpen: boolean; setIsRightPanelOpen: (isOpen: boolean) => void; openTaskEditModal: (todo: any) => void; handleToggleTodo: (taskId: number, currentStatus: boolean, e: React.MouseEvent) => void; accentColor: string; setAccentColor: (color: string) => void; hourHeight: number; setHourHeight: (height: number) => void;
  bookingDuration: number; setBookingDuration: (v: number) => void; bookingStartHour: number; setBookingStartHour: (v: number) => void; bookingEndHour: number; setBookingEndHour: (v: number) => void; bookingDays: number[]; setBookingDays: (v: number[]) => void; bookingLeadTime: number; setBookingLeadTime: (v: number) => void; weekStartDay: number; setWeekStartDay: (v: number) => void; handleSaveBookingSettings: () => void;
}

export default function RightPanel({
  activeTab, setActiveTab, isLoadingData, todos, handleDragStart, isAddingTask, setIsAddingTask, newTaskTitle, setNewTaskTitle, newTaskProject, setNewTaskProject, handleAddTask, handleDeleteTask, isRightPanelOpen, setIsRightPanelOpen, openTaskEditModal, handleToggleTodo, accentColor, setAccentColor, hourHeight, setHourHeight, bookingDuration, setBookingDuration, bookingStartHour, setBookingStartHour, bookingEndHour, setBookingEndHour, bookingDays, setBookingDays, bookingLeadTime, setBookingLeadTime, weekStartDay, setWeekStartDay, handleSaveBookingSettings
}: RightPanelProps) {
  
  const sortedTodos = [...todos].sort((a, b) => (a.is_completed === b.is_completed ? 0 : a.is_completed ? 1 : -1));

  return (
    <aside className={`fixed md:relative z-40 inset-y-0 right-0 h-full flex-shrink-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isRightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full overflow-hidden border-none"}`}>
      
      {/* ★ 右パネルのタブ横に閉じるボタンを常時表示 */}
      <div className="flex items-center justify-between border-b border-gray-200 min-h-[64px]">
        <div className="flex flex-1 whitespace-nowrap px-2 h-full">
          <button onClick={() => setActiveTab("todo")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "todo" ? "border-b-2" : "text-gray-500 hover:bg-gray-50"}`} style={activeTab === "todo" ? { color: accentColor, borderColor: accentColor } : {}}>
            <CheckSquare className="w-4 h-4 mr-2 hidden sm:block" />ToDo
          </button>
          <button onClick={() => setActiveTab("settings")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "settings" ? "border-b-2" : "text-gray-500 hover:bg-gray-50"}`} style={activeTab === "settings" ? { color: accentColor, borderColor: accentColor } : {}}>
            <Settings className="w-4 h-4 mr-2 hidden sm:block" />表示設定
          </button>
        </div>
        <button onClick={() => setIsRightPanelOpen(false)} className="p-4 text-gray-400 hover:bg-gray-100 transition-colors border-l border-gray-100" title="右パネルを閉じる"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-[#f5f5f7] relative whitespace-nowrap">
        {isLoadingData && <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f5f5f7]/80 backdrop-blur-sm"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: accentColor }}></div></div>}
        
        {activeTab === "todo" ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm border-l-4 whitespace-normal" style={{ borderLeftColor: accentColor }}>💡 タスクをカレンダーにドラッグして予定化できます</p>
            {!isLoadingData && todos.length === 0 && <div className="text-center py-8 text-sm text-gray-400">すべてのタスクが完了しました 🎉</div>}
            
            {sortedTodos.map((todo) => (
              <div key={todo.id} draggable={!todo.is_completed} onDragStart={(e) => { e.currentTarget.style.opacity = '0.5'; handleDragStart(e, todo.id); }} onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }} className={`bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group flex items-start ${todo.is_completed ? 'opacity-60 bg-gray-50' : 'cursor-grab active:cursor-grabbing'}`}>
                <button onClick={(e) => handleToggleTodo(todo.id, todo.is_completed, e)} className={`w-5 h-5 mt-0.5 mr-3 rounded border flex items-center justify-center transition-colors shrink-0 ${todo.is_completed ? 'text-white' : 'border-gray-300 hover:border-gray-400'}`} style={todo.is_completed ? { backgroundColor: accentColor, borderColor: accentColor } : {}}>
                  {todo.is_completed && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className={`text-sm font-medium leading-tight flex-1 pr-2 truncate ${todo.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{todo.title}</h3>
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openTaskEditModal(todo); }} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => handleDeleteTask(todo.id, e)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md pointer-events-none">{todo.project || "一般タスク"}</span>
                </div>
              </div>
            ))}
            
            {isAddingTask ? (
              <form onSubmit={handleAddTask} className="bg-white p-3 rounded-xl border shadow-sm mt-4 animate-in fade-in slide-in-from-top-2" style={{ borderColor: accentColor }}>
                <input type="text" autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="タスク名を入力..." className="w-full text-sm border-none focus:ring-0 p-0 mb-2 outline-none text-gray-800" />
                <input type="text" value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)} placeholder="プロジェクト名 (任意)" className="w-full text-xs text-gray-500 border-none focus:ring-0 p-0 mb-3 outline-none" />
                <div className="flex justify-end space-x-2"><button type="button" onClick={() => setIsAddingTask(false)} className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors px-2 py-1">キャンセル</button><button type="submit" className="text-xs font-medium text-white px-3 py-1.5 rounded-md transition-colors shadow-sm hover:brightness-110" style={{ backgroundColor: accentColor }}>保存する</button></div>
              </form>
            ) : (
              <button onClick={() => setIsAddingTask(true)} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-white transition-colors flex items-center justify-center mt-4 font-medium" style={{ color: accentColor }}><Plus className="w-4 h-4 mr-1" />タスクを追加</button>
            )}
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm whitespace-normal space-y-8">
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center"><span className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: accentColor }}></span>テーマカラー</h3>
              <div className="flex flex-wrap gap-3">
                {['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#3f3f46'].map(color => (
                  <button key={color} onClick={() => setAccentColor(color)} className={`w-8 h-8 rounded-full shadow-sm border-2 transition-transform ${accentColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center"><span className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: accentColor }}></span>カレンダーの表示間隔</h3>
              <div className="flex space-x-2">
                {[{label: 'スリム', val: 48}, {label: '標準', val: 64}, {label: 'ゆったり', val: 80}].map(opt => (
                  <button key={opt.val} onClick={() => setHourHeight(opt.val)} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${hourHeight === opt.val ? 'text-white' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`} style={hourHeight === opt.val ? { backgroundColor: accentColor, borderColor: accentColor } : {}}>{opt.label}</button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 mb-4 flex items-center"><span className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: accentColor }}></span>公開予約ページの設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-gray-500 font-bold mb-1">時間幅（1枠あたり）</label>
                  <select value={bookingDuration} onChange={e => setBookingDuration(Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none">
                    {Array.from({length: 8}, (_, i) => (i + 1) * 15).map(m => <option key={m} value={m}>{m}分</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-bold mb-1">予約の受付期限</label>
                  <select value={bookingLeadTime} onChange={e => setBookingLeadTime(Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none">
                    <option value={0}>直前までOK</option><option value={12}>12時間前まで</option><option value={24}>24時間前(翌日)まで</option><option value={48}>2日後以降</option><option value={72}>3日後以降</option><option value={168}>1週間後以降</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-bold mb-1">対応時間帯（開始〜終了）</label>
                  <div className="flex items-center space-x-2">
                    <select value={bookingStartHour} onChange={e => setBookingStartHour(Number(e.target.value))} className="flex-1 text-sm border border-gray-200 rounded-lg p-2 outline-none">
                      {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                    </select>
                    <span className="text-gray-400">〜</span>
                    <select value={bookingEndHour} onChange={e => setBookingEndHour(Number(e.target.value))} className="flex-1 text-sm border border-gray-200 rounded-lg p-2 outline-none">
                      {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-bold mb-1.5">対応する曜日</label>
                  <div className="flex flex-wrap gap-2">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                      <label key={i} className="flex items-center space-x-1 cursor-pointer">
                        <input type="checkbox" checked={bookingDays.includes(i)} onChange={(e) => { if (e.target.checked) setBookingDays([...bookingDays, i]); else setBookingDays(bookingDays.filter(d => d !== i)); }} className="accent-blue-500 w-4 h-4" style={{ accentColor: accentColor }} />
                        <span className="text-xs text-gray-700 pr-1">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-bold mb-1">カレンダーの週の始まり</label>
                  <select value={weekStartDay} onChange={e => setWeekStartDay(Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none">
                    <option value={0}>日曜日</option><option value={1}>月曜日</option>
                  </select>
                </div>
                <button onClick={handleSaveBookingSettings} className="w-full py-2.5 mt-2 text-white text-xs font-bold rounded-lg transition-colors shadow-sm hover:brightness-110" style={{ backgroundColor: accentColor }}>予約設定を保存する</button>
              </div>
            </div>

          </div>
        )}
      </div>
    </aside>
  );
}