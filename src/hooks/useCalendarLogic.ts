"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
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
    ...eventLogic,
    ...todoLogic,
    ...dragDrop,
  };
}
