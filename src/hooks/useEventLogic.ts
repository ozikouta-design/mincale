"use client";
import { useState, useEffect, useCallback } from "react";
import { Session } from "next-auth";
import { SYNC_MONTHS, GOOGLE_EVENT_COLORS } from "@/constants/calendar";
import { getDayIndex } from "@/hooks/useInitialScroll";
import type { CalendarEvent, Member } from "@/types";
import toast from "react-hot-toast";

export function formatLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function dayIndexToDate(dayIndex: number, hour: number): Date {
  const y = Math.floor(dayIndex / 10000);
  const m = Math.floor((dayIndex % 10000) / 100) - 1;
  const d = dayIndex % 100;
  const dt = new Date(y, m, d);
  dt.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return dt;
}

export function useEventLogic(
  session: Session | null,
  status: string,
  triggerHaptic: () => void,
  timeMin: string,
  timeMax: string,
  accentColor: string
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newEventMemberId, setNewEventMemberId] = useState("");

  // Modal state
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventIsGoogle, setEditingEventIsGoogle] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDayIndex, setNewEventDayIndex] = useState(0);
  const [newEventStartHour, setNewEventStartHour] = useState(0);
  const [newEventDuration, setNewEventDuration] = useState(1);
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventColor, setNewEventColor] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState("none");

  const [isSyncing, setIsSyncing] = useState(false);

  // Event popup
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);
  const [eventPopupPosition, setEventPopupPosition] = useState({ x: 0, y: 0 });

  const accessToken = (session as any)?.accessToken as string | undefined;

  // ── Fetch calendars & events ────────────────────────────────
  const syncGoogleData = useCallback(async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    try {
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!calRes.ok) throw new Error("Calendar list fetch failed");
      const calData = await calRes.json();

      const fetchedMembers: Member[] = (calData.items ?? []).map((cal: any, i: number) => ({
        id: cal.id,
        name: cal.summary || cal.id,
        colorHex: cal.backgroundColor || accentColor,
        initials: (cal.summary || "?").slice(0, 2).toUpperCase(),
        primary: !!cal.primary,
      }));
      setMembers(fetchedMembers);
      const allIds = fetchedMembers.map((m) => m.id);
      setSelectedMemberIds(allIds);
      if (!newEventMemberId && fetchedMembers.length > 0) {
        const primary = fetchedMembers.find((m) => m.primary) ?? fetchedMembers[0];
        setNewEventMemberId(primary.id);
      }

      const allEvents: CalendarEvent[] = [];
      await Promise.all(
        fetchedMembers.map(async (member) => {
          try {
            const evRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?` +
              `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=500`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!evRes.ok) return;
            const evData = await evRes.json();
            (evData.items ?? []).forEach((item: any) => {
              if (!item.start) return;
              if (item.start.date) {
                // All-day
                const d = new Date(item.start.date + "T00:00:00");
                allEvents.push({
                  id: item.id, memberId: member.id,
                  title: item.summary || "(無題)",
                  dayIndex: getDayIndex(d),
                  startHour: 0, duration: 24,
                  isGoogle: true, colorHex: item.colorId ? GOOGLE_EVENT_COLORS[item.colorId] : null,
                  colorId: item.colorId || "",
                  isAllDay: true,
                });
              } else if (item.start.dateTime) {
                const start = new Date(item.start.dateTime);
                const end = new Date(item.end.dateTime);
                const duration = Math.max(0.25, (end.getTime() - start.getTime()) / 3600000);
                allEvents.push({
                  id: item.id, memberId: member.id,
                  title: item.summary || "(無題)",
                  dayIndex: getDayIndex(start),
                  startHour: start.getHours() + start.getMinutes() / 60,
                  duration,
                  isGoogle: true,
                  colorHex: item.colorId ? GOOGLE_EVENT_COLORS[item.colorId] : null,
                  colorId: item.colorId || "",
                  recurrence: item.recurrence?.[0] ?? "none",
                  location: item.location || "",
                  description: item.description || "",
                  isAllDay: false,
                });
              }
            });
          } catch { /* skip this calendar */ }
        })
      );
      setEvents(allEvents);
    } catch (e) {
      toast.error("Googleカレンダーの読み込みに失敗しました");
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, timeMin, timeMax, accentColor, newEventMemberId]);

  useEffect(() => {
    if (status === "authenticated" && accessToken) syncGoogleData();
  }, [status, accessToken]); // eslint-disable-line

  // ── Open create modal from range selection ───────────────────
  const handleRangeSelect = useCallback(
    (dayIndex: number, startHour: number, duration: number) => {
      setEditingEventId(null);
      setEditingEventIsGoogle(false);
      setNewEventTitle("");
      setNewEventLocation("");
      setNewEventDescription("");
      setNewEventDayIndex(dayIndex);
      setNewEventStartHour(startHour);
      setNewEventDuration(duration);
      setNewEventColor("");
      setNewEventRecurrence("none");
      setIsCreateEventModalOpen(true);
      triggerHaptic();
    },
    [triggerHaptic]
  );

  // ── Event click ──────────────────────────────────────────────
  const handleEventClick = useCallback(
    (ev: CalendarEvent, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setEventPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
      setSelectedEventDetails(ev);
      triggerHaptic();
    },
    [triggerHaptic]
  );

  // ── Create / Update ──────────────────────────────────────────
  const handleCreateEvent = useCallback(async () => {
    if (!newEventTitle || !newEventMemberId || !accessToken) return;
    const startDt = dayIndexToDate(newEventDayIndex, newEventStartHour);
    const endDt = new Date(startDt.getTime() + newEventDuration * 3600000);
    const body: any = {
      summary: newEventTitle,
      start: { dateTime: formatLocalISO(startDt) },
      end: { dateTime: formatLocalISO(endDt) },
    };
    if (newEventLocation) body.location = newEventLocation;
    if (newEventDescription) body.description = newEventDescription;
    if (newEventColor) body.colorId = newEventColor;
    if (newEventRecurrence !== "none") {
      const ruleMap: Record<string, string> = {
        daily: "RRULE:FREQ=DAILY",
        weekly: "RRULE:FREQ=WEEKLY",
        monthly: "RRULE:FREQ=MONTHLY",
      };
      body.recurrence = [ruleMap[newEventRecurrence]];
    }

    try {
      if (editingEventId) {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`,
          { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setEvents((prev) => prev.map((ev) => ev.id === editingEventId ? {
          ...ev, title: newEventTitle, startHour: newEventStartHour, duration: newEventDuration,
          location: newEventLocation, description: newEventDescription,
          colorHex: newEventColor ? GOOGLE_EVENT_COLORS[newEventColor] : ev.colorHex,
        } : ev));
        toast.success("予定を更新しました");
      } else {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events`,
          { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        if (!res.ok) throw new Error();
        const created = await res.json();
        setEvents((prev) => [...prev, {
          id: created.id, memberId: newEventMemberId, title: newEventTitle,
          dayIndex: newEventDayIndex, startHour: newEventStartHour, duration: newEventDuration,
          isGoogle: true, colorHex: newEventColor ? GOOGLE_EVENT_COLORS[newEventColor] : null,
          colorId: newEventColor, location: newEventLocation, description: newEventDescription,
          recurrence: newEventRecurrence === "none" ? "none" : body.recurrence?.[0],
        }]);
        toast.success("予定を作成しました");
      }
    } catch {
      toast.error("予定の保存に失敗しました");
    }
    setIsCreateEventModalOpen(false);
    triggerHaptic();
  }, [newEventTitle, newEventMemberId, accessToken, newEventDayIndex, newEventStartHour,
      newEventDuration, newEventLocation, newEventDescription, newEventColor, newEventRecurrence,
      editingEventId, triggerHaptic]);

  // ── Delete ───────────────────────────────────────────────────
  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEventDetails || !accessToken) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedEventDetails.memberId)}/events/${encodeURIComponent(selectedEventDetails.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setEvents((prev) => prev.filter((ev) => ev.id !== selectedEventDetails.id));
      setSelectedEventDetails(null);
      toast.success("予定を削除しました");
      triggerHaptic();
    } catch {
      toast.error("予定の削除に失敗しました");
    }
  }, [selectedEventDetails, accessToken, triggerHaptic]);

  // ── Edit existing event ──────────────────────────────────────
  const handleEditEventClick = useCallback(() => {
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
    setSelectedEventDetails(null);
    setIsCreateEventModalOpen(true);
    triggerHaptic();
  }, [selectedEventDetails, triggerHaptic]);

  // ── Move (drag & drop) ───────────────────────────────────────
  const handleMoveEvent = useCallback(async (eventId: string, memberId: string, dayIndex: number, startHour: number) => {
    if (!accessToken) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const prev = [...events];
    setEvents((arr) => arr.map((e) => e.id === eventId ? { ...e, dayIndex, startHour } : e));
    try {
      const startDt = dayIndexToDate(dayIndex, startHour);
      const endDt = new Date(startDt.getTime() + ev.duration * 3600000);
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ start: { dateTime: formatLocalISO(startDt) }, end: { dateTime: formatLocalISO(endDt) } }),
        }
      );
      if (!res.ok) throw new Error();
    } catch {
      setEvents(prev);
      toast.error("予定の移動に失敗しました");
    }
  }, [accessToken, events]);

  // ── Resize commit ────────────────────────────────────────────
  const handleResizeCommit = useCallback(async (eventId: string, memberId: string, newDuration: number) => {
    if (!accessToken) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const prev = [...events];
    setEvents((arr) => arr.map((e) => e.id === eventId ? { ...e, duration: newDuration } : e));
    try {
      const startDt = dayIndexToDate(ev.dayIndex, ev.startHour);
      const endDt = new Date(startDt.getTime() + newDuration * 3600000);
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ end: { dateTime: formatLocalISO(endDt) } }),
        }
      );
      if (!res.ok) throw new Error();
      triggerHaptic();
    } catch {
      setEvents(prev);
      toast.error("予定のリサイズに失敗しました");
    }
  }, [accessToken, events, triggerHaptic]);

  return {
    events, setEvents,
    members, setMembers,
    selectedMemberIds, setSelectedMemberIds,
    newEventMemberId, setNewEventMemberId,
    isSyncing, syncGoogleData,
    // Modal state
    isCreateEventModalOpen, setIsCreateEventModalOpen,
    editingEventId, editingEventIsGoogle,
    newEventTitle, setNewEventTitle,
    newEventDayIndex, setNewEventDayIndex,
    newEventStartHour, setNewEventStartHour,
    newEventDuration, setNewEventDuration,
    newEventLocation, setNewEventLocation,
    newEventDescription, setNewEventDescription,
    newEventColor, setNewEventColor,
    newEventRecurrence, setNewEventRecurrence,
    // Popup
    selectedEventDetails, setSelectedEventDetails,
    eventPopupPosition,
    // Handlers
    handleRangeSelect,
    handleEventClick,
    handleCreateEvent,
    handleDeleteEvent,
    handleEditEventClick,
    handleMoveEvent,
    handleResizeCommit,
  };
}
