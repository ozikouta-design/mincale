import { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";

export const GOOGLE_COLORS: Record<string, string> = { "1": "#a4bdfc", "2": "#7ae7bf", "3": "#dbadff", "4": "#ff887c", "5": "#fbd75b", "6": "#ffb878", "7": "#46d6db", "8": "#e1e1e1", "9": "#5484ed", "10": "#51b749", "11": "#dc2127" };
export const getDayIndex = (date: Date) => { const y = date.getFullYear(); const m = (date.getMonth() + 1).toString().padStart(2, '0'); const d = date.getDate().toString().padStart(2, '0'); return parseInt(`${y}${m}${d}`, 10); };
export const formatLocalISO = (date: Date) => { const tzo = -date.getTimezoneOffset(); const dif = tzo >= 0 ? '+' : '-'; const pad = (num: number) => (num < 10 ? '0' : '') + num; return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60); };

export function useCalendarLogic() {
  const { data: session, status } = useSession();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"todo" | "settings">("todo");
  const [members, setMembers] = useState<any[]>([]); const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]); const [todos, setTodos] = useState<any[]>([]);

  const [bookingTitle, setBookingTitle] = useState("ミーティングの予約");
  const [bookingDuration, setBookingDuration] = useState(30); const [bookingStartHour, setBookingStartHour] = useState(10); const [bookingEndHour, setBookingEndHour] = useState(18); const [bookingDays, setBookingDays] = useState<number[]>([1, 2, 3, 4, 5]); const [bookingLeadTime, setBookingLeadTime] = useState(24); const [weekStartDay, setWeekStartDay] = useState(0);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false); const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

  const [editingEventId, setEditingEventId] = useState<any>(null); const [editingEventIsGoogle, setEditingEventIsGoogle] = useState<boolean>(false); 
  const [newEventTitle, setNewEventTitle] = useState(""); const [newEventMemberId, setNewEventMemberId] = useState<string>(""); const [newEventDayIndex, setNewEventDayIndex] = useState(0); const [newEventStartHour, setNewEventStartHour] = useState(0); const [newEventDuration, setNewEventDuration] = useState(1);
  const [newEventLocation, setNewEventLocation] = useState(""); const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventColor, setNewEventColor] = useState<string>("");
  const [newEventRecurrence, setNewEventRecurrence] = useState<string>("none");

  const [isAddingTask, setIsAddingTask] = useState(false); const [newTaskTitle, setNewTaskTitle] = useState(""); const [newTaskProject, setNewTaskProject] = useState(""); const [editingTaskId, setEditingTaskId] = useState<number | null>(null); const [editTaskTitle, setEditTaskTitle] = useState(""); const [editTaskProject, setEditTaskProject] = useState(""); const [newGroupName, setNewGroupName] = useState(""); const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [isCopied, setIsCopied] = useState(false); const [isSyncing, setIsSyncing] = useState(false); const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentViewDate, setCurrentViewDate] = useState(new Date()); const [currentMonthYear, setCurrentMonthYear] = useState("");
  const [accentColor, setAccentColor] = useState("#2563eb"); const [hourHeight, setHourHeight] = useState(64);

  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);
  const [eventPopupPosition, setEventPopupPosition] = useState<{ x: number, y: number } | null>(null);

  const [profileId, setProfileId] = useState<string>("");

  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth >= 768) { setIsSidebarOpen(true); setIsRightPanelOpen(true); } }, []);

  const { days, months, timeMin, timeMax, todayDate } = useMemo(() => {
    const today = new Date(); const tempDays: any[] = []; const tempMonths: any[] = [];
    const fetchStart = new Date(today.getFullYear() - 1, today.getMonth(), 1); const fetchEnd = new Date(today.getFullYear() + 1, today.getMonth(), 0, 23, 59, 59);
    const startDay = new Date(today); startDay.setDate(today.getDate() - 365); let dayOffset = startDay.getDay() - weekStartDay; if (dayOffset < 0) dayOffset += 7; startDay.setDate(startDay.getDate() - dayOffset);
    for (let i = 0; i < 730; i++) { const current = new Date(startDay); current.setDate(startDay.getDate() + i); tempDays.push({ dayIndex: getDayIndex(current), label: current.getDate().toString(), isToday: getDayIndex(current) === getDayIndex(today), date: current }); }
    for (let i = -24; i <= 24; i++) { const d = new Date(today.getFullYear(), today.getMonth() + i, 1); tempMonths.push({ year: d.getFullYear(), month: d.getMonth(), monthIndex: d.getFullYear() * 100 + d.getMonth(), date: d }); }
    return { days: tempDays, months: tempMonths, timeMin: fetchStart.toISOString(), timeMax: fetchEnd.toISOString(), todayDate: today.getDate() };
  }, [weekStartDay]); 

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  useEffect(() => { setCurrentMonthYear(`${currentViewDate.getFullYear()}年 ${currentViewDate.getMonth() + 1}月`); }, [currentViewDate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.email) { setIsLoadingData(false); return; }
      setIsLoadingData(true);
      try {
        const { data: todosData } = await supabase.from('todos').select('*').eq('user_email', session.user.email).order('id', { ascending: true }); if (todosData) setTodos(todosData);
        const { data: groupsData } = await supabase.from('groups').select('*').eq('user_email', session.user.email).order('id', { ascending: true }); if (groupsData) setGroups(groupsData.map(g => ({ id: g.id.toString(), name: g.name, memberIds: g.member_ids })));
        
        const { data: profileData } = await supabase.from('profiles').select('*').eq('email', session.user.email).single();
        if (profileData) {
          setProfileId(profileData.id || profileData.email); 
          if (profileData.booking_title) setBookingTitle(profileData.booking_title);
          if (profileData.booking_duration) setBookingDuration(profileData.booking_duration); if (profileData.booking_start_hour != null) setBookingStartHour(profileData.booking_start_hour); if (profileData.booking_end_hour != null) setBookingEndHour(profileData.booking_end_hour); if (profileData.booking_days) setBookingDays(profileData.booking_days); if (profileData.booking_lead_time != null) setBookingLeadTime(profileData.booking_lead_time); if (profileData.week_start_day != null) setWeekStartDay(profileData.week_start_day);
        }
      } catch (error) { console.error(error); } finally { setIsLoadingData(false); }
    }; fetchData();
  }, [session]);

  const handleSaveBookingSettings = async () => {
    if (!session?.user?.email) return;
    const { error } = await supabase.from('profiles').update({ booking_title: bookingTitle, booking_duration: bookingDuration, booking_start_hour: bookingStartHour, booking_end_hour: bookingEndHour, booking_days: bookingDays, booking_lead_time: bookingLeadTime, week_start_day: weekStartDay }).eq('email', session.user.email);
    if (!error) alert("公開予約ページの設定を保存しました！"); else alert("設定の保存に失敗しました。");
  };

  const syncGoogleData = async () => {
    if (!session) return;
    setIsSyncing(true);
    
    let allEvents: any[] = [];
    let fetchedMembers: any[] = [];
    let defaultPrimaryId = "";

    if ((session as any).accessToken) {
      try {
        const token = (session as any).accessToken; 
        const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers: { Authorization: `Bearer ${token}` } });
        
        if (calListRes.ok) {
          const calListData = await calListRes.json();
          if (calListData.items && calListData.items.length > 0) {
            fetchedMembers = calListData.items.map((cal: any) => { if (cal.primary) defaultPrimaryId = cal.id; return { id: cal.id, name: cal.summaryOverride || cal.summary, colorHex: cal.backgroundColor, initials: (cal.summaryOverride || cal.summary).substring(0, 2).toUpperCase(), primary: cal.primary || false }; });
          }
        }
      } catch (error) { console.error("Google同期エラー:", error); }
    }

    if (fetchedMembers.length === 0) {
      defaultPrimaryId = 'all';
      fetchedMembers = [{ id: 'all', name: 'マイカレンダー', colorHex: accentColor, initials: 'マ', primary: true }];
    }
    setMembers(fetchedMembers);
    setSelectedMemberIds(prev => {
      const validIds = prev.filter(id => fetchedMembers.some(m => m.id === id));
      if (validIds.length === 0) return fetchedMembers.map(m => m.id);
      return validIds;
    });
    setNewEventMemberId(prev => prev ? prev : (defaultPrimaryId || fetchedMembers[0].id));

    if ((session as any).accessToken && fetchedMembers[0].id !== 'all') {
      try {
        const token = (session as any).accessToken; 
        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=2500&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return []; const data = await res.json(); if (!data.items) return [];
          return data.items.map((item: any) => {
            if (!item.start?.dateTime || !item.end?.dateTime) return null;
            const start = new Date(item.start.dateTime); const end = new Date(item.end.dateTime);
            const evDayIndex = getDayIndex(start); const startHour = start.getHours() + (start.getMinutes() / 60); const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return { id: item.id, memberId: member.id, title: item.summary || "予定あり", dayIndex: evDayIndex, startHour, duration, isGoogle: true, colorHex: item.colorId ? GOOGLE_COLORS[item.colorId] : null, colorId: item.colorId || "", recurrence: item.recurrence ? item.recurrence[0] : "none", location: item.location || "", description: item.description || "" };
          }).filter((e: any) => e !== null && e.startHour >= 0 && e.startHour <= 24);
        });
        const results = await Promise.all(eventPromises); 
        allEvents = results.flat(); 
      } catch(e) { console.error(e); }
    }

    setEvents(allEvents);
    setIsSyncing(false);
  };

  useEffect(() => { if (status === "authenticated" && session) syncGoogleData(); }, [status, timeMin, timeMax]);

  const openTaskEditModal = (todo: any) => { setEditingTaskId(todo.id); setEditTaskTitle(todo.title); setEditTaskProject(todo.project); setIsTaskEditModalOpen(true); };
  const handleUpdateTask = async () => { if (!editingTaskId || !editTaskTitle.trim()) return; const { data, error } = await supabase.from('todos').update({ title: editTaskTitle, project: editTaskProject || "一般タスク" }).eq('id', editingTaskId).select().single(); if (!error && data) { setTodos(todos.map(t => t.id === editingTaskId ? data : t)); setIsTaskEditModalOpen(false); setEditingTaskId(null); } };
  const handleInlineUpdateTask = async (taskId: number, title: string, project: string, dueDate: string) => { const { data, error } = await supabase.from('todos').update({ title, project: project || "一般タスク", due_date: dueDate || null }).eq('id', taskId).select().single(); if (!error && data) setTodos(todos.map(t => t.id === taskId ? data : t)); };
  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => { e.stopPropagation(); const { error } = await supabase.from('todos').delete().eq('id', taskId); if (!error) setTodos(todos.filter(t => t.id !== taskId)); };
  const handleToggleTodo = async (taskId: number, currentStatus: boolean, e: React.MouseEvent) => { e.stopPropagation(); const { data, error } = await supabase.from('todos').update({ is_completed: !currentStatus }).eq('id', taskId).select().single(); if (!error && data) setTodos(todos.map(t => t.id === taskId ? data : t)); };

  const handleDeleteEvent = async (eventId: any, isGoogle: boolean, calendarId: string) => {
    if (!confirm("この予定を削除しますか？\n(Googleカレンダーからも削除されます)")) return;
    const token = (session as any)?.accessToken; if (!token) return;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Google削除エラー"); setEvents(events.filter(ev => ev.id !== eventId));
    } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    setIsCreateEventModalOpen(false); setEditingEventId(null); setSelectedEventDetails(null);
  };

  const handleEventResize = async (eventId: any, newDuration: number, memberId: string) => {
    const targetEvent = events.find(ev => ev.id === eventId); if (!targetEvent) return;
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, duration: newDuration } : ev));
    const token = (session as any)?.accessToken; if (!token) return;
    const h = Math.floor(targetEvent.startHour); const m = Math.round((targetEvent.startHour % 1) * 60); 
    const y = Math.floor(targetEvent.dayIndex / 10000); const mo = Math.floor((targetEvent.dayIndex % 10000) / 100) - 1; const d = targetEvent.dayIndex % 100;
    const startDt = new Date(y, mo, d); startDt.setHours(h, m, 0, 0); const endDt = new Date(startDt.getTime() + newDuration * 60 * 60 * 1000); 
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ end: { dateTime: formatLocalISO(endDt) } }) });
      if (!res.ok) throw new Error("Google更新エラー");
    } catch (error: any) { alert("Googleの予定の変更に失敗しました。"); }
  };

  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]);
  const toggleSelectAllMembers = () => { if (selectedMemberIds.length === members.length && members.length > 0) { setSelectedMemberIds([]); } else { setSelectedMemberIds(members.map(m => m.id)); } };

  const handleCreateGroupClick = () => { setEditingGroupId(null); setNewGroupName(""); setNewGroupMemberIds([]); setIsGroupModalOpen(true); };
  const handleEditGroupClick = (group: any, e: React.MouseEvent) => { e.stopPropagation(); setEditingGroupId(group.id); setNewGroupName(group.name); setNewGroupMemberIds(group.memberIds); setIsGroupModalOpen(true); };
  const handleCloseGroupModal = () => { setIsGroupModalOpen(false); setEditingGroupId(null); setNewGroupName(""); setNewGroupMemberIds([]); };
  
  const handleSaveGroup = async () => { 
    if (!newGroupName.trim() || newGroupMemberIds.length === 0 || !session?.user?.email) return; 
    if (editingGroupId) {
      const { data, error } = await supabase.from('groups').update({ name: newGroupName, member_ids: newGroupMemberIds }).eq('id', parseInt(editingGroupId, 10)).select().single();
      if (!error && data) { setGroups(groups.map(g => g.id.toString() === editingGroupId ? { id: data.id.toString(), name: data.name, memberIds: data.member_ids } : g)); }
    } else {
      const { data, error } = await supabase.from('groups').insert({ name: newGroupName, member_ids: newGroupMemberIds, user_email: session.user.email }).select().single(); 
      if (!error && data) { setGroups([...groups, { id: data.id.toString(), name: data.name, memberIds: data.member_ids }]); } 
    }
    handleCloseGroupModal();
  };
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => { e.stopPropagation(); const { error } = await supabase.from('groups').delete().eq('id', parseInt(groupId, 10)); if (!error) { setGroups(groups.filter(g => g.id !== groupId)); } };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: number) => { 
    e.dataTransfer.setData("type", "todo"); e.dataTransfer.setData("todoId", todoId.toString()); 
    if (window.innerWidth < 768) setIsRightPanelOpen(false);
  };
  const handleEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: any, isGoogle: boolean, memberId: string) => { 
    e.dataTransfer.setData("type", "event"); e.dataTransfer.setData("eventId", eventId.toString()); e.dataTransfer.setData("isGoogle", isGoogle.toString()); e.dataTransfer.setData("memberId", memberId); 
  };
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
          setEvents((prev) => [...prev, { id: createdEvent.id, memberId: targetCalendarId, title: targetTodo.title, dayIndex: dayIndex, startHour: startHour, duration: 1, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null, colorId: createdEvent.colorId || "", recurrence: createdEvent.recurrence ? createdEvent.recurrence[0] : "none", location: "", description: "" }]); setTodos((prev) => prev.filter((t) => t.id !== draggedTodoId)); if (!selectedMemberIds.includes(targetCalendarId)) setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
        } catch(e) { alert("Googleへの予定の作成に失敗しました。"); }
      }
    } else if (dragType === "event") {
      const eventId = e.dataTransfer.getData("eventId"); const memberId = e.dataTransfer.getData("memberId"); const targetEvent = events.find(ev => ev.id == eventId); if (!targetEvent) return;
      const h = Math.floor(startHour); const m = Math.round((startHour % 1) * 60); const y = Math.floor(dayIndex / 10000); const mo = Math.floor((dayIndex % 10000) / 100) - 1; const d = dayIndex % 100;
      const startDt = new Date(y, mo, d); startDt.setHours(h, m, 0, 0); const endDt = new Date(startDt.getTime() + targetEvent.duration * 60 * 60 * 1000); 
      
      setEvents(prev => prev.map(ev => ev.id == eventId ? { ...ev, dayIndex, startHour } : ev));

      const token = (session as any)?.accessToken; if (!token) return;
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }) });
        if (!res.ok) throw new Error("Google更新エラー"); 
      } catch (error: any) { alert("Googleの予定の移動に失敗しました。"); }
    }
  };

  const handleRangeSelect = (dayIndex: number, startHour: number, duration: number) => { 
    setEditingEventId(null); setEditingEventIsGoogle(false); setNewEventTitle(""); 
    setNewEventLocation(""); setNewEventDescription(""); 
    setNewEventDayIndex(dayIndex); setNewEventStartHour(startHour); setNewEventDuration(duration); 
    setNewEventColor(""); setNewEventRecurrence("none");
    setIsCreateEventModalOpen(true); 
  };
  
  const handleEventClick = (event: any, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEventPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setSelectedEventDetails(event);
  };

  const handleEditEventClick = () => {
    if (!selectedEventDetails) return;
    setEditingEventId(selectedEventDetails.id); 
    setEditingEventIsGoogle(selectedEventDetails.isGoogle); 
    setNewEventTitle(selectedEventDetails.title); 
    setNewEventMemberId(selectedEventDetails.memberId); 
    setNewEventDayIndex(selectedEventDetails.dayIndex); 
    setNewEventStartHour(selectedEventDetails.startHour); 
    setNewEventDuration(selectedEventDetails.duration); 
    setNewEventLocation(selectedEventDetails.location || "");
    setNewEventDescription(selectedEventDetails.description || "");
    setNewEventColor(selectedEventDetails.colorId || ""); 
    
    let rec = "none";
    if (selectedEventDetails.recurrence && typeof selectedEventDetails.recurrence === 'string') {
      if (selectedEventDetails.recurrence.includes("DAILY")) rec = "daily";
      else if (selectedEventDetails.recurrence.includes("WEEKLY")) rec = "weekly";
      else if (selectedEventDetails.recurrence.includes("MONTHLY")) rec = "monthly";
    }
    setNewEventRecurrence(rec);
    
    setSelectedEventDetails(null); 
    setIsCreateEventModalOpen(true); 
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventMemberId) return;
    const y = Math.floor(newEventDayIndex / 10000); const m = Math.floor((newEventDayIndex % 10000) / 100) - 1; const d = newEventDayIndex % 100;
    const startDt = new Date(y, m, d); const h = Math.floor(newEventStartHour); const min = Math.round((newEventStartHour % 1) * 60); startDt.setHours(h, min, 0, 0); const endDt = new Date(startDt.getTime() + newEventDuration * 60 * 60 * 1000); 

    const token = (session as any)?.accessToken; if (!token) { alert("Googleカレンダーにアクセスできません。再度ログインしてください。"); return; }
    
    const eventBody: any = { summary: newEventTitle, location: newEventLocation, description: newEventDescription, start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } };

    if (newEventColor) eventBody.colorId = newEventColor;
    if (newEventRecurrence !== "none") {
      if (newEventRecurrence === "daily") eventBody.recurrence = ["RRULE:FREQ=DAILY"];
      if (newEventRecurrence === "weekly") eventBody.recurrence = ["RRULE:FREQ=WEEKLY"];
      if (newEventRecurrence === "monthly") eventBody.recurrence = ["RRULE:FREQ=MONTHLY"];
    }

    if (editingEventId) {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) });
        if (!res.ok) throw new Error("更新失敗"); setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? { ...ev, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration, colorHex: newEventColor ? GOOGLE_COLORS[newEventColor] : null, colorId: newEventColor, recurrence: eventBody.recurrence ? eventBody.recurrence[0] : "none", location: newEventLocation, description: newEventDescription } : ev));
      } catch (e) { alert("権限エラー：ログアウトして再度Googleでログインし直してください。"); }
    } else {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) });
        if (!res.ok) throw new Error("作成失敗"); const createdEvent = await res.json(); setEvents((prevEvents) => [...prevEvents, { id: createdEvent.id, memberId: newEventMemberId, title: newEventTitle, dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration, isGoogle: true, colorHex: createdEvent.colorId ? GOOGLE_COLORS[createdEvent.colorId] : null, colorId: createdEvent.colorId || "", recurrence: createdEvent.recurrence ? createdEvent.recurrence[0] : "none", location: newEventLocation, description: newEventDescription }]);
      } catch (e) { alert("権限エラー：Googleカレンダーへの追加に失敗しました。"); }
    }
    setIsCreateEventModalOpen(false); setEditingEventId(null); setNewEventTitle(""); setNewEventLocation(""); setNewEventDescription(""); setNewEventColor(""); setNewEventRecurrence("none");
    if (!selectedMemberIds.includes(newEventMemberId)) setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
  };

  const handleAddTask = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!newTaskTitle.trim() || !session?.user?.email) return; 
    const { data, error } = await supabase.from('todos').insert({ title: newTaskTitle, project: newTaskProject || "一般タスク", due_date: newTaskDueDate || null, user_email: session.user.email }).select().single(); 
    if (!error) setTodos([...todos, data]); 
    setNewTaskTitle(""); setNewTaskProject(""); setNewTaskDueDate(""); setIsAddingTask(false); 
  };

  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = []; 
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + bookingLeadTime * 60 * 60 * 1000);
    
    const visibleDays = days.filter(d => d.dayIndex >= getDayIndex(now) && bookingDays.includes(d.date.getDay()));
    
    let addedDaysCount = 0;
    
    for (let d = 0; d < visibleDays.length; d++) {
      if (addedDaysCount >= 5) break; 

      const dt = visibleDays[d].date;
      const dateStr = `${dt.getMonth()+1}/${dt.getDate()}(${['日','月','火','水','木','金','土'][dt.getDay()]})`;
      
      let currentMin = bookingStartHour * 60;
      const endMin = bookingEndHour * 60;
      
      let dayFreeBlocks = [];
      let currentBlockStart = -1;
      let currentBlockEnd = -1;

      while (currentMin < endMin) {
        if (currentMin + bookingDuration > endMin) break;
        
        const h = Math.floor(currentMin / 60); 
        const m = currentMin % 60;
        const slotStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), h, m, 0);
        
        let isOccupied = false;
        
        if (slotStart <= minBookingTime) {
          isOccupied = true;
        } else {
          for (const event of events) { 
            if (selectedMemberIds.includes(event.memberId) && event.dayIndex === visibleDays[d].dayIndex) { 
               const evStartH = event.startHour;
               const evEndH = event.startHour + event.duration;
               const slotStartH = currentMin / 60;
               const slotEndH = (currentMin + bookingDuration) / 60;
               
               if (slotStartH < evEndH && slotEndH > evStartH) {
                 isOccupied = true; break;
               }
            } 
          }
        }
        
        if (!isOccupied) {
          if (currentBlockStart === -1) {
            currentBlockStart = currentMin;
            currentBlockEnd = currentMin + bookingDuration;
          } else {
            currentBlockEnd = currentMin + bookingDuration;
          }
        } else {
          if (currentBlockStart !== -1) {
            const sH = Math.floor(currentBlockStart / 60).toString().padStart(2, '0');
            const sM = (currentBlockStart % 60).toString().padStart(2, '0');
            const eH = Math.floor(currentBlockEnd / 60).toString().padStart(2, '0');
            const eM = (currentBlockEnd % 60).toString().padStart(2, '0');
            dayFreeBlocks.push(`${sH}:${sM}〜${eH}:${eM}`);
            currentBlockStart = -1;
          }
        }
        
        currentMin += bookingDuration;
      }
      
      if (currentBlockStart !== -1) {
        const sH = Math.floor(currentBlockStart / 60).toString().padStart(2, '0');
        const sM = (currentBlockStart % 60).toString().padStart(2, '0');
        const eH = Math.floor(currentBlockEnd / 60).toString().padStart(2, '0');
        const eM = (currentBlockEnd % 60).toString().padStart(2, '0');
        dayFreeBlocks.push(`${sH}:${sM}〜${eH}:${eM}`);
      }
      
      if (dayFreeBlocks.length > 0) {
        freeSlots.push(`・${dateStr} ${dayFreeBlocks.join(', ')}`);
        addedDaysCount++;
      }
    }
    
    if (freeSlots.length === 0) {
       freeSlots.push("※現在ご提示できる直近の空き日程がありません。恐れ入りますがリンクからカレンダーをご確認ください。");
    }

    const userSlug = session?.user?.email ? session.user.email.split('@')[0] : profileId;
    const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${userSlug}` : `https://mincale.app/t/${userSlug}`;
    
    return `お世話になっております。\n次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？\n\n${freeSlots.join("\n")}\n\n▼ こちらの専用リンクから、ご都合の良い時間を直接ご予約いただけます：\n${bookingUrl}\n\nご検討のほど、よろしくお願いいたします。`;
  };

  // ★ 修正：テキストを受け取ってコピーできるように変更
  const handleCopyToClipboard = async (textToCopy?: string) => { 
    try { 
      await navigator.clipboard.writeText(textToCopy !== undefined ? textToCopy : getCommonFreeTimeText()); 
      setIsCopied(true); 
      setTimeout(() => setIsCopied(false), 2000); 
    } catch (err) {} 
  };

  return {
    session, status, signIn, signOut, viewMode, setViewMode, activeTab, setActiveTab,
    members, setMembers, selectedMemberIds, setSelectedMemberIds, groups, setGroups, events, setEvents, todos, setTodos,
    isSidebarOpen, setIsSidebarOpen, isRightPanelOpen, setIsRightPanelOpen,
    isScheduleModalOpen, setIsScheduleModalOpen, isCreateEventModalOpen, setIsCreateEventModalOpen,
    isGroupModalOpen, setIsGroupModalOpen, isTaskEditModalOpen, setIsTaskEditModalOpen,
    editingEventId, setEditingEventId, editingEventIsGoogle, setEditingEventIsGoogle,
    newEventTitle, setNewEventTitle, newEventMemberId, setNewEventMemberId, newEventDayIndex, setNewEventDayIndex, newEventStartHour, setNewEventStartHour, newEventDuration, setNewEventDuration,
    newEventLocation, setNewEventLocation, newEventDescription, setNewEventDescription, 
    newEventColor, setNewEventColor, newEventRecurrence, setNewEventRecurrence,
    isAddingTask, setIsAddingTask, newTaskTitle, setNewTaskTitle, newTaskProject, setNewTaskProject,
    editingTaskId, setEditingTaskId, editTaskTitle, setEditTaskTitle, editTaskProject, setEditTaskProject,
    newGroupName, setNewGroupName, newGroupMemberIds, setNewGroupMemberIds,
    isCopied, setIsCopied, isSyncing, setIsSyncing, isLoadingData, setIsLoadingData,
    currentMonthYear, setCurrentMonthYear,
    accentColor, setAccentColor, hourHeight, setHourHeight,
    bookingTitle, setBookingTitle,
    bookingDuration, setBookingDuration, bookingStartHour, setBookingStartHour, bookingEndHour, setBookingEndHour, bookingDays, setBookingDays, bookingLeadTime, setBookingLeadTime, weekStartDay, setWeekStartDay, handleSaveBookingSettings,
    days, months, timeMin, timeMax, todayDate, hours,
    syncGoogleData, 
    handleToday: () => {}, handlePrevWeek: () => {}, handleNextWeek: () => {},
    openTaskEditModal, handleUpdateTask, handleDeleteTask, handleToggleTodo, handleDeleteEvent, handleEventResize,
    toggleMember, toggleSelectAllMembers, handleCreateGroupClick, handleEditGroupClick, handleCloseGroupModal, handleSaveGroup, handleDeleteGroup,
    handleDragStart, handleEventDragStart, handleDragOver, handleDrop, handleRangeSelect,
    handleEventClick, handleCreateEvent, handleAddTask, getCommonFreeTimeText, handleCopyToClipboard,
    selectedEventDetails, setSelectedEventDetails, eventPopupPosition, handleEditEventClick,
    newTaskDueDate, setNewTaskDueDate, handleInlineUpdateTask
  };
}