import React, { useState } from "react";
import { X, ListTodo, Settings, Plus, GripVertical, CheckCircle2, Circle, Trash2, Pencil, Folder, Calendar as CalendarIcon, Save } from "lucide-react";

interface RightPanelProps {
  isRightPanelOpen: boolean; setIsRightPanelOpen: (isOpen: boolean) => void;
  activeTab: "todo" | "settings"; setActiveTab: (tab: "todo" | "settings") => void;
  todos: any[]; isAddingTask: boolean; setIsAddingTask: (isAdding: boolean) => void;
  newTaskTitle: string; setNewTaskTitle: (title: string) => void;
  newTaskProject: string; setNewTaskProject: (project: string) => void;
  newTaskDueDate: string; setNewTaskDueDate: (date: string) => void; 
  handleAddTask: (e: React.FormEvent) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, todoId: number) => void;
  openTaskEditModal: (todo: any) => void;
  handleInlineUpdateTask: (taskId: number, title: string, project: string, dueDate: string) => void; 
  handleToggleTodo: (taskId: number, currentStatus: boolean, e: React.MouseEvent) => void;
  handleDeleteTask: (taskId: number, e: React.MouseEvent) => void;
  accentColor: string;
  // ★ 修正：タイトルPropsを追加
  bookingTitle: string; setBookingTitle: (v: string) => void;
  bookingDuration: number; setBookingDuration: (v: number) => void;
  bookingStartHour: number; setBookingStartHour: (v: number) => void;
  bookingEndHour: number; setBookingEndHour: (v: number) => void;
  bookingDays: number[]; setBookingDays: (v: number[]) => void;
  bookingLeadTime: number; setBookingLeadTime: (v: number) => void;
  weekStartDay: number; setWeekStartDay: (v: number) => void;
  handleSaveBookingSettings: () => void;
}

