import { useCallback } from "react";
import { CalendarEvent, Todo } from "@/types";
import { formatLocalISO, GOOGLE_COLORS, getDayIndex } from "./useEventLogic";
import toast from "react-hot-toast";
import type { Session } from "next-auth";

interface DragDropDeps {
  session: Session | null;
  triggerHaptic: () => void;
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  selectedMemberIds: string[];
  setSelectedMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
  newEventMemberId: string;
  members: { id: string }[];
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDragDropLogic({
  session,
  triggerHaptic,
  todos,
  setTodos,
  events,
  setEvents,
  selectedMemberIds,
  setSelectedMemberIds,
  newEventMemberId,
  members,
  setIsRightPanelOpen,
}: DragDropDeps) {
  // TodoリストのDragStart
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, todoId: number) => {
      e.dataTransfer.setData("type", "todo");
      e.dataTransfer.setData("todoId", todoId.toString());
      if (window.innerWidth < 768) setIsRightPanelOpen(false);
      triggerHaptic();
    },
    [setIsRightPanelOpen, triggerHaptic]
  );

  // カレンダーイベントのDragStart
  const handleEventDragStart = useCallback(
    (
      e: React.DragEvent<HTMLDivElement>,
      eventId: string,
      isGoogle: boolean,
      memberId: string
    ) => {
      e.dataTransfer.setData("type", "event");
      e.dataTransfer.setData("eventId", eventId);
      e.dataTransfer.setData("isGoogle", isGoogle.toString());
      e.dataTransfer.setData("memberId", memberId);
      triggerHaptic();
    },
    [triggerHaptic]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Todo→イベント変換 or イベント移動
  const handleDrop = useCallback(
    async (
      e: React.DragEvent<HTMLDivElement>,
      dayIndex: number,
      startHour: number
    ) => {
      e.preventDefault();
      const dragType = e.dataTransfer.getData("type");
      triggerHaptic();

      if (dragType === "todo") {
        const draggedTodoId = parseInt(e.dataTransfer.getData("todoId"), 10);
        const targetTodo = todos.find((t) => t.id === draggedTodoId);

        // ★ primaryカレンダー（email）を最優先フォールバックに追加
        const primaryMember = members.find((m) => m.primary) || members[0];
        const targetCalendarId = newEventMemberId || primaryMember?.id || "";

        if (!targetTodo) {
          toast.error("タスクが見つかりません（再読み込みしてください）");
          return;
        }
        if (!targetCalendarId) {
          toast.error("保存先カレンダーが見つかりません。Googleでログインし直してください");
          return;
        }

        const accessToken = session?.accessToken;
        if (!accessToken) {
          toast.error("認証が切れています。一度ログアウト→再ログインしてください");
          return;
        }

        const h = Math.floor(startHour);
        const m = Math.round((startHour % 1) * 60);
        const y = Math.floor(dayIndex / 10000);
        const mo = Math.floor((dayIndex % 10000) / 100) - 1;
        const d = dayIndex % 100;
        const startDt = new Date(y, mo, d);
        startDt.setHours(h, m, 0, 0);
        const endDt = new Date(startDt.getTime() + 3600000);

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: targetTodo.title,
                start: { dateTime: formatLocalISO(startDt) },
                end: { dateTime: formatLocalISO(endDt) },
              }),
            }
          );
          if (!res.ok) throw new Error();
          const created = await res.json();

          // Supabase から todo 削除
          const { supabase } = await import("@/lib/supabase");
          await supabase.from("todos").delete().eq("id", draggedTodoId);

          setEvents((prev) => [
            ...prev,
            {
              id: created.id,
              memberId: targetCalendarId,
              title: targetTodo.title,
              dayIndex,
              startHour,
              duration: 1,
              isGoogle: true,
              colorHex: created.colorId ? GOOGLE_COLORS[created.colorId] : null,
              colorId: created.colorId || "",
              recurrence: created.recurrence ? created.recurrence[0] : "none",
              location: "",
              description: "",
            },
          ]);
          setTodos((prev) => prev.filter((t) => t.id !== draggedTodoId));
          if (!selectedMemberIds.includes(targetCalendarId)) {
            setSelectedMemberIds((prev) => [...prev, targetCalendarId]);
          }
          toast.success("タスクを予定に変換しました");
        } catch {
          toast.error("予定の作成に失敗しました");
        }
      } else if (dragType === "event") {
        const eventId = e.dataTransfer.getData("eventId");
        const memberId = e.dataTransfer.getData("memberId");
        const targetEvent = events.find((ev) => ev.id === eventId);
        if (!targetEvent) return;

        const previousEvents = [...events];
        setEvents((prev) =>
          prev.map((ev) => (ev.id === eventId ? { ...ev, dayIndex, startHour } : ev))
        );

        const accessToken = session?.accessToken;
        if (!accessToken) return;

        const h = Math.floor(startHour);
        const mMin = Math.round((startHour % 1) * 60);
        const y = Math.floor(dayIndex / 10000);
        const mo = Math.floor((dayIndex % 10000) / 100) - 1;
        const d = dayIndex % 100;
        const startDt = new Date(y, mo, d);
        startDt.setHours(h, mMin, 0, 0);
        const endDt = new Date(startDt.getTime() + targetEvent.duration * 3600000);

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(memberId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                start: { dateTime: formatLocalISO(startDt) },
                end: { dateTime: formatLocalISO(endDt) },
              }),
            }
          );
          if (!res.ok) throw new Error();
        } catch {
          setEvents(previousEvents);
          toast.error("予定の移動に失敗しました");
        }
      }
    },
    [session, triggerHaptic, todos, setTodos, events, setEvents, selectedMemberIds, setSelectedMemberIds, newEventMemberId, members]
  );

  return { handleDragStart, handleEventDragStart, handleDragOver, handleDrop };
}
