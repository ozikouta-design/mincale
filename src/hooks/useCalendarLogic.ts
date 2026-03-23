"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { SYNC_MONTHS, HOUR_H } from "@/constants/calendar";
import { getDayIndex } from "@/hooks/useInitialScroll";
import { useEventLogic } from "@/hooks/useEventLogic";
import { useTodoLogic } from "@/hooks/useTodoLogic";
import { useDragDropLogic } from "@/hooks/useDragDropLogic";
import type { Group, Todo, ViewMode, DayData, MonthData, SelectionState, EventLayout, CalendarEvent } from "@/types";
import toast from "react-hot-toast";

export function useCalendarLogic() {
  const { data: session, status } = useSession();

  // ── Haptics ──────────────────────────────────────────────────
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const triggerHaptic = useCallback(() => {
    if (isHapticsEnabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
  }, [isHapticsEnabled]);

  // ── UI state ─────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"todo" | "settings">("todo");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [hourHeight, setHourHeight] = useState(HOUR_H);
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  const [weekStartDay, setWeekStartDay] = useState(0);
  const [syncMonths, setSyncMonths] = useState(SYNC_MONTHS);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // ── Selection (new event being drawn) ────────────────────────
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // ── Drag over slot ───────────────────────────────────────────
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; startHour: number } | null>(null);

  // ── Booking ──────────────────────────────────────────────────
  const [bookingTitle, setBookingTitle] = useState("ミーティングの予約");
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bookingStartHour, setBookingStartHour] = useState(10);
  const [bookingEndHour, setBookingEndHour] = useState(18);
  const [bookingDays, setBookingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bookingLeadTime, setBookingLeadTime] = useState(24);
  const [profileId, setProfileId] = useState("");

  // ── Groups ───────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // ── Calendar day/month arrays ─────────────────────────────────
  const { days, months, timeMin, timeMax } = useMemo(() => {
    const today = new Date();
    const days: DayData[] = [];
    const months: MonthData[] = [];
    const fetchStart = new Date(today.getFullYear(), today.getMonth() - syncMonths, 1);
    const fetchEnd   = new Date(today.getFullYear(), today.getMonth() + syncMonths + 1, 0, 23, 59, 59);

    // Start from the weekStartDay before (syncMonths * 30) days ago
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - syncMonths * 30);
    let offset = startDay.getDay() - weekStartDay;
    if (offset < 0) offset += 7;
    startDay.setDate(startDay.getDate() - offset);

    const total = (syncMonths * 2 + 1) * 31;
    for (let i = 0; i < total; i++) {
      const cur = new Date(startDay);
      cur.setDate(startDay.getDate() + i);
      days.push({ dayIndex: getDayIndex(cur), label: String(cur.getDate()), isToday: getDayIndex(cur) === getDayIndex(today), date: cur });
    }
    for (let i = -syncMonths; i <= syncMonths; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), monthIndex: d.getFullYear() * 100 + d.getMonth(), date: d });
    }
    return { days, months, timeMin: fetchStart.toISOString(), timeMax: fetchEnd.toISOString() };
  }, [weekStartDay, syncMonths]);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

  // ── Sub-hooks ─────────────────────────────────────────────────
  const eventLogic = useEventLogic(session, status, triggerHaptic, timeMin, timeMax, accentColor);
  const todoLogic  = useTodoLogic(session, triggerHaptic);
  const dragDrop   = useDragDropLogic({
    session,
    triggerHaptic,
    todos: todoLogic.todos,
    setTodos: todoLogic.setTodos,
    events: eventLogic.events,
    setEvents: eventLogic.setEvents,
    selectedMemberIds: eventLogic.selectedMemberIds,
    setSelectedMemberIds: eventLogic.setSelectedMemberIds,
    newEventMemberId: eventLogic.newEventMemberId,
    members: eventLogic.members,
    setIsRightPanelOpen,
  });

  // ── Event layouts (overlap calculation) ──────────────────────
  const eventLayouts = useMemo(() => {
    const layouts: Record<string, EventLayout> = {};
    const visible = eventLogic.events.filter(
      (e) => eventLogic.selectedMemberIds.includes(e.memberId) && !e.isAllDay
    );

    const processColumn = (col: CalendarEvent[]) => {
      col.sort((a, b) => a.startHour - b.startHour || b.duration - a.duration);
      const clusters: CalendarEvent[][] = [];
      let cur: CalendarEvent[] = [], end = 0;
      col.forEach((ev) => {
        if (cur.length === 0) { cur.push(ev); end = ev.startHour + ev.duration; }
        else if (ev.startHour < end) { cur.push(ev); end = Math.max(end, ev.startHour + ev.duration); }
        else { clusters.push(cur); cur = [ev]; end = ev.startHour + ev.duration; }
      });
      if (cur.length) clusters.push(cur);

      clusters.forEach((cluster) => {
        const cols: CalendarEvent[][] = [];
        cluster.forEach((ev) => {
          let placed = false;
          for (let i = 0; i < cols.length; i++) {
            const last = cols[i][cols[i].length - 1];
            if (last.startHour + last.duration <= ev.startHour + 0.001) {
              cols[i].push(ev); layouts[`${ev.id}-${ev.memberId}`] = { column: i, totalColumns: 0 };
              placed = true; break;
            }
          }
          if (!placed) { cols.push([ev]); layouts[`${ev.id}-${ev.memberId}`] = { column: cols.length - 1, totalColumns: 0 }; }
        });
        const tc = cols.length;
        cluster.forEach((ev) => { layouts[`${ev.id}-${ev.memberId}`].totalColumns = tc; });
      });
    };

    days.forEach((d) => processColumn(visible.filter((e) => e.dayIndex === d.dayIndex)));
    return layouts;
  }, [eventLogic.events, eventLogic.selectedMemberIds, days]);

  // ── Data loading (profile, groups) ───────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!session?.user?.email) { setIsLoadingData(false); return; }
      setIsLoadingData(true);
      try {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", session.user.email).single();
        if (profile) {
          setProfileId(profile.slug || profile.id || profile.email);
          if (profile.booking_title) setBookingTitle(profile.booking_title);
          if (profile.booking_duration) setBookingDuration(profile.booking_duration);
          if (profile.booking_start_hour != null) setBookingStartHour(profile.booking_start_hour);
          if (profile.booking_end_hour != null) setBookingEndHour(profile.booking_end_hour);
          if (profile.booking_days) setBookingDays(profile.booking_days);
          if (profile.booking_lead_time != null) setBookingLeadTime(profile.booking_lead_time);
          if (profile.week_start_day != null) setWeekStartDay(profile.week_start_day);
          if (profile.accent_color) setAccentColor(profile.accent_color);
        }
        const { data: groupsData } = await supabase.from("groups").select("*").eq("user_email", session.user.email);
        if (groupsData) setGroups(groupsData.map((g) => ({ id: String(g.id), name: g.name, memberIds: g.member_ids })));
      } catch { toast.error("データの読み込みに失敗しました"); }
      finally { setIsLoadingData(false); }
    };
    load();
  }, [session]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 768) { setIsSidebarOpen(true); setIsRightPanelOpen(true); }
      const h = localStorage.getItem("mincale_haptics");
      if (h !== null) setIsHapticsEnabled(h === "true");
    }
  }, []);

  // ── Member selection helpers ──────────────────────────────────
  const toggleMember = useCallback((memberId: string) => {
    eventLogic.setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }, [eventLogic]);

  const toggleSelectAllMembers = useCallback(() => {
    eventLogic.setSelectedMemberIds((prev) =>
      prev.length === eventLogic.members.length ? [] : eventLogic.members.map((m) => m.id)
    );
  }, [eventLogic]);

  // ── Group helpers ─────────────────────────────────────────────
  const handleDeleteGroup = useCallback(async (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (!error) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        toast.success("グループを削除しました");
      }
    } catch {
      toast.error("グループの削除に失敗しました");
    }
  }, []);

  const handleCreateGroupClick = useCallback(() => {
    setNewGroupName("");
    setNewGroupMemberIds([]);
    setEditingGroupId(null);
    setIsGroupModalOpen(true);
  }, []);

  const handleEditGroupClick = useCallback((group: Group, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNewGroupName(group.name);
    setNewGroupMemberIds(group.memberIds);
    setEditingGroupId(group.id);
    setIsGroupModalOpen(true);
  }, []);

  // ── Todo touch drag ───────────────────────────────────────────
  const [todoTouchDrag, setTodoTouchDrag] = useState<{ todoId: number; title: string; ghostX: number; ghostY: number; isDragging: boolean } | null>(null);

  // ── Haptics toggle ────────────────────────────────────────────
  const toggleHaptics = useCallback((value?: boolean) => {
    setIsHapticsEnabled((prev) => {
      const next = value !== undefined ? value : !prev;
      if (typeof window !== "undefined") localStorage.setItem("mincale_haptics", String(next));
      return next;
    });
  }, []);

  // ── Sync months change ────────────────────────────────────────
  const handleSyncMonthsChange = useCallback((months: number) => {
    setSyncMonths(months);
  }, []);

  // ── Delete confirmation flow ─────────────────────────────────
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ id: string; title: string; isGoogle: boolean; memberId: string } | null>(null);

  const handleDeleteEvent = useCallback((id: string | null, isGoogle: boolean, memberId: string) => {
    if (!id) return;
    const ev = eventLogic.events.find((e) => e.id === id);
    if (!ev) return;
    setPendingDeleteEvent({ id, title: ev.title, isGoogle, memberId });
  }, [eventLogic.events]);

  const executeDeleteEvent = useCallback(async () => {
    if (!pendingDeleteEvent) return;
    const accessToken = (session as any)?.accessToken as string | undefined;
    if (!accessToken) { toast.error("認証が必要です"); return; }
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(pendingDeleteEvent.memberId)}/events/${encodeURIComponent(pendingDeleteEvent.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      eventLogic.setEvents((prev) => prev.filter((ev) => ev.id !== pendingDeleteEvent.id));
      eventLogic.setIsCreateEventModalOpen(false);
      setPendingDeleteEvent(null);
      toast.success("予定を削除しました");
      triggerHaptic();
    } catch {
      toast.error("予定の削除に失敗しました");
    }
  }, [pendingDeleteEvent, session, eventLogic, triggerHaptic]);

  // ── Group modal helpers ───────────────────────────────────────
  const handleCloseGroupModal = useCallback(() => {
    setIsGroupModalOpen(false);
  }, []);

  const handleSaveGroup = useCallback(async () => {
    if (!newGroupName || newGroupMemberIds.length === 0 || !session?.user?.email) return;
    try {
      if (editingGroupId) {
        const { data, error } = await supabase.from("groups").update({ name: newGroupName, member_ids: newGroupMemberIds }).eq("id", editingGroupId).select().single();
        if (!error && data) {
          setGroups((prev) => prev.map((g) => g.id === editingGroupId ? { id: String(data.id), name: data.name, memberIds: data.member_ids } : g));
        }
      } else {
        const { data, error } = await supabase.from("groups").insert({ name: newGroupName, member_ids: newGroupMemberIds, user_email: session.user.email }).select().single();
        if (!error && data) {
          setGroups((prev) => [...prev, { id: String(data.id), name: data.name, memberIds: data.member_ids }]);
        }
      }
      setIsGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupMemberIds([]);
      setEditingGroupId(null);
      toast.success("グループを保存しました");
      triggerHaptic();
    } catch {
      toast.error("グループの保存に失敗しました");
    }
  }, [newGroupName, newGroupMemberIds, editingGroupId, session, triggerHaptic]);

  // ── Clipboard ─────────────────────────────────────────────────
  const [isCopied, setIsCopied] = useState(false);
  const handleCopyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  }, []);

  // ── Free time text generation ─────────────────────────────────
  const getCommonFreeTimeText = useCallback(() => {
    const today = new Date();
    const lines: string[] = ["■ 空き日程"];
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const di = getDayIndex(d);
      const busyEvents = eventLogic.events.filter((ev) => ev.dayIndex === di && !ev.isAllDay && eventLogic.selectedMemberIds.includes(ev.memberId));
      const hours: number[] = [];
      for (let h = 9; h < 19; h++) {
        const isBusy = busyEvents.some((ev) => h >= ev.startHour && h < ev.startHour + ev.duration);
        if (!isBusy) hours.push(h);
      }
      if (hours.length > 0) {
        const ranges: string[] = [];
        let start = hours[0], prev = hours[0];
        for (let k = 1; k <= hours.length; k++) {
          if (k === hours.length || hours[k] !== prev + 1) {
            ranges.push(`${String(start).padStart(2,"0")}:00-${String(prev + 1).padStart(2,"0")}:00`);
            if (k < hours.length) { start = hours[k]; prev = hours[k]; }
          } else { prev = hours[k]; }
        }
        const label = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
        lines.push(`${label} ${ranges.join(", ")}`);
      }
    }
    return lines.join("\n");
  }, [eventLogic.events, eventLogic.selectedMemberIds]);

  // ── Booking save ─────────────────────────────────────────────
  const handleSaveBookingSettings = useCallback(async () => {
    if (!session?.user?.email) return;
    const { error } = await supabase.from("profiles").update({
      booking_title: bookingTitle, booking_duration: bookingDuration,
      booking_start_hour: bookingStartHour, booking_end_hour: bookingEndHour,
      booking_days: bookingDays, booking_lead_time: bookingLeadTime,
      week_start_day: weekStartDay,
    }).eq("email", session.user.email);
    if (!error) { toast.success("設定を保存しました"); triggerHaptic(); }
    else toast.error("設定の保存に失敗しました");
  }, [session, bookingTitle, bookingDuration, bookingStartHour, bookingEndHour, bookingDays, bookingLeadTime, weekStartDay, triggerHaptic]);

  return {
    session, status,
    viewMode, setViewMode,
    isSidebarOpen, setIsSidebarOpen,
    isRightPanelOpen, setIsRightPanelOpen,
    activeTab, setActiveTab,
    accentColor, hourHeight,
    currentMonthYear, setCurrentMonthYear,
    weekStartDay, setWeekStartDay,
    syncMonths, setSyncMonths,
    isLoadingData,
    days, months, hours,
    selection, setSelection,
    dragOverSlot, setDragOverSlot,
    eventLayouts,
    groups, setGroups,
    isGroupModalOpen, setIsGroupModalOpen,
    isScheduleModalOpen, setIsScheduleModalOpen,
    newGroupName, setNewGroupName,
    newGroupMemberIds, setNewGroupMemberIds,
    editingGroupId, setEditingGroupId,
    bookingTitle, setBookingTitle,
    bookingDuration, setBookingDuration,
    bookingStartHour, setBookingStartHour,
    bookingEndHour, setBookingEndHour,
    bookingDays, setBookingDays,
    bookingLeadTime, setBookingLeadTime,
    profileId,
    isHapticsEnabled,
    triggerHaptic,
    handleSaveBookingSettings,
    signIn, signOut,
    toggleMember, toggleSelectAllMembers,
    handleDeleteGroup, handleCreateGroupClick, handleEditGroupClick,
    todoTouchDrag, setTodoTouchDrag,
    toggleHaptics,
    handleSyncMonthsChange,
    handleCloseGroupModal,
    handleSaveGroup,
    isCopied, handleCopyToClipboard,
    getCommonFreeTimeText,
    ...eventLogic,
    ...todoLogic,
    ...dragDrop,
    // Override eventLogic's handleDeleteEvent with confirmation flow
    pendingDeleteEvent, setPendingDeleteEvent,
    executeDeleteEvent,
    handleDeleteEvent,
  };
}
