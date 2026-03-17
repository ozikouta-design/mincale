import { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";

export const GOOGLE_COLORS: Record<string, string> = {
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

export const formatLocalISO = (date: Date) => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => (num < 10 ? '0' : '') + num;
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60);
};

export function useCalendarLogic() {
  const { data: session, status } = useSession();

  // ビューとタブの状態
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"todo" | "settings">("todo");
  
  // メンバー・グループ・予定・タスクのデータ
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);

  // モーダルとUI開閉の状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

  // 新規・編集用のステート
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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskProject, setEditTaskProject] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);

  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  const [scrollTrigger, setScrollTrigger] = useState<{ direction: 'prev' | 'next' | 'today', timestamp: number } | null>(null);

  // UI/UXカスタマイズ設定
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [hourHeight, setHourHeight] = useState(64);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsSidebarOpen(true);
      setIsRightPanelOpen(true);
    }
  }, []);

  const { days, timeMin, timeMax, todayDate } = useMemo(() => {
    const today = new Date();
    const tempDays: any[] = [];
    const start = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), currentViewDate.getDate() - 60);
    let minDate = new Date(start); let maxDate = new Date(start);

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
    minDate.setHours(0, 0, 0, 0); maxDate.setHours(23, 59, 59, 999);
    
    return { days: tempDays, timeMin: minDate.toISOString(), timeMax: maxDate.toISOString(), todayDate: today.getDate() };
  }, [currentViewDate]);

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  useEffect(() => {
    const today = new Date();
    setCurrentMonthYear(`${today.getFullYear()}年 ${today.getMonth() + 1}月`);
    
    const fetchData = async () => {
      if (!session?.user?.email) return;
      setIsLoadingData(true);
      
      const { data: todosData } = await supabase.from('todos').select('*').eq('user_email', session.user.email).order('id', { ascending: true });
      if (todosData) setTodos(todosData);

      const { data: groupsData } = await supabase.from('groups').select('*').eq('user_email', session.user.email).order('id', { ascending: true });
      if (groupsData) setGroups(groupsData.map(g => ({ id: g.id.toString(), name: g.name, memberIds: g.member_ids })));
      
      setIsLoadingData(false);
    };
    fetchData();
  }, [session]);

  const syncGoogleData = async () => {
    if (!session || !(session as any).accessToken) return;
    setIsSyncing(true);
    try {
      const token = (session as any).accessToken;
      const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers: { Authorization: `Bearer ${token}` } });
      if (!calListRes.ok) throw new Error("カレンダーリスト取得失敗");
      const calListData = await calListRes.json();
      
      let fetchedMembers: any[] = []; let defaultPrimaryId = "";
      if (calListData.items && calListData.items.length > 0) {
        fetchedMembers = calListData.items.map((cal: any) => {
          if (cal.primary) defaultPrimaryId = cal.id;
          return { id: cal.id, name: cal.summaryOverride || cal.summary, colorHex: cal.backgroundColor, initials: (cal.summaryOverride || cal.summary).substring(0, 2).toUpperCase(), primary: cal.primary || false };
        });
        setMembers(fetchedMembers);
        if (selectedMemberIds.length === 0) { setSelectedMemberIds(fetchedMembers.map(m => m.id)); setNewEventMemberId(defaultPrimaryId || fetchedMembers[0].id); }
      }

      if (fetchedMembers.length > 0) {
        let allGoogleEvents: any[] = [];
        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return []; const data = await res.json(); if (!data.items) return [];
          return data.items.map((item: any) => {
            if (!item.start?.dateTime || !item.end?.dateTime) return null;
            const start = new Date(item.start.dateTime); const end = new Date(item.end.dateTime);
            const evDayIndex = getDayIndex(start); const startHour = start.getHours() + (start.getMinutes() / 60); const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return { id: item.id, memberId: member.id, title: item.summary || "予定あり", dayIndex: evDayIndex, startHour, duration, isGoogle: true, colorHex: item.colorId ? GOOGLE_COLORS[item.colorId] : null };
          }).filter((e: any) => e !== null && e.startHour >= 0 && e.startHour <= 24);
        });
        const results = await Promise.all(eventPromises);
        allGoogleEvents = results.flat(); setEvents(allGoogleEvents);
      }
    } catch (error) { console.error(error); } finally { setIsSyncing(false); }
  };

  useEffect(() => { if (status === "authenticated" && session) syncGoogleData(); }, [status, timeMin, timeMax]);

  const handleToday = () => { setCurrentViewDate(new Date()); setScrollTrigger({ direction: 'today', timestamp: Date.now() }); };
  const handlePrev = () => { if (viewMode === 'week' || viewMode === 'day') { setScrollTrigger({ direction: 'prev', timestamp: Date.now() }); } else { const newDate = new Date(currentViewDate); newDate.setMonth(currentViewDate.getMonth() - 1); setCurrentViewDate(newDate); } };
  const handleNext = () => { if (viewMode === 'week' || viewMode === 'day') { setScrollTrigger({ direction: 'next', timestamp: Date.now() }); } else { const newDate = new Date(currentViewDate); newDate.setMonth(currentViewDate.getMonth() + 1); setCurrentViewDate(newDate); } };

  const openTaskEditModal = (todo: any) => { setEditingTaskId(todo.id); setEditTaskTitle(todo.title); setEditTaskProject(todo.project); setIsTaskEditModalOpen(true); };
  const handleUpdateTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    const { data, error } = await supabase.from('todos').update({ title: editTaskTitle, project: editTaskProject || "一般タスク" }).eq('id', editingTaskId).select().single();
    if (!error && data) { setTodos(todos.map(t => t.id === editingTaskId ? data : t)); setIsTaskEditModalOpen(false); setEditingTaskId(null); }
  };
  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => { e.stopPropagation(); const { error } = await supabase.from('todos').delete().eq('id', taskId); if (!error) setTodos(todos.filter(t => t.id !== taskId)); };
  const handleToggleTodo = async (taskId: number, currentStatus: boolean, e: React.MouseEvent) => { e.stopPropagation(); const { data, error } = await supabase.from('todos').update({ is_completed: !currentStatus }).eq('id', taskId).select().single(); if (!error && data) setTodos(todos.map(t => t.id === taskId ? data : t)); };

  const handleDeleteEvent = async (eventId: any, isGoogle: boolean, calendarId: string) => {
    if (!confirm("この予定を削除しますか？\n(Googleカレンダーからも削除されます)")) return;
    const token = (session as any)?.accessToken; if (!token) return;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Google削除エラー"); setEvents(events.filter(ev => ev.id !== eventId));
    } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    setIsCreateEventModalOpen(false); setEditingEventId(null);
  };

  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]);
  const selectAllMembers = () => setSelectedMemberIds(members.map(m => m.id));
  
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || newGroupMemberIds.length === 0 || !session?.user?.email) return;
    const { data, error } = await supabase.from('groups').insert({ name: newGroupName, member_ids: newGroupMemberIds, user_email: session.user.email }).select().single();
    if (!error && data) { setGroups([...groups, { id: data.id.toString(), name: data.name, memberIds: data.member_ids }]); } 
    setIsGroupModalOpen(false); setNewGroupName(""); setNewGroupMemberIds([]);
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => { e.stopPropagation(); const { error } = await supabase.from('groups').delete().eq('id', parseInt(groupId, 10)); if (!error) { setGroups(groups.filter(g => g.id !== groupId)); } };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: number) => { e.dataTransfer.setData("type", "todo"); e.dataTransfer.setData("todoId", todoId.toString()); };
  const handleEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => { e.dataTransfer.setData("type", "event"); e.dataTransfer.setData("eventId", eventId.toString()); e.dataTransfer.setData("isGoogle", isGoogle.toString()); e.dataTransfer.setData("memberId", memberId); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => {
    e.preventDefault(); const dragType = e.dataTransfer.getData("type");
    if (dragType === "todo") {
      const draggedTodoId = parseInt(e.dataTransfer.getData("todoId"), 10); const targetTodo = todos.find((t) => t.id === draggedTodoId); const targetCalendarId = newEventMemberId || members[0]?.id || "";
      if (targetTodo && targetCalendarId) {
        const token = (session as any)?.accessToken; if (!token) return;
        const h = Math.floor(startHour); const m = Math.round((startHour % 1) * 60); const y = Math.floor(dayIndex / 10000); const mo = Math.floor((dayIndex % 10000) / 100) - 1; const d = dayIndex % 100;
        const startDt = new Date(y, mo, d); startDt.setHours(h, m, 0, 0); const endDt = new Date(startDt.getTime() + 1 * 60 * 60 * 1000); 
        try {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: targetTodo.title, start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }) });
          if (!res.ok) throw new Error("Google作成エラー"); const createdEvent = await res.json();
          await supabase.from('todos').delete().eq('id', draggedTodoId);
          setEvents((prev) => [...prev, { id: createdEvent.id, memberId: targetCalendarId, title: targetTodo.title, dayIndex: dayIndex, startHour: startHour, duration: 1, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null }]);
          setTodos((prev) => prev.filter((t) => t.id !== draggedTodoId)); if (!selectedMemberIds.includes(targetCalendarId)) setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
        } catch(e) { alert("Googleへの予定の作成に失敗しました。"); }
      }
    } else if (dragType === "event") {
      const eventId = e.dataTransfer.getData("eventId"); const memberId = e.dataTransfer.getData("memberId"); const targetEvent = events.find(ev => ev.id == eventId); if (!targetEvent) return;
      const h = Math.floor(startHour); const m = Math.round((startHour % 1) * 60); const y = Math.floor(dayIndex / 10000); const mo = Math.floor((dayIndex % 10000) / 100) - 1; const d = dayIndex % 100;
      const startDt = new Date(y, mo, d); startDt.setHours(h, m, 0, 0); const endDt = new Date(startDt.getTime() + targetEvent.duration * 60 * 60 * 1000); 
      const token = (session as any)?.accessToken; if (!token) return;
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }) });
        if (!res.ok) throw new Error("Google更新エラー"); setEvents(prev => prev.map(ev => ev.id == eventId ? { ...ev, dayIndex, startHour } : ev));
      } catch (error: any) { alert("Googleの予定の移動に失敗しました。"); }
    }
  };

  const handleRangeSelect = (dayIndex: number, startHour: number, duration: number) => { setEditingEventId(null); setEditingEventIsGoogle(false); setNewEventTitle(""); setNewEventDayIndex(dayIndex); setNewEventStartHour(startHour); setNewEventDuration(duration); setIsCreateEventModalOpen(true); };
  const handleEventClick = (event: any, e: React.MouseEvent) => { e.stopPropagation(); setEditingEventId(event.id); setEditingEventIsGoogle(event.isGoogle); setNewEventTitle(event.title); setNewEventMemberId(event.memberId); setNewEventDayIndex(event.dayIndex); setNewEventStartHour(event.startHour); setNewEventDuration(event.duration); setIsCreateEventModalOpen(true); };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventMemberId) return;
    const y = Math.floor(newEventDayIndex / 10000); const m = Math.floor((newEventDayIndex % 10000) / 100) - 1; const d = newEventDayIndex % 100;
    const startDt = new Date(y, m, d); const h = Math.floor(newEventStartHour); const min = Math.round((newEventStartHour % 1) * 60); startDt.setHours(h, min, 0, 0); 
    const endDt = new Date(startDt.getTime() + newEventDuration * 60 * 60 * 1000); 
    const token = (session as any)?.accessToken; if (!token) { alert("Googleカレンダーにアクセスできません。再度ログインしてください。"); return; }

    if (editingEventId) {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: newEventTitle, start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }) });
        if (!res.ok) throw new Error("更新失敗"); setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? { ...ev, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration } : ev));
      } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    } else {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: newEventTitle, start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }) });
        if (!res.ok) throw new Error("作成失敗"); const createdEvent = await res.json(); setEvents((prevEvents) => [...prevEvents, { id: createdEvent.id, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null }]);
      } catch (e) { alert("権限エラー：Googleカレンダーへの追加に失敗しました。"); }
    }
    setIsCreateEventModalOpen(false); setEditingEventId(null); setNewEventTitle(""); if (!selectedMemberIds.includes(newEventMemberId)) setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newTaskTitle.trim() || !session?.user?.email) return;
    const { data, error } = await supabase.from('todos').insert({ title: newTaskTitle, project: newTaskProject || "一般タスク", user_email: session.user.email }).select().single();
    if (!error) setTodos([...todos, data]); setNewTaskTitle(""); setNewTaskProject(""); setIsAddingTask(false);
  };

  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = []; const visibleDays = days.filter(d => d.dayIndex >= getDayIndex(new Date())).slice(0, 10);
    for (let d = 0; d < visibleDays.length; d++) {
      let blockStart = -1;
      for (let h = 0; h < hours.length; h++) {
        let isOccupied = false;
        for (const event of events) { if (selectedMemberIds.includes(event.memberId) && event.dayIndex === visibleDays[d].dayIndex) { if (h >= event.startHour && h < event.startHour + event.duration) { isOccupied = true; break; } } }
        if (!isOccupied) { if (blockStart === -1) blockStart = h; } else { if (blockStart !== -1) { freeSlots.push(`・${visibleDays[d].label} ${hours[blockStart]}〜${hours[h]}`); blockStart = -1; } }
      }
      if (blockStart !== -1) { freeSlots.push(`・${visibleDays[d].label} ${hours[blockStart]}〜23:00`); }
    }
    return `お世話になっております。\n次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？\n\n${freeSlots.slice(0, 5).join("\n")}\n\n▼ こちらのリンクからもそのままカレンダーへの登録（日程確定）が可能です：\nhttps://mincale.app/t/req-schedule-xyz\n\nご検討のほど、よろしくお願いいたします。`;
  };

  const handleCopyToClipboard = async () => { try { await navigator.clipboard.writeText(getCommonFreeTimeText()); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) {} };

  // 全てのStateとHandlerをまとめて返す
  return {
    session, status, signIn, signOut,
    viewMode, setViewMode, activeTab, setActiveTab,
    members, setMembers, selectedMemberIds, setSelectedMemberIds,
    groups, setGroups, events, setEvents, todos, setTodos,
    isSidebarOpen, setIsSidebarOpen, isRightPanelOpen, setIsRightPanelOpen,
    isScheduleModalOpen, setIsScheduleModalOpen, isCreateEventModalOpen, setIsCreateEventModalOpen,
    isGroupModalOpen, setIsGroupModalOpen, isTaskEditModalOpen, setIsTaskEditModalOpen,
    editingEventId, setEditingEventId, editingEventIsGoogle, setEditingEventIsGoogle,
    newEventTitle, setNewEventTitle, newEventMemberId, setNewEventMemberId,
    newEventDayIndex, setNewEventDayIndex, newEventStartHour, setNewEventStartHour,
    newEventDuration, setNewEventDuration, isAddingTask, setIsAddingTask,
    newTaskTitle, setNewTaskTitle, newTaskProject, setNewTaskProject,
    editingTaskId, setEditingTaskId, editTaskTitle, setEditTaskTitle, editTaskProject, setEditTaskProject,
    newGroupName, setNewGroupName, newGroupMemberIds, setNewGroupMemberIds,
    isCopied, setIsCopied, isSyncing, setIsSyncing, isLoadingData, setIsLoadingData,
    currentViewDate, setCurrentViewDate, currentMonthYear, setCurrentMonthYear,
    scrollTrigger, setScrollTrigger, accentColor, setAccentColor, hourHeight, setHourHeight,
    days, timeMin, timeMax, todayDate, hours,
    syncGoogleData, handleToday, handlePrevWeek: handlePrev, handleNextWeek: handleNext,
    openTaskEditModal, handleUpdateTask, handleDeleteTask, handleToggleTodo, handleDeleteEvent,
    toggleMember, selectAllMembers, handleSaveGroup, handleDeleteGroup,
    handleDragStart, handleEventDragStart, handleDragOver, handleDrop, handleRangeSelect,
    handleEventClick, handleCreateEvent, handleAddTask, getCommonFreeTimeText, handleCopyToClipboard
  };
}