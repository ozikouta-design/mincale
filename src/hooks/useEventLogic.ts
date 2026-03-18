import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CalendarEvent, Member } from "@/types";
import type { Session } from "next-auth";

export const GOOGLE_COLORS: Record<string, string> = {
  "1": "#a4bdfc", "2": "#7ae7bf", "3": "#dbadff", "4": "#ff887c",
  "5": "#fbd75b", "6": "#ffb878", "7": "#46d6db", "8": "#e1e1e1",
  "9": "#5484ed", "10": "#51b749", "11": "#dc2127",
};

export const getDayIndex = (date: Date): number => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return parseInt(`${y}${m}${d}`, 10);
};

export const formatLocalISO = (date: Date): string => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? "+" : "-";
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return (
    date.getFullYear() +
    "-" + pad(date.getMonth() + 1) +
    "-" + pad(date.getDate()) +
    "T" + pad(date.getHours()) +
    ":" + pad(date.getMinutes()) +
    ":" + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
    ":" + pad(Math.abs(tzo) % 60)
  );
};

export function useEventLogic(
  session: Session | null,
  status: string,
  triggerHaptic: () => void,
  timeMin: string,
  timeMax: string,
  accentColor: string
) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventIsGoogle, setEditingEventIsGoogle] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMemberId, setNewEventMemberId] = useState("");
  const [newEventDayIndex, setNewEventDayIndex] = useState(0);
  const [newEventStartHour, setNewEventStartHour] = useState(0);
  const [newEventDuration, setNewEventDuration] = useState(1);
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventColor, setNewEventColor] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState("none");

  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);
  const [eventPopupPosition, setEventPopupPosition] = useState<{ x: number; y: number } | null>(null);

  // ★ confirm() を廃止: 削除確認ダイアログ用のstate
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{
    id: string;
    isGoogle: boolean;
    memberId: string;
    title: string;
  } | null>(null);

  const syncGoogleData = async () => {
    if (!session) return;
    setIsSyncing(true);
    let allEvents: CalendarEvent[] = [];
    let fetchedMembers: Member[] = [];
    let defaultPrimaryId = "";

    const accessToken = session.accessToken;
    if (accessToken) {
      try {
        const calListRes = await fetch(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (calListRes.ok) {
          const calListData = await calListRes.json();
          if (calListData.items?.length > 0) {
            fetchedMembers = calListData.items.map((cal: any) => {
              if (cal.primary) defaultPrimaryId = cal.id;
              return {
                id: cal.id,
                name: cal.summaryOverride || cal.summary,
                colorHex: cal.backgroundColor,
                initials: (cal.summaryOverride || cal.summary).substring(0, 2).toUpperCase(),
                primary: cal.primary || false,
              };
            });
          }
        }
      } catch (error) {
        console.error("Google同期エラー:", error);
      }
    }

    if (fetchedMembers.length === 0) {
      defaultPrimaryId = "all";
      fetchedMembers = [{ id: "all", name: "マイカレンダー", colorHex: accentColor, initials: "マ", primary: true }];
    }

    setMembers(fetchedMembers);
    setSelectedMemberIds((prev) => {
      const valid = prev.filter((id) => fetchedMembers.some((m) => m.id === id));
      return valid.length === 0 ? fetchedMembers.map((m) => m.id) : valid;
    });
    setNewEventMemberId((prev) => prev || defaultPrimaryId || fetchedMembers[0].id);

    if (accessToken && fetchedMembers[0].id !== "all") {
      try {
        const eventPromises = fetchedMembers.map(async (member) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(member.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=2500&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          if (!data.items) return [];

          return data.items
            .map((item: any): CalendarEvent | null => {
              let startDt: Date, endDt: Date, isAllDay = false;
              if (item.start?.dateTime && item.end?.dateTime) {
                startDt = new Date(item.start.dateTime);
                endDt = new Date(item.end.dateTime);
              } else if (item.start?.date && item.end?.date) {
                startDt = new Date(item.start.date);
                endDt = new Date(item.end.date);
                isAllDay = true;
              } else {
                return null;
              }
              const startHour = isAllDay ? 0 : startDt.getHours() + startDt.getMinutes() / 60;
              const duration = (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60);
              return {
                id: item.id,
                memberId: member.id,
                title: item.summary || "予定あり",
                dayIndex: getDayIndex(startDt),
                startHour,
                duration,
                isGoogle: true,
                isAllDay,
                colorHex: item.colorId ? GOOGLE_COLORS[item.colorId] : null,
                colorId: item.colorId || "",
                recurrence: item.recurrence ? item.recurrence[0] : "none",
                location: item.location || "",
                description: item.description || "",
              };
            })
            .filter((e: CalendarEvent | null): e is CalendarEvent =>
              e !== null && (e.isAllDay || (e.startHour >= 0 && e.startHour <= 24))
            );
        });
        const results = await Promise.all(eventPromises);
        allEvents = results.flat();
      } catch (e) {
        console.error(e);
      }
    }

    setEvents(allEvents);
    setIsSyncing(false);
  };

  useEffect(() => {
    if (status === "authenticated" && session) syncGoogleData();
  }, [status, timeMin, timeMax]);

  // ★ confirm() を廃止。呼び出し元は pendingDeleteEvent に詰めるだけ
  const handleDeleteEvent = (eventId: string, isGoogle: boolean, memberId: string) => {
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;
    setPendingDeleteEvent({ id: eventId, isGoogle, memberId, title: event.title });
  };

  // ★ 実際の削除処理（確認モーダルのOK後に呼ぶ）
  const executeDeleteEvent = async () => {
    if (!pendingDeleteEvent) return;
    const { id, memberId } = pendingDeleteEvent;
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    const previousEvents = [...events];
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    triggerHaptic();
    setPendingDeleteEvent(null);
    setIsCreateEventModalOpen(false);
    setEditingEventId(null);
    setSelectedEventDetails(null);

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error("削除失敗");
      toast.success("予定を削除しました");
    } catch {
      setEvents(previousEvents);
      toast.error("予定の削除に失敗しました。再試行してください。");
    }
  };

  const handleEventResize = async (eventId: string, newDuration: number, memberId: string) => {
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (!targetEvent) return;

    const previousEvents = [...events];
    setEvents((prev) => prev.map((ev) => (ev.id === eventId ? { ...ev, duration: newDuration } : ev)));
    triggerHaptic();

    const accessToken = session?.accessToken;
    if (!accessToken) return;

    const h = Math.floor(targetEvent.startHour);
    const m = Math.round((targetEvent.startHour % 1) * 60);
    const y = Math.floor(targetEvent.dayIndex / 10000);
    const mo = Math.floor((targetEvent.dayIndex % 10000) / 100) - 1;
    const d = targetEvent.dayIndex % 100;
    const startDt = new Date(y, mo, d);
    startDt.setHours(h, m, 0, 0);
    const endDt = new Date(startDt.getTime() + newDuration * 3600000);

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ end: { dateTime: formatLocalISO(endDt) } }),
        }
      );
      if (!res.ok) throw new Error();
    } catch {
      setEvents(previousEvents);
      toast.error("Googleカレンダーの更新に失敗したため、元の長さに戻しました");
    }
  };

  const toggleMember = (id: string) => {
    triggerHaptic();
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  const toggleSelectAllMembers = () => {
    triggerHaptic();
    if (selectedMemberIds.length === members.length && members.length > 0) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  const handleRangeSelect = (dayIndex: number, startHour: number, duration: number) => {
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
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEventPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setSelectedEventDetails(event);
    triggerHaptic();
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
    if (selectedEventDetails.recurrence) {
      if (selectedEventDetails.recurrence.includes("DAILY")) rec = "daily";
      else if (selectedEventDetails.recurrence.includes("WEEKLY")) rec = "weekly";
      else if (selectedEventDetails.recurrence.includes("MONTHLY")) rec = "monthly";
    }
    setNewEventRecurrence(rec);
    setSelectedEventDetails(null);
    setIsCreateEventModalOpen(true);
    triggerHaptic();
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
    const endDt = new Date(startDt.getTime() + newEventDuration * 3600000);

    const accessToken = session?.accessToken;
    if (!accessToken) {
      toast.error("Googleにアクセスできません。再ログインしてください");
      return;
    }

    const eventBody: Record<string, unknown> = {
      summary: newEventTitle,
      location: newEventLocation,
      description: newEventDescription,
      start: { dateTime: formatLocalISO(startDt) },
      end: { dateTime: formatLocalISO(endDt) },
    };
    if (newEventColor) eventBody.colorId = newEventColor;
    if (newEventRecurrence !== "none") {
      const freq = newEventRecurrence === "daily" ? "DAILY" : newEventRecurrence === "weekly" ? "WEEKLY" : "MONTHLY";
      eventBody.recurrence = [`RRULE:FREQ=${freq}`];
    }

    const previousEvents = [...events];

    if (editingEventId) {
      // ★ 楽観的更新
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEventId
            ? {
                ...ev,
                memberId: newEventMemberId,
                title: newEventTitle,
                dayIndex: newEventDayIndex,
                startHour: newEventStartHour,
                duration: newEventDuration,
                colorHex: newEventColor ? GOOGLE_COLORS[newEventColor] : null,
                colorId: newEventColor,
                recurrence: (eventBody.recurrence as string[] | undefined)?.[0] || "none",
                location: newEventLocation,
                description: newEventDescription,
              }
            : ev
        )
      );
      triggerHaptic();
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events/${encodeURIComponent(editingEventId)}`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventBody),
          }
        );
        if (!res.ok) throw new Error();
        toast.success("予定を更新しました");
      } catch {
        setEvents(previousEvents);
        toast.error("予定の更新に失敗しました");
      }
    } else {
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newEventMemberId)}/events`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventBody),
          }
        );
        if (!res.ok) throw new Error();
        const created = await res.json();
        setEvents((prev) => [
          ...prev,
          {
            id: created.id,
            memberId: newEventMemberId,
            title: newEventTitle,
            dayIndex: newEventDayIndex,
            startHour: newEventStartHour,
            duration: newEventDuration,
            isGoogle: true,
            colorHex: created.colorId ? GOOGLE_COLORS[created.colorId] : null,
            colorId: created.colorId || "",
            recurrence: created.recurrence ? created.recurrence[0] : "none",
            location: newEventLocation,
            description: newEventDescription,
          },
        ]);
        triggerHaptic();
        toast.success("予定を作成しました");
      } catch {
        toast.error("Googleカレンダーへの追加に失敗しました");
      }
    }

    setIsCreateEventModalOpen(false);
    setEditingEventId(null);
    setNewEventTitle("");
    setNewEventLocation("");
    setNewEventDescription("");
    setNewEventColor("");
    setNewEventRecurrence("none");
    if (!selectedMemberIds.includes(newEventMemberId)) {
      setSelectedMemberIds((prev) => [...prev, newEventMemberId]);
    }
  };

  return {
    members, setMembers,
    selectedMemberIds, setSelectedMemberIds,
    events, setEvents,
    isSyncing, setIsSyncing,
    isCreateEventModalOpen, setIsCreateEventModalOpen,
    editingEventId, setEditingEventId,
    editingEventIsGoogle, setEditingEventIsGoogle,
    newEventTitle, setNewEventTitle,
    newEventMemberId, setNewEventMemberId,
    newEventDayIndex, setNewEventDayIndex,
    newEventStartHour, setNewEventStartHour,
    newEventDuration, setNewEventDuration,
    newEventLocation, setNewEventLocation,
    newEventDescription, setNewEventDescription,
    newEventColor, setNewEventColor,
    newEventRecurrence, setNewEventRecurrence,
    selectedEventDetails, setSelectedEventDetails,
    eventPopupPosition, setEventPopupPosition,
    pendingDeleteEvent, setPendingDeleteEvent,
    syncGoogleData,
    handleDeleteEvent,
    executeDeleteEvent,
    handleEventResize,
    toggleMember,
    toggleSelectAllMembers,
    handleRangeSelect,
    handleEventClick,
    handleEditEventClick,
    handleCreateEvent,
  };
}
