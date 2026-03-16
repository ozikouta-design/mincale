"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import RightPanel from "@/components/RightPanel";
import Sidebar from "@/components/Sidebar";
import CalendarMain from "@/components/CalendarMain";
import Modals from "@/components/Modals";

export default function CalendarDashboard() {
  const { data: session, status } = useSession();

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

  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // ★ グループ管理のステート
  const [groups, setGroups] = useState<{id: string, name: string, memberIds: string[]}[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);

  const { currentWeekDays, currentMonthYear, todayDate } = useMemo(() => {
    const dayOfWeek = currentViewDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(currentViewDate);
    monday.setDate(currentViewDate.getDate() + diffToMonday);

    const weekDays = [];
    const dayNames = ["月", "火", "水", "木", "金"];
    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      weekDays.push(`${dayNames[i]} ${currentDate.getDate()}`);
    }
    const actualToday = new Date();
    const isCurrentWeek = monday.getMonth() === actualToday.getMonth() && monday.getFullYear() === actualToday.getFullYear();
    
    return {
       currentWeekDays: weekDays,
       currentMonthYear: `${monday.getFullYear()}年 ${monday.getMonth() + 1}月`,
       todayDate: isCurrentWeek ? actualToday.getDate() : -1
    };
  }, [currentViewDate]);

  const days = currentWeekDays;
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      const { data: eventsData } = await supabase.from('events').select('*');
      const formattedEvents = eventsData ? eventsData.map(e => ({
        id: e.id, memberId: e.member_id, title: e.title, dayIndex: e.day_index, startHour: e.start_hour, duration: e.duration, isGoogle: false
      })) : [];
      setEvents(formattedEvents);

      const { data: todosData } = await supabase.from('todos').select('*').order('id', { ascending: true });
      if (todosData) setTodos(todosData);

      // ★ 追加：初期ロード時にSupabaseから「グループ一覧」を取得する
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

      const dayOfWeek = currentViewDate.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(currentViewDate);
      monday.setDate(currentViewDate.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      saturday.setHours(0, 0, 0, 0);

      const timeMin = monday.toISOString();
      const timeMax = saturday.toISOString();

      if (fetchedMembers.length > 0) {
        let allGoogleEvents: any[] = [];
        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return [];
          const data = await res.json();
          if (!data.items) return [];

          return data.items.map((item: any) => {
            if (!item.start?.dateTime || !item.end?.dateTime) return null;
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);
            const evDayIndex = start.getDay() - 1; 
            const startHour = start.getHours() - 9;
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            return { id: item.id, memberId: member.id, title: `📅 ${item.summary || "予定あり"}`, dayIndex: evDayIndex, startHour, duration, isGoogle: true };
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
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session) syncGoogleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentViewDate]);

  // ★ 改善：週移動時に古いGoogle予定を一瞬で消す（ラグ解消）
  const handlePrevWeek = () => {
    setEvents(prev => prev.filter(e => !e.isGoogle));
    const newDate = new Date(currentViewDate);
    newDate.setDate(currentViewDate.getDate() - 7);
    setCurrentViewDate(newDate);
  };
  const handleNextWeek = () => {
    setEvents(prev => prev.filter(e => !e.isGoogle));
    const newDate = new Date(currentViewDate);
    newDate.setDate(currentViewDate.getDate() + 7);
    setCurrentViewDate(newDate);
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('todos').delete().eq('id', taskId);
    if (!error) setTodos(todos.filter(t => t.id !== taskId));
  };

  const handleDeleteEvent = async (eventId: any, isGoogle: boolean, calendarId: string) => {
    if (!confirm("この予定を削除しますか？\n(Googleカレンダーからも削除されます)")) return;
    if (isGoogle) {
      const token = (session as any)?.accessToken;
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Google削除エラー");
        setEvents(events.filter(ev => ev.id !== eventId));
      } catch (e) {
        alert("権限エラー：ログアウトして再度Googleでログインし直してください。");
      }
    } else {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (!error) setEvents(events.filter(ev => ev.id !== eventId));
    }
    setIsCreateEventModalOpen(false);
    setEditingEventId(null);
  };

  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]);
  const selectAllMembers = () => setSelectedMemberIds(members.map(m => m.id));
  
  // ★ 変更：グループを「Supabaseのデータベース」に保存する
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || newGroupMemberIds.length === 0) return;
    
    // DBにインサート
    const { data, error } = await supabase.from('groups').insert({ 
      name: newGroupName, 
      member_ids: newGroupMemberIds 
    }).select().single();

    if (!error && data) {
      setGroups([...groups, { id: data.id.toString(), name: data.name, memberIds: data.member_ids }]);
    } else {
      alert("グループの保存に失敗しました。");
    }
    
    setIsGroupModalOpen(false);
    setNewGroupName("");
    setNewGroupMemberIds([]);
  };

  // ★ 変更：グループを「Supabaseのデータベース」から完全に削除する
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // DBからデリート
    const { error } = await supabase.from('groups').delete().eq('id', parseInt(groupId, 10));
    
    if (!error) {
      setGroups(groups.filter(g => g.id !== groupId));
    } else {
      alert("グループの削除に失敗しました。");
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: number) => {
    e.dataTransfer.setData("type", "todo");
    e.dataTransfer.setData("todoId", todoId.toString());
  };

  const handleEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => {
    e.dataTransfer.setData("type", "event");
    e.dataTransfer.setData("eventId", eventId.toString());
    e.dataTransfer.setData("isGoogle", isGoogle.toString());
    e.dataTransfer.setData("memberId", memberId);
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
        const { data: insertedEvent, error: insertError } = await supabase.from('events').insert({ member_id: targetCalendarId, title: targetTodo.title, day_index: dayIndex, start_hour: startHour, duration: 1 }).select().single();
        if (!insertError) {
          await supabase.from('todos').delete().eq('id', draggedTodoId);
          setEvents((prev) => [...prev, { id: insertedEvent.id, memberId: insertedEvent.member_id, title: insertedEvent.title, dayIndex: insertedEvent.day_index, startHour: insertedEvent.start_hour, duration: insertedEvent.duration, isGoogle: false }]);
          setTodos((prev) => prev.filter((t) => t.id !== draggedTodoId));
          if (!selectedMemberIds.includes(targetCalendarId)) setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
        }
      }
    } else if (dragType === "event") {
      const eventId = e.dataTransfer.getData("eventId");
      const isGoogle = e.dataTransfer.getData("isGoogle") === "true";
      const memberId = e.dataTransfer.getData("memberId");

      const targetEvent = events.find(ev => ev.id == eventId);
      if (!targetEvent) return;

      if (isGoogle) {
        const token = (session as any)?.accessToken;
        const startDt = new Date(currentViewDate);
        const diff = startDt.getDay() === 0 ? -6 : 1 - startDt.getDay();
        startDt.setDate(startDt.getDate() + diff + dayIndex);
        startDt.setHours(9 + startHour, 0, 0, 0);
        const endDt = new Date(startDt.getTime() + targetEvent.duration * 60 * 60 * 1000);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 

        try {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              start: { dateTime: startDt.toISOString(), timeZone }, 
              end: { dateTime: endDt.toISOString(), timeZone } 
            })
          });
          
          if (!res.ok) {
            const errBody = await res.json();
            throw new Error(errBody.error?.message || "原因不明のエラー");
          }
          setEvents(prev => prev.map(ev => ev.id == eventId ? { ...ev, dayIndex, startHour } : ev));
        } catch (error: any) {
          console.error("Google移動エラー:", error);
          alert(`Googleの予定の移動に失敗しました。\n詳細: ${error.message}`);
        }
      } else {
        const { error } = await supabase.from('events').update({ day_index: dayIndex, start_hour: startHour }).eq('id', eventId);
        if (error) { alert("予定の移動に失敗しました。"); return; }
        setEvents(prev => prev.map(ev => ev.id == eventId ? { ...ev, dayIndex, startHour } : ev));
      }
    }
  };

  const toggleTracking = () => {
    if (!isTracking && !activeTaskName) setActiveTaskName("一般作業");
    setIsTracking(!isTracking);
  };
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEmptySlotClick = (dayIndex: number, startHour: number) => {
    setEditingEventId(null); 
    setEditingEventIsGoogle(false);
    setNewEventTitle("");
    setNewEventDayIndex(dayIndex);
    setNewEventStartHour(startHour);
    setNewEventDuration(1);
    setIsCreateEventModalOpen(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setEditingEventIsGoogle(event.isGoogle);
    setNewEventTitle(event.title.replace("📅 ", ""));
    setNewEventMemberId(event.memberId);
    setNewEventDayIndex(event.dayIndex);
    setNewEventStartHour(event.startHour);
    setNewEventDuration(event.duration);
    setIsCreateEventModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventMemberId) return;

    const startDt = new Date(currentViewDate);
    const diff = startDt.getDay() === 0 ? -6 : 1 - startDt.getDay();
    startDt.setDate(startDt.getDate() + diff + newEventDayIndex);
    startDt.setHours(9 + newEventStartHour, 0, 0, 0);
    const endDt = new Date(startDt.getTime() + newEventDuration * 60 * 60 * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (editingEventId) {
      if (editingEventIsGoogle) {
        const token = (session as any)?.accessToken;
        try {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              summary: newEventTitle, 
              start: { dateTime: startDt.toISOString(), timeZone }, 
              end: { dateTime: endDt.toISOString(), timeZone } 
            })
          });
          if (!res.ok) throw new Error("更新失敗");
          setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? { ...ev, memberId: newEventMemberId, title: `📅 ${newEventTitle}`, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration } : ev));
        } catch (e) {
          alert("権限エラー：ログアウトして再度Googleでログインし直してください。");
        }
      } else {
        const { data, error } = await supabase.from('events').update({ member_id: newEventMemberId, title: newEventTitle, day_index: newEventDayIndex, start_hour: newEventStartHour, duration: newEventDuration }).eq('id', editingEventId).select().single();
        if (!error) setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? { ...ev, memberId: data.member_id, title: data.title, dayIndex: data.day_index, startHour: data.start_hour, duration: Number(data.duration) } : ev));
      }
    } else {
      const { data, error } = await supabase.from('events').insert({ member_id: newEventMemberId, title: newEventTitle, day_index: newEventDayIndex, start_hour: newEventStartHour, duration: newEventDuration }).select().single();
      if (!error) setEvents((prevEvents) => [...prevEvents, { id: data.id, memberId: data.member_id, title: data.title, dayIndex: data.day_index, startHour: data.start_hour, duration: Number(data.duration), isGoogle: false }]);
    }

    setIsCreateEventModalOpen(false);
    setEditingEventId(null);
    setNewEventTitle("");
    if (!selectedMemberIds.includes(newEventMemberId)) setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const { data, error } = await supabase.from('todos').insert({ title: newTaskTitle, project: newTaskProject || "一般タスク" }).select().single();
    if (!error) setTodos([...todos, data]);
    setNewTaskTitle(""); setNewTaskProject(""); setIsAddingTask(false);
  };

  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = [];
    for (let d = 0; d < days.length; d++) {
      let blockStart = -1;
      for (let h = 0; h < hours.length; h++) {
        let isOccupied = false;
        for (const event of events) {
          if (selectedMemberIds.includes(event.memberId) && event.dayIndex === d) {
            if (h >= event.startHour && h < event.startHour + event.duration) { isOccupied = true; break; }
          }
        }
        if (!isOccupied) { if (blockStart === -1) blockStart = h; } else {
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
    return `お世話になっております。\n次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？\n\n${freeSlots.slice(0, 5).join("\n")}\n\n▼ こちらのリンクからもそのままカレンダーへの登録（日程確定）が可能です：\nhttps://mincale.app/t/req-schedule-xyz\n\nご検討のほど、よろしくお願いいたします。`;
  };

  const handleCopyToClipboard = async () => { try { await navigator.clipboard.writeText(getCommonFreeTimeText()); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) {} };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden font-sans relative">
      
      {(isSidebarOpen || isRightPanelOpen) && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
          onClick={() => { setIsSidebarOpen(false); setIsRightPanelOpen(false); }}
        />
      )}

      <Modals 
        isScheduleModalOpen={isScheduleModalOpen} setIsScheduleModalOpen={setIsScheduleModalOpen} getCommonFreeTimeText={getCommonFreeTimeText} handleCopyToClipboard={handleCopyToClipboard} isCopied={isCopied} isCreateEventModalOpen={isCreateEventModalOpen} setIsCreateEventModalOpen={setIsCreateEventModalOpen} handleCreateEvent={handleCreateEvent} newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle} newEventMemberId={newEventMemberId} setNewEventMemberId={setNewEventMemberId} members={members} newEventDayIndex={newEventDayIndex} setNewEventDayIndex={setNewEventDayIndex} days={days} newEventStartHour={newEventStartHour} setNewEventStartHour={setNewEventStartHour} hours={hours} newEventDuration={newEventDuration} setNewEventDuration={setNewEventDuration}
        editingEventId={editingEventId} setEditingEventId={setEditingEventId} editingEventIsGoogle={editingEventIsGoogle} handleDeleteEvent={handleDeleteEvent}
        isGroupModalOpen={isGroupModalOpen} setIsGroupModalOpen={setIsGroupModalOpen} newGroupName={newGroupName} setNewGroupName={setNewGroupName} newGroupMemberIds={newGroupMemberIds} setNewGroupMemberIds={setNewGroupMemberIds} handleSaveGroup={handleSaveGroup}
      />
      
      <Sidebar 
        currentMonthYear={currentMonthYear} todayDate={todayDate} setNewEventTitle={setNewEventTitle} setNewEventDayIndex={setNewEventDayIndex} setNewEventStartHour={setNewEventStartHour} setNewEventDuration={setNewEventDuration} setIsCreateEventModalOpen={setIsCreateEventModalOpen} selectAllMembers={selectAllMembers} members={members} isLoadingData={isLoadingData} selectedMemberIds={selectedMemberIds} toggleMember={toggleMember} status={status} session={session} syncGoogleData={syncGoogleData} isSyncing={isSyncing} signIn={signIn} signOut={signOut} handlePrevWeek={handlePrevWeek} handleNextWeek={handleNextWeek} setEditingEventId={setEditingEventId}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        groups={groups} setIsGroupModalOpen={setIsGroupModalOpen} setSelectedMemberIds={setSelectedMemberIds} handleDeleteGroup={handleDeleteGroup} 
      />
      
      <CalendarMain
        currentMonthYear={currentMonthYear} days={days} hours={hours} isLoadingData={isLoadingData} events={events} selectedMemberIds={selectedMemberIds} members={members} handleDragOver={handleDragOver} handleDrop={handleDrop} handleEmptySlotClick={handleEmptySlotClick} setIsScheduleModalOpen={setIsScheduleModalOpen} handlePrevWeek={handlePrevWeek} handleNextWeek={handleNextWeek} handleEventClick={handleEventClick} handleEventDragStart={handleEventDragStart}
        setIsSidebarOpen={setIsSidebarOpen} setIsRightPanelOpen={setIsRightPanelOpen}
      />
      
      <RightPanel 
        activeTab={activeTab} setActiveTab={setActiveTab} isLoadingData={isLoadingData} todos={todos} handleDragStart={handleDragStart} isAddingTask={isAddingTask} setIsAddingTask={setIsAddingTask} newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle} newTaskProject={newTaskProject} setNewTaskProject={setNewTaskProject} handleAddTask={handleAddTask} isTracking={isTracking} activeTaskName={activeTaskName} trackedSeconds={trackedSeconds} formatTime={formatTime} toggleTracking={toggleTracking} handleDeleteTask={handleDeleteTask}
        isRightPanelOpen={isRightPanelOpen} setIsRightPanelOpen={setIsRightPanelOpen}
      />
    </div>
  );
}