export default function RightPanel({
  isRightPanelOpen, setIsRightPanelOpen, activeTab, setActiveTab,
  todos, isAddingTask, setIsAddingTask, newTaskTitle, setNewTaskTitle, newTaskProject, setNewTaskProject, newTaskDueDate, setNewTaskDueDate, handleAddTask, handleDragStart, openTaskEditModal, handleInlineUpdateTask, handleToggleTodo, handleDeleteTask, accentColor,
  bookingTitle, setBookingTitle, // ★ 追加
  bookingDuration, setBookingDuration, bookingStartHour, setBookingStartHour, bookingEndHour, setBookingEndHour, bookingDays, setBookingDays, bookingLeadTime, setBookingLeadTime, weekStartDay, setWeekStartDay, handleSaveBookingSettings
}: RightPanelProps) {

  const incompleteTodos = todos.filter(t => !t.is_completed);
  const completedTodos = todos.filter(t => t.is_completed);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const startInlineEdit = (todo: any) => { setEditingId(todo.id); setEditTitle(todo.title); setEditProject(todo.project || ""); setEditDueDate(todo.due_date || ""); };
  const saveInlineEdit = () => { if (!editTitle.trim()) return; handleInlineUpdateTask(editingId as number, editTitle, editProject, editDueDate); setEditingId(null); };

  const getDaysLeft = (dueDateStr: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr); due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "期限切れ", color: "text-red-600 bg-red-50 border-red-100" };
    if (diffDays === 0) return { text: "今日まで", color: "text-orange-600 bg-orange-50 border-orange-100" };
    if (diffDays <= 3) return { text: `あと${diffDays}日`, color: "text-amber-600 bg-amber-50 border-amber-100" };
    return { text: `あと${diffDays}日`, color: "text-blue-600 bg-blue-50 border-blue-100" };
  };

  return (
    <aside className={`fixed md:relative z-40 inset-y-0 right-0 h-full flex-shrink-0 bg-[#f8f9fa] border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none ${isRightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full overflow-hidden border-none"}`}>
      
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab("todo")} className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "todo" ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={activeTab === "todo" ? { color: accentColor } : {}}>
              <ListTodo className="w-4 h-4 mr-1.5" />ToDo
            </button>
            <button onClick={() => setActiveTab("settings")} className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "settings" ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={activeTab === "settings" ? { color: accentColor } : {}}>
              <Settings className="w-4 h-4 mr-1.5" />設定
            </button>
          </div>
          <button onClick={() => setIsRightPanelOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors" title="閉じる"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "todo" && (
          <div className="space-y-6">
            <div>
              {!isAddingTask ? (
                <button onClick={() => setIsAddingTask(true)} className="w-full flex items-center justify-center py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"><Plus className="w-4 h-4 mr-1.5" />タスクを追加</button>
              ) : (
                <form onSubmit={handleAddTask} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input type="text" autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="タスクを入力..." className="w-full text-sm font-bold text-gray-800 placeholder-gray-400 outline-none mb-3" />
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 flex items-center bg-gray-50 rounded-lg p-2 border border-gray-100 focus-within:border-blue-300 transition-colors"><Folder className="w-4 h-4 text-gray-400 mr-2 shrink-0" /><input type="text" value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)} placeholder="プロジェクト" className="w-full text-xs bg-transparent outline-none text-gray-700" /></div>
                    <div className="flex-1 flex items-center bg-gray-50 rounded-lg p-2 border border-gray-100 focus-within:border-blue-300 transition-colors"><CalendarIcon className="w-4 h-4 text-gray-400 mr-2 shrink-0" /><input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="w-full text-xs bg-transparent outline-none text-gray-700 cursor-pointer" /></div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">キャンセル</button>
                    <button type="submit" disabled={!newTaskTitle.trim()} className="px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm disabled:opacity-50 transition-colors" style={{ backgroundColor: accentColor }}>追加</button>
                  </div>
                </form>
              )}
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-500 tracking-wider flex items-center justify-between">未完了 <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{incompleteTodos.length}</span></h3>
              {incompleteTodos.map(todo => {
                const daysLeft = getDaysLeft(todo.due_date);
                return editingId === todo.id ? (
                  <div key={todo.id} className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 w-full animate-in fade-in duration-200 shadow-inner">
                    <input type="text" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-sm font-bold bg-white border border-gray-200 p-2 rounded-lg outline-none focus:border-blue-400 mb-2 shadow-sm" placeholder="タスク名" />
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm"><Folder className="w-3.5 h-3.5 text-gray-400 mx-1 shrink-0" /><input type="text" value={editProject} onChange={(e) => setEditProject(e.target.value)} placeholder="プロジェクト" className="w-full text-xs outline-none text-gray-700" /></div>
                      <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm"><CalendarIcon className="w-3.5 h-3.5 text-gray-400 mx-1 shrink-0" /><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full text-xs outline-none text-gray-700" /></div>
                    </div>
                    <div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button><button onClick={saveInlineEdit} disabled={!editTitle.trim()} className="px-4 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-50 shadow-sm transition-all hover:brightness-110" style={{ backgroundColor: accentColor }}>保存</button></div>
                  </div>
                ) : (
                  <div key={todo.id} draggable onDragStart={(e) => handleDragStart(e, todo.id)} className="group bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing flex gap-3 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accentColor }}></div>
                    <div className="flex flex-col items-center mt-0.5 shrink-0"><button onClick={(e) => handleToggleTodo(todo.id, todo.is_completed, e)} className="text-gray-300 hover:text-blue-500 transition-colors"><Circle className="w-5 h-5" /></button><GripVertical className="w-4 h-4 text-gray-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800 break-words leading-snug">{todo.title}</p><div className="flex items-center gap-2 mt-2 flex-wrap">{todo.project && <span className="text-[10px] text-gray-500 flex items-center bg-gray-100 px-1.5 py-0.5 rounded"><Folder className="w-3 h-3 mr-1" />{todo.project}</span>}{daysLeft && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${daysLeft.color}`}>{daysLeft.text}</span>}</div></div>
                    <div className="flex flex-col items-end space-y-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><button onClick={() => startInlineEdit(todo)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Pencil className="w-3.5 h-3.5" /></button><button onClick={(e) => handleDeleteTask(todo.id, e)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                );
              })}
            </div>

            {completedTodos.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-gray-200">
                <h3 className="text-xs font-bold text-gray-400 tracking-wider flex items-center justify-between">完了済み <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{completedTodos.length}</span></h3>
                {completedTodos.map(todo => (
                  <div key={todo.id} className="group bg-gray-50 rounded-xl p-3 border border-gray-100 flex gap-3 opacity-70 hover:opacity-100 transition-all">
                    <button onClick={(e) => handleToggleTodo(todo.id, todo.is_completed, e)} className="text-green-500 mt-0.5 shrink-0"><CheckCircle2 className="w-5 h-5" /></button>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-500 line-through break-words leading-snug">{todo.title}</p><div className="flex items-center gap-2 mt-1.5 flex-wrap">{todo.project && <span className="text-[10px] text-gray-400 flex items-center"><Folder className="w-3 h-3 mr-1" />{todo.project}</span>}</div></div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><button onClick={(e) => handleDeleteTask(todo.id, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 pb-8">
            <div>
              <h3 className="text-sm font-black text-gray-800 mb-4 border-b border-gray-200 pb-2">表示設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">週の始まり</label>
                  <select value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))} className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors shadow-sm">
                    <option value={0}>日曜日</option><option value={1}>月曜日</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-gray-800 mb-4 border-b border-gray-200 pb-2">公開予約ページの設定</h3>
              <div className="space-y-4">
                {/* ★ 修正：タイトル入力を追加 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">予約ページのタイトル</label>
                  <input type="text" value={bookingTitle} onChange={(e) => setBookingTitle(e.target.value)} placeholder="例: ミーティングの予約" className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors shadow-sm" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">1枠の所要時間 (分)</label>
                  <select value={bookingDuration} onChange={(e) => setBookingDuration(Number(e.target.value))} className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors shadow-sm">
                    <option value={15}>15分</option><option value={30}>30分</option><option value={45}>45分</option><option value={60}>60分</option><option value={90}>90分</option><option value={120}>120分</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">受付開始時間</label>
                    <select value={bookingStartHour} onChange={(e) => setBookingStartHour(Number(e.target.value))} className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 shadow-sm">
                      {Array.from({ length: 24 }).map((_, i) => ( <option key={i} value={i}>{`${i}:00`}</option> ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">受付終了時間</label>
                    <select value={bookingEndHour} onChange={(e) => setBookingEndHour(Number(e.target.value))} className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 shadow-sm">
                      {Array.from({ length: 24 }).map((_, i) => ( <option key={i} value={i}>{`${i}:00`}</option> ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">受付する曜日</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ label: "日", val: 0 }, { label: "月", val: 1 }, { label: "火", val: 2 }, { label: "水", val: 3 }, { label: "木", val: 4 }, { label: "金", val: 5 }, { label: "土", val: 6 }].map((day) => (
                      <button key={day.val} onClick={() => { if (bookingDays.includes(day.val)) setBookingDays(bookingDays.filter(d => d !== day.val)); else setBookingDays([...bookingDays, day.val].sort()); }}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all shadow-sm ${bookingDays.includes(day.val) ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`} style={bookingDays.includes(day.val) ? { backgroundColor: accentColor } : {}}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">予約の締め切り</label>
                  <select value={bookingLeadTime} onChange={(e) => setBookingLeadTime(Number(e.target.value))} className="w-full bg-white border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors shadow-sm">
                    <option value={1}>1時間前まで</option><option value={12}>12時間前まで</option><option value={24}>1日前（24h）まで</option><option value={48}>2日前まで</option><option value={168}>1週間前まで</option>
                  </select>
                </div>
                <button onClick={handleSaveBookingSettings} className="w-full flex items-center justify-center py-3 mt-4 text-sm font-bold text-white rounded-xl shadow-sm hover:brightness-110 transition-all" style={{ backgroundColor: accentColor }}>
                  <Save className="w-4 h-4 mr-2" />設定を保存する
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}