"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalendarIcon,
  Users,
  CheckSquare,
  Clock,
  Search,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Play,
  Square,
  Check,
  X,
  Copy,
  Link as LinkIcon,
  LogOut,
  RefreshCw
} from "lucide-react";

export default function CalendarDashboard() {
  const { data: session, status } = useSession();

  // === 状態管理（State） ===
  const [activeTab, setActiveTab] = useState<"todo" | "time">("todo");
  
  // 動的メンバー（Googleカレンダー一覧）
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  // モーダル等
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // トラッキング
  const [isTracking, setIsTracking] = useState(false);
  const [trackedSeconds, setTrackedSeconds] = useState(0);
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);

  // 予定作成フォーム
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMemberId, setNewEventMemberId] = useState<string>("");
  const [newEventDayIndex, setNewEventDayIndex] = useState(0);
  const [newEventStartHour, setNewEventStartHour] = useState(0);
  const [newEventDuration, setNewEventDuration] = useState(1);

  // タスク追加フォーム (新規追加)
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");

  // 同期・ローディング状態
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // データ
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);

  // === 日付の自動計算 (新規追加) ===
  const { currentWeekDays, currentMonthYear, todayDate } = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0(日)〜6(土)
    // 月曜日を起点にするための差分を計算
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const weekDays = [];
    const dayNames = ["月", "火", "水", "木", "金"];
    
    // 月曜から金曜までの5日間の日付文字列を作成
    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      weekDays.push(`${dayNames[i]} ${currentDate.getDate()}`);
    }
    
    return {
       currentWeekDays: weekDays,
       currentMonthYear: `${monday.getFullYear()}年 ${monday.getMonth() + 1}月`,
       todayDate: today.getDate()
    };
  }, []);

  const days = currentWeekDays;
  const hours = [
    "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // === 副作用（Effect）===

  // 初期ロード：Supabaseからデータ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      
      const { data: eventsData, error: eventsError } = await supabase.from('events').select('*');
      if (eventsError) console.error("予定の取得エラー:", eventsError);
      
      const formattedEvents = eventsData ? eventsData.map(e => ({
        id: e.id,
        memberId: e.member_id,
        title: e.title,
        dayIndex: e.day_index,
        startHour: e.start_hour,
        duration: e.duration,
        isGoogle: false
      })) : [];

      setEvents(formattedEvents);

      const { data: todosData, error: todosError } = await supabase.from('todos').select('*').order('id', { ascending: true });
      if (todosError) console.error("タスクの取得エラー:", todosError);
      if (todosData) setTodos(todosData);

      setIsLoadingData(false);
    };

    fetchData();
  }, []);

  // タイマー
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      interval = setInterval(() => {
        setTrackedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  // ==========================================
  // 🔄 Googleカレンダー同期ロジック
  // ==========================================
  const syncGoogleData = async () => {
    if (!session || !(session as any).accessToken) return;

    setIsSyncing(true);
    try {
      const token = (session as any).accessToken;

      // 1. カレンダー一覧の取得
      const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!calListRes.ok) throw new Error("カレンダーリストの取得に失敗しました");
      
      const calListData = await calListRes.json();
      let fetchedMembers: any[] = [];
      let defaultPrimaryId = "";

      if (calListData.items && calListData.items.length > 0) {
        fetchedMembers = calListData.items.map((cal: any) => {
          if (cal.primary) defaultPrimaryId = cal.id;
          return {
            id: cal.id,
            name: cal.summaryOverride || cal.summary,
            colorHex: cal.backgroundColor,
            initials: (cal.summaryOverride || cal.summary).substring(0, 2).toUpperCase(),
            primary: cal.primary || false
          };
        });

        setMembers(fetchedMembers);

        if (selectedMemberIds.length === 0) {
          setSelectedMemberIds(fetchedMembers.map(m => m.id));
          setNewEventMemberId(defaultPrimaryId || fetchedMembers[0].id);
        }
      }

      // 2. 現在の週の予定のみを取得するための期間設定
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5); // 土曜日の0時まで（金曜の終わりまで）
      saturday.setHours(0, 0, 0, 0);

      const timeMin = monday.toISOString();
      const timeMax = saturday.toISOString();

      if (fetchedMembers.length > 0) {
        let allGoogleEvents: any[] = [];

        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          if (!data.items) return [];

          return data.items.map((item: any) => {
            if (!item.start?.dateTime || !item.end?.dateTime) return null;
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);
            const dayIndex = start.getDay() - 1; 
            const startHour = start.getHours() - 9;
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            return {
              id: item.id,
              memberId: member.id,
              title: `📅 ${item.summary || "予定あり"}`,
              dayIndex,
              startHour,
              duration,
              isGoogle: true
            };
          }).filter((e: any) => e !== null && e.dayIndex >= 0 && e.dayIndex <= 4 && e.startHour >= 0 && e.startHour <= 9);
        });

        const results = await Promise.all(eventPromises);
        allGoogleEvents = results.flat();

        setEvents((prevEvents) => {
          const supabaseEvents = prevEvents.filter(p => !p.isGoogle);
          return [...supabaseEvents, ...allGoogleEvents];
        });
      }

    } catch (error) {
      console.error("同期エラー:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session) {
      syncGoogleData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);


  // === 操作関数 ===

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    );
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(members.map(m => m.id));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: number) => {
    e.dataTransfer.setData("todoId", todoId.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => {
    e.preventDefault();
    const draggedTodoId = parseInt(e.dataTransfer.getData("todoId"), 10);
    const targetTodo = todos.find((t) => t.id === draggedTodoId);
    const targetCalendarId = newEventMemberId || members[0]?.id || "";

    if (targetTodo && targetCalendarId) {
      const { data: insertedEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          member_id: targetCalendarId,
          title: targetTodo.title,
          day_index: dayIndex,
          start_hour: startHour,
          duration: 1,
        })
        .select()
        .single();

      if (insertError) {
        console.error("予定の追加エラー:", insertError);
        return;
      }

      const { error: deleteError } = await supabase.from('todos').delete().eq('id', draggedTodoId);
      if (deleteError) {
        console.error("タスクの削除エラー:", deleteError);
        return;
      }

      const newEvent = {
        id: insertedEvent.id,
        memberId: insertedEvent.member_id,
        title: insertedEvent.title,
        dayIndex: insertedEvent.day_index,
        startHour: insertedEvent.start_hour,
        duration: insertedEvent.duration,
        isGoogle: false
      };

      setEvents((prevEvents) => [...prevEvents, newEvent]);
      setTodos((prevTodos) => prevTodos.filter((t) => t.id !== draggedTodoId));

      if (!selectedMemberIds.includes(targetCalendarId)) {
        setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
      }
    }
  };

  const toggleTracking = () => {
    if (!isTracking && !activeTaskName) {
      setActiveTaskName("一般作業");
    }
    setIsTracking(!isTracking);
  };

  const startTrackingFromEvent = (eventTitle: string) => {
    setActiveTab("time");
    setActiveTaskName(eventTitle.replace("📅 ", ""));
    setIsTracking(true);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEmptySlotClick = (dayIndex: number, startHour: number) => {
    setNewEventTitle("");
    setNewEventDayIndex(dayIndex);
    setNewEventStartHour(startHour);
    setNewEventDuration(1);
    setIsCreateEventModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventMemberId) return;

    const { data, error } = await supabase
      .from('events')
      .insert({
        member_id: newEventMemberId,
        title: newEventTitle,
        day_index: newEventDayIndex,
        start_hour: newEventStartHour,
        duration: newEventDuration,
      })
      .select()
      .single();

    if (error) {
      console.error("予定作成エラー:", error);
      alert("予定の作成に失敗しました。");
      return;
    }

    const newEvent = {
      id: data.id,
      memberId: data.member_id,
      title: data.title,
      dayIndex: data.day_index,
      startHour: data.start_hour,
      duration: Number(data.duration),
      isGoogle: false
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);
    setIsCreateEventModalOpen(false);
    setNewEventTitle("");

    if (!selectedMemberIds.includes(newEventMemberId)) {
      setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
    }
  };

  // === タスク追加機能 (新規追加) ===
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { data, error } = await supabase
      .from('todos')
      .insert({
        title: newTaskTitle,
        project: newTaskProject || "一般タスク",
      })
      .select()
      .single();

    if (error) {
      console.error("タスク追加エラー:", error);
      alert("タスクの保存に失敗しました。");
      return;
    }

    setTodos([...todos, data]);
    setNewTaskTitle("");
    setNewTaskProject("");
    setIsAddingTask(false);
  };

  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = [];
    
    for (let d = 0; d < days.length; d++) {
      let blockStart = -1;

      for (let h = 0; h < hours.length; h++) {
        let isOccupied = false;
        
        for (const event of events) {
          if (selectedMemberIds.includes(event.memberId) && event.dayIndex === d) {
            if (h >= event.startHour && h < event.startHour + event.duration) {
              isOccupied = true;
              break;
            }
          }
        }

        if (!isOccupied) {
          if (blockStart === -1) blockStart = h;
        } else {
          if (blockStart !== -1) {
            const [dow, date] = days[d].split(" ");
            freeSlots.push(`・${currentMonthYear.replace("年 ", "年")}${date}日(${dow}) ${hours[blockStart]}〜${hours[h]}`);
            blockStart = -1;
          }
        }
      }
      if (blockStart !== -1) {
        const [dow, date] = days[d].split(" ");
        freeSlots.push(`・${currentMonthYear.replace("年 ", "年")}${date}日(${dow}) ${hours[blockStart]}〜19:00`);
      }
    }

    const topSlots = freeSlots.slice(0, 5).join("\n");
    
    return `お世話になっております。
次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？

${topSlots}

▼ こちらのリンクからもそのままカレンダーへの登録（日程確定）が可能です：
https://mincale.app/t/req-schedule-xyz

ご検討のほど、よろしくお願いいたします。`;
  };

  const handleCopyToClipboard = async () => {
    const textToCopy = getCommonFreeTimeText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      
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

      {/* ========== モーダル：手動予定作成 ========== */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-800">新しい予定を作成</h2>
              <button onClick={() => setIsCreateEventModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
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
                <button type="button" onClick={() => setIsCreateEventModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button>
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-sm">保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 左サイドバー ========== */}
      <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col z-10">
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <CalendarIcon className="w-6 h-6 text-orange-500 mr-2" />
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">みんカレ</h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <button 
            onClick={() => {
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
                <ChevronLeft className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800" />
                <ChevronRight className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800" />
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

        {/* ========== ユーザープロファイル＆設定エリア ========== */}
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

      {/* ========== 中央メインエリア ========== */}
      <main className="flex-1 flex flex-col min-w-0 z-0 relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-4">
            <button className="text-xl font-bold text-gray-800">{currentMonthYear}</button>
            <div className="flex items-center space-x-2 bg-gray-100 rounded-md p-1">
              <button className="px-3 py-1 text-sm bg-white rounded shadow-sm font-medium">週</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-medium">月</button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input type="text" placeholder="予定を検索、または 'Cmd+K'" className="pl-9 pr-4 py-2 w-64 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" />
            </div>
            
            <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all shadow-sm flex items-center group">
              <LinkIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-orange-500 transition-colors" />
              日程調整リンク
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto flex flex-col bg-white">
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
            <div className="w-16 flex-shrink-0"></div>
            {days.map((day, index) => (
              <div key={index} className="flex-1 py-3 text-center border-l border-gray-200">
                <span className="text-sm font-medium text-gray-600">{day}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {isLoadingData && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            )}
            {hours.map((hour, hourIndex) => (
              <div key={hourIndex} className="flex border-b border-gray-100 h-16">
                <div className="w-16 flex-shrink-0 text-right pr-2 py-2 text-xs text-gray-400">
                  {hour}
                </div>
                
                {days.map((_, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className="flex-1 border-l border-gray-100 relative group hover:bg-orange-50/50 cursor-crosshair transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dayIndex, hourIndex)}
                    onClick={() => handleEmptySlotClick(dayIndex, hourIndex)}
                  >
                    {events
                      .filter((event) => event.dayIndex === dayIndex && event.startHour === hourIndex)
                      .filter((event) => selectedMemberIds.includes(event.memberId))
                      .map((event) => {
                        const member = members.find((m) => m.id === event.memberId);
                        const heightPct = event.duration * 100;
                        const bgColor = member?.colorHex || "#f97316"; // カレンダーの色、なければオレンジ
                        
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              startTrackingFromEvent(event.title);
                            }}
                            className={`absolute w-[92%] left-[4%] rounded-md px-2 py-1.5 text-xs text-white shadow-sm overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer z-10`}
                            style={{ top: '2%', height: `calc(${heightPct}% - 4%)`, backgroundColor: bgColor }}
                            title="クリックでタイマーを開始"
                          >
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80"></span>
                              {member?.name || "カレンダー"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ========== 右サイドパネル ========== */}
      <aside className="w-80 border-l border-gray-200 bg-white flex flex-col z-10">
        <div className="flex border-b border-gray-200">
          <button onClick={() => setActiveTab("todo")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "todo" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            <CheckSquare className="w-4 h-4 mr-2" />
            ToDoリスト
          </button>
          <button onClick={() => setActiveTab("time")} className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === "time" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            <Clock className="w-4 h-4 mr-2" />
            トラッキング
            {isTracking && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto bg-gray-50 relative">
          {isLoadingData && (
             <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
             </div>
          )}
          {activeTab === "todo" ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-4 bg-white p-2 rounded border border-gray-200 shadow-sm border-l-4 border-l-orange-400">
                💡 タスクをカレンダーにドラッグして予定化できます
              </p>
              
              {!isLoadingData && todos.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  すべてのタスクが予定化されました 🎉
                </div>
              )}

              {todos.map((todo) => (
                <div key={todo.id} draggable onDragStart={(e) => handleDragStart(e, todo.id)} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                  <div className="flex justify-between items-start mb-2 pointer-events-none">
                    <h3 className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-orange-700 transition-colors">{todo.title}</h3>
                    <MoreHorizontal className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded pointer-events-none">
                    {todo.project || "一般タスク"}
                  </span>
                </div>
              ))}
              
              {/* タスク追加機能のUI切り替え */}
              {isAddingTask ? (
                <form onSubmit={handleAddTask} className="bg-white p-3 rounded-lg border border-orange-400 shadow-sm mt-4 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="タスク名を入力..."
                    className="w-full text-sm border-none focus:ring-0 p-0 mb-2 outline-none text-gray-800"
                  />
                  <input
                    type="text"
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
                    placeholder="プロジェクト名 (任意)"
                    className="w-full text-xs text-gray-500 border-none focus:ring-0 p-0 mb-3 outline-none"
                  />
                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setIsAddingTask(false)} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-2 py-1">キャンセル</button>
                    <button type="submit" className="text-xs font-medium bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600 transition-colors shadow-sm">保存する</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setIsAddingTask(true)} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center mt-4 font-medium">
                  <Plus className="w-4 h-4 mr-1" />
                  タスクを追加
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner border-4 ${isTracking ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                <Clock className={`w-10 h-10 ${isTracking ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} />
              </div>
              
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {activeTaskName || "タスクを選択、または開始"}
              </h3>
              
              <div className="text-4xl font-mono font-light text-gray-800 mb-8 tracking-wider">
                {formatTime(trackedSeconds)}
              </div>

              <p className="text-xs text-gray-500 mb-6 bg-white p-2 rounded border border-gray-200 w-full">
                カレンダーの予定ブロックをクリックすると、自動的にタイマーが開始します。
              </p>

              <button onClick={toggleTracking} className={`flex items-center justify-center w-full py-3 rounded-lg text-sm font-bold transition-all shadow-md ${isTracking ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-900 hover:bg-black text-white"}`}>
                {isTracking ? <><Square className="w-4 h-4 mr-2 fill-current" />タイマーを停止</> : <><Play className="w-4 h-4 mr-2 fill-current" />タイマーを開始</>}
              </button>
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}