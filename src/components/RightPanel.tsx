import React from "react";
import { CheckSquare, Clock, Plus, Play, Square, Trash2, X, Pencil } from "lucide-react";

interface RightPanelProps {
  activeTab: "todo" | "time"; setActiveTab: (tab: "todo" | "time") => void; isLoadingData: boolean; todos: any[];
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, todoId: number) => void; isAddingTask: boolean; setIsAddingTask: (isAdding: boolean) => void;
  newTaskTitle: string; setNewTaskTitle: (title: string) => void; newTaskProject: string; setNewTaskProject: (project: string) => void;
  handleAddTask: (e: React.FormEvent) => void; isTracking: boolean; activeTaskName: string | null; trackedSeconds: number;
  formatTime: (seconds: number) => string; toggleTracking: () => void; handleDeleteTask: (taskId: number, e: React.MouseEvent) => void;
  isRightPanelOpen: boolean; setIsRightPanelOpen: (isOpen: boolean) => void; openTaskEditModal: (todo: any) => void;
}

export default function RightPanel({
  activeTab, setActiveTab, isLoadingData, todos, handleDragStart, isAddingTask, setIsAddingTask, newTaskTitle, setNewTaskTitle, newTaskProject, setNewTaskProject,
  handleAddTask, isTracking, activeTaskName, trackedSeconds, formatTime, toggleTracking, handleDeleteTask, isRightPanelOpen, setIsRightPanelOpen, openTaskEditModal
}: RightPanelProps) {
  return (
    // ★ 変更：isRightPanelOpen が false の場合、w-0 にして完全に隠す
    <aside className={`flex-shrink-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-10 ${isRightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full overflow-hidden border-none"}`}>
      <div className="flex items-center justify-between border-b border-gray-200 min-h-[64px]">
        {/* ★ 変更：PC・スマホ問わず、いつでも閉じるボタン（X）を表示 */}
        <button onClick={() => setIsRightPanelOpen(false)} className="p-4 text-gray-500 hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-1 whitespace-nowrap pr-2">
          <button onClick={() => setActiveTab("todo")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "todo" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            <CheckSquare className="w-4 h-4 mr-2 hidden sm:block" />ToDo
          </button>
          <button onClick={() => setActiveTab("time")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "time" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            <Clock className="w-4 h-4 mr-2 hidden sm:block" />タイマー
            {isTracking && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-[#f5f5f7] relative whitespace-nowrap">
        {isLoadingData && <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f5f5f7]/80 backdrop-blur-sm"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div></div>}
        {activeTab === "todo" ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-orange-400 whitespace-normal">
              💡 タスクをカレンダーにドラッグして予定化できます
            </p>
            {!isLoadingData && todos.length === 0 && <div className="text-center py-8 text-sm text-gray-400">すべてのタスクが予定化されました 🎉</div>}
            {todos.map((todo) => (
              <div 
                key={todo.id} draggable={true} onDragStart={(e) => { e.currentTarget.style.opacity = '0.5'; handleDragStart(e, todo.id); }} onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-800 leading-tight flex-1 pr-2 truncate">{todo.title}</h3>
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openTaskEditModal(todo); }} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="編集"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDeleteTask(todo.id, e)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md pointer-events-none">{todo.project || "一般タスク"}</span>
              </div>
            ))}
            
            {isAddingTask ? (
              <form onSubmit={handleAddTask} className="bg-white p-3 rounded-xl border border-orange-400 shadow-sm mt-4 animate-in fade-in slide-in-from-top-2">
                <input type="text" autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="タスク名を入力..." className="w-full text-sm border-none focus:ring-0 p-0 mb-2 outline-none text-gray-800" />
                <input type="text" value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)} placeholder="プロジェクト名 (任意)" className="w-full text-xs text-gray-500 border-none focus:ring-0 p-0 mb-3 outline-none" />
                <div className="flex justify-end space-x-2"><button type="button" onClick={() => setIsAddingTask(false)} className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors px-2 py-1">キャンセル</button><button type="submit" className="text-xs font-medium bg-orange-500 text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors shadow-sm">保存する</button></div>
              </form>
            ) : (
              <button onClick={() => setIsAddingTask(true)} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center mt-4 font-medium"><Plus className="w-4 h-4 mr-1" />タスクを追加</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 whitespace-normal">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner border-4 ${isTracking ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}><Clock className={`w-10 h-10 ${isTracking ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} /></div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{activeTaskName || "タスクを選択、または開始"}</h3>
            <div className="text-4xl font-mono font-light text-gray-800 mb-8 tracking-wider">{formatTime(trackedSeconds)}</div>
            <p className="text-xs text-gray-500 mb-6 bg-white p-2 rounded-xl border border-gray-200 w-full shadow-sm">カレンダーの予定ブロックをクリックすると、自動的にタイマーが開始します。</p>
            <button onClick={toggleTracking} className={`flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${isTracking ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-800 hover:bg-gray-900 text-white"}`}>
              {isTracking ? <><Square className="w-4 h-4 mr-2 fill-current" />タイマーを停止</> : <><Play className="w-4 h-4 mr-2 fill-current" />タイマーを開始</>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}