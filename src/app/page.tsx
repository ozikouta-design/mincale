"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import RightPanel from "@/components/RightPanel";
import Sidebar from "@/components/Sidebar";
import CalendarMain from "@/components/CalendarMain";
import Modals from "@/components/Modals";

const GOOGLE_COLORS: Record<string, string> = {
  "1": "#a4bdfc", "2": "#7ae7bf", "3": "#dbadff", "4": "#ff887c",
  "5": "#fbd75b", "6": "#ffb878", "7": "#46d6db", "8": "#e1e1e1",
  "9": "#5484ed", "10": "#51b749", "11": "#dc2127"
};

export const getDayIndex = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return parseInt(`${y}${m}${d}`, 10);
};

export default function CalendarDashboard() {
  const { data: session, status } = useSession();

  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"todo" | "time">("todo");
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isTracking, setIsTracking] = useState(false);
  const [trackedSeconds, setTrackedSeconds] = useState(0);
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<any>(null);
  const [editingEventIsGoogle, setEditingEventIsGoogle] = useState<boolean>(false);

  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMemberId, setNewEventMemberId] = useState<string>("");
  const [newEventDayIndex, setNewEventDayIndex] = useState(0);
  const [newEventStartHour, setNewEventStartHour] = useState(0);
  const [newEventDuration, setNewEventDuration] = useState(1);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const [groups, setGroups] = useState<{id: string, name: string, memberIds: string[]}[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);

  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskProject, setEditTaskProject] = useState("");

  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  const [scrollTrigger, setScrollTrigger] = useState<{ direction: 'prev' | 'next' | 'today', timestamp: number } | null>(null);

  const { days, timeMin, timeMax, todayDate } = useMemo(() => {
    const today = new Date();
    const tempDays: any[] = [];
    const start = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), currentViewDate.getDate() - 60);
    let minDate = new Date(start);
    let maxDate = new Date(start);

    for (let i = 0; i < 120; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      tempDays.push({
        dayIndex: getDayIndex(d),
        label: `${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]} ${d.getDate()}`,
        isToday: getDayIndex(d) === getDayIndex(today),
        date: d
      });
      maxDate = d;
    }
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);
    
    return { days: tempDays, timeMin: minDate.toISOString(), timeMax: maxDate.toISOString(), todayDate: today.getDate() };
  }, [currentViewDate]);

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  useEffect(() => {
    const today = new Date();
    setCurrentMonthYear(`${today.getFullYear()}年 ${today.getMonth() + 1}月`);
    
    const fetchData = async () => {
      setIsLoadingData(true);
      // ★ 変更：Supabaseからの予定取得を完全廃止し、Googleカレンダーのみから読み込むように統一
      const { data: todosData } = await supabase.from('todos').select('*').order('id', { ascending: true });
      if (todosData) setTodos(todosData);

      const { data: groupsData } = await supabase.from('groups').select('*').order('id', { ascending: true });
      if (groupsData) {
        setGroups(groupsData.map(g => ({ id: g.id.toString(), name: g.name, memberIds: g.member_ids })));
      }
      setIsLoadingData(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) { interval = setInterval(() => setTrackedSeconds((prev) => prev + 1), 1000); }
    return () => clearInterval(interval);
  }, [isTracking]);

  const syncGoogleData = async () => {
    if (!session || !(session as any).accessToken) return;
    setIsSyncing(true);
    try {
      const token = (session as any).accessToken;
      const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers: { Authorization: `Bearer ${token}` } });
      if (!calListRes.ok) throw new Error("カレンダーリスト取得失敗");
      const calListData = await calListRes.json();
      
      let fetchedMembers: any[] = [];
      let defaultPrimaryId = "";
      if (calListData.items && calListData.items.length > 0) {
        fetchedMembers = calListData.items.map((cal: any) => {
          if (cal.primary) defaultPrimaryId = cal.id;
          return { id: cal.id, name: cal.summaryOverride || cal.summary, colorHex: cal.backgroundColor, initials: (cal.summaryOverride || cal.summary).substring(0, 2).toUpperCase(), primary: cal.primary || false };
        });
        setMembers(fetchedMembers);
        if (selectedMemberIds.length === 0) {
          setSelectedMemberIds(fetchedMembers.map(m => m.id));
          setNewEventMemberId(defaultPrimaryId || fetchedMembers[0].id);
        }
      }

      if (fetchedMembers.length > 0) {
        let allGoogleEvents: any[] = [];
        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return [];
          const data = await res.json();
          if (!data.items) return [];

          return data.items.map((item: any) => {
            if (!item.start?.dateTime || !item.end?.dateTime) return null;
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);
            
            const evDayIndex = getDayIndex(start); 
            const startHour = start.getHours() + (start.getMinutes() / 60);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            // ★ 変更：すべてGoogleの予定になったため、「📅」マークを削除
            return { 
              id: item.id, memberId: member.id, title: item.summary || "予定あり", 
              dayIndex: evDayIndex, startHour, duration, isGoogle: true,
              colorHex: item.colorId ? GOOGLE_COLORS[item.colorId] : null
            };
          }).filter((e: any) => e !== null && e.startHour >= 0 && e.startHour <= 24);
        });

        const results = await Promise.all(eventPromises);
        allGoogleEvents = results.flat();
        
        // ★ 変更：Supabaseの予定合成を廃止し、Googleの予定だけをセット
        setEvents(allGoogleEvents);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session) syncGoogleData();
  }, [status, timeMin, timeMax]);

  const handleToday = () => {
    setCurrentViewDate(new Date());
    setScrollTrigger({ direction: 'today', timestamp: Date.now() });
  };

  const handlePrev = () => {
    if (viewMode === 'week' || viewMode === 'day') {
      setScrollTrigger({ direction: 'prev', timestamp: Date.now() });
    } else {
      const newDate = new Date(currentViewDate);
      newDate.setMonth(currentViewDate.getMonth() - 1);
      setCurrentViewDate(newDate);
    }
  };
  const handleNext = () => {
    if (viewMode === 'week' || viewMode === 'day') {
      setScrollTrigger({ direction: 'next', timestamp: Date.now() });
    } else {
      const newDate = new Date(currentViewDate);
      newDate.setMonth(currentViewDate.getMonth() + 1);
      setCurrentViewDate(newDate);
    }
  };

  const openTaskEditModal = (todo: any) => {
    setEditingTaskId(todo.id); setEditTaskTitle(todo.title); setEditTaskProject(todo.project); setIsTaskEditModalOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    const { data, error } = await supabase.from('todos').update({ title: editTaskTitle, project: editTaskProject || "一般タスク" }).eq('id', editingTaskId).select().single();
    if (!error && data) {
      setTodos(todos.map(t => t.id === editingTaskId ? data : t));
      setIsTaskEditModalOpen(false); setEditingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('todos').delete().eq('id', taskId);
    if (!error) setTodos(todos.filter(t => t.id !== taskId));
  };

  const handleDeleteEvent = async (eventId: any, isGoogle: boolean, calendarId: string) => {
    if (!confirm("この予定を削除しますか？\n(Googleカレンダーからも削除されます)")) return;
    // ★ 変更：Googleカレンダーからの削除に統一
    const token = (session as any)?.accessToken;
    if (!token) return;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Google削除エラー");
      setEvents(events.filter(ev => ev.id !== eventId));
    } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    setIsCreateEventModalOpen(false); setEditingEventId(null);
  };

  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]);
  const selectAllMembers = () => setSelectedMemberIds(members.map(m => m.id));
  
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || newGroupMemberIds.length === 0) return;
    const { data, error } = await supabase.from('groups').insert({ name: newGroupName, member_ids: newGroupMemberIds }).select().single();
    if (!error && data) { setGroups([...groups, { id: data.id.toString(), name: data.name, memberIds: data.member_ids }]); } 
    setIsGroupModalOpen(false); setNewGroupName(""); setNewGroupMemberIds([]);
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('groups').delete().eq('id', parseInt(groupId, 10));
    if (!error) { setGroups(groups.filter(g => g.id !== groupId)); }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: number) => {
    e.dataTransfer.setData("type", "todo"); e.dataTransfer.setData("todoId", todoId.toString());
  };

  const handleEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => {
    e.dataTransfer.setData("type", "event"); e.dataTransfer.setData("eventId", eventId.toString()); e.dataTransfer.setData("isGoogle", isGoogle.toString()); e.dataTransfer.setData("memberId", memberId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");

    if (dragType === "todo") {
      const draggedTodoId = parseInt(e.dataTransfer.getData("todoId"), 10);
      const targetTodo = todos.find((t) => t.id === draggedTodoId);
      const targetCalendarId = newEventMemberId || members[0]?.id || "";
      if (targetTodo && targetCalendarId) {
        // ★ 変更：タスクからのドラッグ＆ドロップもGoogleに直接作成する
        const token = (session as any)?.accessToken;
        if (!token) return;

        const h = Math.floor(startHour);
        const m = Math.round((startHour % 1) * 60);
        const y = Math.floor(dayIndex / 10000);
        const mo = Math.floor((dayIndex % 10000) / 100) - 1;
        const d = dayIndex % 100;
        const startDt = new Date(y, mo, d);
        startDt.setHours(h, m, 0, 0); 
        const endDt = new Date(startDt.getTime() + 1 * 60 * 60 * 1000); 
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: targetTodo.title, start: { dateTime: startDt.toISOString(), timeZone }, end: { dateTime: endDt.toISOString(), timeZone } })
          });
          if (!res.ok) throw new Error("Google作成エラー");
          const createdEvent = await res.json();

          await supabase.from('todos').delete().eq('id', draggedTodoId);
          setEvents((prev) => [...prev, { id: createdEvent.id, memberId: targetCalendarId, title: targetTodo.title, dayIndex: dayIndex, startHour: startHour, duration: 1, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null }]);
          setTodos((prev) => prev.filter((t) => t.id !== draggedTodoId));
          if (!selectedMemberIds.includes(targetCalendarId)) setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
        } catch(e) {
          alert("Googleへの予定の作成に失敗しました。");
        }
      }
    } else if (dragType === "event") {
      const eventId = e.dataTransfer.getData("eventId"); 
      const memberId = e.dataTransfer.getData("memberId");
      const targetEvent = events.find(ev => ev.id == eventId);
      if (!targetEvent) return;

      const h = Math.floor(startHour);
      const m = Math.round((startHour % 1) * 60);
      const y = Math.floor(dayIndex / 10000);
      const mo = Math.floor((dayIndex % 10000) / 100) - 1;
      const d = dayIndex % 100;
      const startDt = new Date(y, mo, d);
      startDt.setHours(h, m, 0, 0); 
      const endDt = new Date(startDt.getTime() + targetEvent.duration * 60 * 60 * 1000); 
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 

      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        // ★ 変更：予定の移動もGoogleへのPATCHに一本化
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: { dateTime: startDt.toISOString(), timeZone }, end: { dateTime: endDt.toISOString(), timeZone } })
        });
        if (!res.ok) throw new Error("Google更新エラー");
        setEvents(prev => prev.map(ev => ev.id == eventId ? { ...ev, dayIndex, startHour } : ev));
      } catch (error: any) { alert("Googleの予定の移動に失敗しました。"); }
    }
  };

  const toggleTracking = () => {
    if (!isTracking && !activeTaskName) setActiveTaskName("一般作業");
    setIsTracking(!isTracking);
  };
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600); const mins = Math.floor((totalSeconds % 3600) / 60); const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRangeSelect = (dayIndex: number, startHour: number, duration: number) => {
    setEditingEventId(null); 
    setEditingEventIsGoogle(false);
    setNewEventTitle("");
    setNewEventDayIndex(dayIndex);
    setNewEventStartHour(startHour);
    setNewEventDuration(duration);
    setIsCreateEventModalOpen(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingEventId(event.id); setEditingEventIsGoogle(event.isGoogle);
    // 「📅 」を外す処理も不要になったため、そのまま代入
    setNewEventTitle(event.title); setNewEventMemberId(event.memberId);
    setNewEventDayIndex(event.dayIndex); setNewEventStartHour(event.startHour); setNewEventDuration(event.duration);
    setIsCreateEventModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventMemberId) return;
    
    const y = Math.floor(newEventDayIndex / 10000);
    const m = Math.floor((newEventDayIndex % 10000) / 100) - 1;
    const d = newEventDayIndex % 100;
    const startDt = new Date(y, m, d);
    
    const h = Math.floor(newEventStartHour);
    const min = Math.round((newEventStartHour % 1) * 60);
    startDt.setHours(h, min, 0, 0); 
    
    const endDt = new Date(startDt.getTime() + newEventDuration * 60 * 60 * 1000); 
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const token = (session as any)?.accessToken;
    if (!token) {
      alert("Googleカレンダーにアクセスできません。再度ログインしてください。");
      return;
    }

    if (editingEventId) {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: newEventTitle, start: { dateTime: startDt.toISOString(), timeZone }, end: { dateTime: endDt.toISOString(), timeZone } })
        });
        if (!res.ok) throw new Error("更新失敗");
        setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? { ...ev, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration } : ev));
      } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    } else {
      // ★ 変更：新規作成時、Google APIへのPOSTのみを実行し、Supabaseには保存しない
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: newEventTitle, start: { dateTime: startDt.toISOString(), timeZone }, end: { dateTime: endDt.toISOString(), timeZone } })
        });
        if (!res.ok) throw new Error("作成失敗");
        const createdEvent = await res.json();
        setEvents((prevEvents) => [...prevEvents, { id: createdEvent.id, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null }]);
      } catch (e) {
        alert("権限エラー：Googleカレンダーへの追加に失敗しました。");
      }
    }
    setIsCreateEventModalOpen(false); setEditingEventId(null); setNewEventTitle("");
    if (!selectedMemberIds.includes(newEventMemberId)) setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newTaskTitle.trim()) return;
    const { data, error } = await supabase.from('todos').insert({ title: newTaskTitle, project: newTaskProject || "一般タスク" }).select().single();
    if (!error) setTodos([...todos, data]);
    setNewTaskTitle(""); setNewTaskProject(""); setIsAddingTask(false);
  };

  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = [];
    const visibleDays = days.filter(d => d.dayIndex >= getDayIndex(new Date())).slice(0, 10);
    
    for (let d = 0; d < visibleDays.length; d++) {
      let blockStart = -1;
      for (let h = 0; h < hours.length; h++) {
        let isOccupied = false;
        for (const event of events) {
          if (selectedMemberIds.includes(event.memberId) && event.dayIndex === visibleDays[d].dayIndex) {
            if (h >= event.startHour && h < event.startHour + event.duration) { isOccupied = true; break; }
          }
        }
        if (!isOccupied) { if (blockStart === -1) blockStart = h; } else {
          if (blockStart !== -1) {
            freeSlots.push(`・${visibleDays[d].label} ${hours[blockStart]}〜${hours[h]}`);
            blockStart = -1;
          }
        }
      }
      if (blockStart !== -1) {
        freeSlots.push(`・${visibleDays[d].label} ${hours[blockStart]}〜23:00`);
      }
    }
    return `お世話になっております。\n次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？\n\n${freeSlots.slice(0, 5).join("\n")}\n\n▼ こちらのリンクからもそのままカレンダーへの登録（日程確定）が可能です：\nhttps://mincale.app/t/req-schedule-xyz\n\nご検討のほど、よろしくお願いいたします。`;
  };

  const handleCopyToClipboard = async () => { try { await navigator.clipboard.writeText(getCommonFreeTimeText()); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) {} };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      <Modals 
        isScheduleModalOpen={isScheduleModalOpen} setIsScheduleModalOpen={setIsScheduleModalOpen} getCommonFreeTimeText={getCommonFreeTimeText} handleCopyToClipboard={handleCopyToClipboard} isCopied={isCopied} isCreateEventModalOpen={isCreateEventModalOpen} setIsCreateEventModalOpen={setIsCreateEventModalOpen} handleCreateEvent={handleCreateEvent} newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle} newEventMemberId={newEventMemberId} setNewEventMemberId={setNewEventMemberId} members={members} newEventDayIndex={newEventDayIndex} setNewEventDayIndex={setNewEventDayIndex} days={days} newEventStartHour={newEventStartHour} setNewEventStartHour={setNewEventStartHour} hours={hours} newEventDuration={newEventDuration} setNewEventDuration={setNewEventDuration} editingEventId={editingEventId} setEditingEventId={setEditingEventId} editingEventIsGoogle={editingEventIsGoogle} handleDeleteEvent={handleDeleteEvent} isGroupModalOpen={isGroupModalOpen} setIsGroupModalOpen={setIsGroupModalOpen} newGroupName={newGroupName} setNewGroupName={setNewGroupName} newGroupMemberIds={newGroupMemberIds} setNewGroupMemberIds={setNewGroupMemberIds} handleSaveGroup={handleSaveGroup}
        isTaskEditModalOpen={isTaskEditModalOpen} setIsTaskEditModalOpen={setIsTaskEditModalOpen} editTaskTitle={editTaskTitle} setEditTaskTitle={setEditTaskTitle} editTaskProject={editTaskProject} setEditTaskProject={setEditTaskProject} handleUpdateTask={handleUpdateTask}
      />
      
      <Sidebar 
        currentMonthYear={currentMonthYear} todayDate={todayDate} setNewEventTitle={setNewEventTitle} setNewEventDayIndex={setNewEventDayIndex} setNewEventStartHour={setNewEventStartHour} setNewEventDuration={setNewEventDuration} setIsCreateEventModalOpen={setIsCreateEventModalOpen} selectAllMembers={selectAllMembers} members={members} isLoadingData={isLoadingData} selectedMemberIds={selectedMemberIds} toggleMember={toggleMember} status={status} session={session} syncGoogleData={syncGoogleData} isSyncing={isSyncing} signIn={signIn} signOut={signOut} handlePrevWeek={handlePrev} handleNextWeek={handleNext} setEditingEventId={setEditingEventId} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} groups={groups} setIsGroupModalOpen={setIsGroupModalOpen} setSelectedMemberIds={setSelectedMemberIds} handleDeleteGroup={handleDeleteGroup} 
      />
      
      <CalendarMain
        currentMonthYear={currentMonthYear} setCurrentMonthYear={setCurrentMonthYear} currentViewDate={currentViewDate} viewMode={viewMode} setViewMode={setViewMode} scrollTrigger={scrollTrigger} days={days} hours={hours} isLoadingData={isLoadingData} events={events} selectedMemberIds={selectedMemberIds} members={members} handleDragOver={handleDragOver} handleDrop={handleDrop} handleRangeSelect={handleRangeSelect} setIsScheduleModalOpen={setIsScheduleModalOpen} handlePrevWeek={handlePrev} handleNextWeek={handleNext} handleEventClick={handleEventClick} handleEventDragStart={handleEventDragStart} setIsSidebarOpen={setIsSidebarOpen} setIsRightPanelOpen={setIsRightPanelOpen}
        handleToday={handleToday}
      />
      
      <RightPanel 
        activeTab={activeTab} setActiveTab={setActiveTab} isLoadingData={isLoadingData} todos={todos} handleDragStart={handleDragStart} isAddingTask={isAddingTask} setIsAddingTask={setIsAddingTask} newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle} newTaskProject={newTaskProject} setNewTaskProject={setNewTaskProject} handleAddTask={handleAddTask} isTracking={isTracking} activeTaskName={activeTaskName} trackedSeconds={trackedSeconds} formatTime={formatTime} toggleTracking={toggleTracking} handleDeleteTask={handleDeleteTask} isRightPanelOpen={isRightPanelOpen} setIsRightPanelOpen={setIsRightPanelOpen} openTaskEditModal={openTaskEditModal} 
      />
    </div>
  );
}