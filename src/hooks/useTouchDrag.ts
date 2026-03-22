/**
 * useTouchDrag
 * 既存イベントのタッチドラッグ（軸ロック付き）と
 * Todoカードのタッチドラッグ→カレンダードロップを管理するhook。
 */
import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { TodoTouchDragState, DragOverSlot } from "@/types";

interface TouchDragInfo {
  eventId: string;
  memberId: string;
  isGoogle: boolean;
  ghostX: number;
  ghostY: number;
  title: string;
  color: string;
  isDragging: boolean;
  initX: number;
  initY: number;
  isPending: boolean;
  dragAxis?: "x" | "y";
}

interface SlotResult {
  dayIndex: number;
  colIndex: number;
  startHour: number;
  memberId?: string;
}

interface UseTouchDragProps {
  getSlotFromTouch: (x: number, y: number) => SlotResult | null;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dayIndex: number, startHour: number) => void;
  todoTouchDrag: TodoTouchDragState | null;
  setTodoTouchDrag: React.Dispatch<React.SetStateAction<TodoTouchDragState | null>>;
  setDragOverSlot: (slot: DragOverSlot | null) => void;
}

export function useTouchDrag({
  getSlotFromTouch,
  handleDrop,
  todoTouchDrag,
  setTodoTouchDrag,
  setDragOverSlot,
}: UseTouchDragProps) {
  const [touchDragInfo, setTouchDragInfo] = useState<TouchDragInfo | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchEventDragStart = useCallback(
    (
      eventId: string,
      isGoogle: boolean,
      memberId: string,
      clientX: number,
      clientY: number,
      title: string,
      color: string
    ) => {
      setTouchDragInfo({
        eventId,
        memberId,
        isGoogle,
        ghostX: clientX,
        ghostY: clientY,
        title,
        color,
        isDragging: false,
        initX: clientX,
        initY: clientY,
        isPending: true,
      });
      touchTimerRef.current = setTimeout(() => {
        setTouchDragInfo((prev) => (prev ? { ...prev, isPending: false } : null));
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(30);
      }, 400);
    },
    []
  );

  // ── 既存イベントのタッチドラッグ ─────────────────────────────────
  useEffect(() => {
    if (!touchDragInfo) return;
    const DRAG_THRESHOLD = 8;

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchDragInfo.initX;
      const dy = touch.clientY - touchDragInfo.initY;

      if (touchDragInfo.isPending) {
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
          setTouchDragInfo(null);
        }
        return;
      }
      e.preventDefault();

      let newAxis = touchDragInfo.dragAxis;
      if (!newAxis && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        newAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      let currentX = touch.clientX;
      let currentY = touch.clientY;
      if (newAxis === "x") currentY = touchDragInfo.initY;
      else if (newAxis === "y") currentX = touchDragInfo.initX;

      const slot = getSlotFromTouch(currentX, currentY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      setTouchDragInfo((prev) =>
        prev ? { ...prev, ghostX: currentX, ghostY: currentY, isDragging: true, dragAxis: newAxis } : null
      );
    };

    const onEnd = (e: TouchEvent) => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (!touchDragInfo.isDragging) {
        setTouchDragInfo(null);
        setDragOverSlot(null);
        return;
      }
      const touch = e.changedTouches[0];
      let finalX = touch.clientX;
      let finalY = touch.clientY;
      if (touchDragInfo.dragAxis === "x") finalY = touchDragInfo.initY;
      else if (touchDragInfo.dragAxis === "y") finalX = touchDragInfo.initX;

      const slot = getSlotFromTouch(finalX, finalY);
      if (slot) {
        const { eventId, memberId } = touchDragInfo;
        const fake = {
          preventDefault: () => {},
          dataTransfer: {
            getData: (k: string) =>
              ({ type: "event", eventId, memberId } as Record<string, string>)[k] ?? "",
          },
        } as unknown as React.DragEvent<HTMLDivElement>;
        handleDrop(fake, slot.dayIndex, slot.startHour);
      }
      setTouchDragInfo(null);
      setDragOverSlot(null);
    };

    const onCancel = () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      setTouchDragInfo(null);
      setDragOverSlot(null);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [touchDragInfo, getSlotFromTouch, handleDrop]);

  // ── Todoタッチドラッグ→カレンダードロップ ──────────────────────
  useEffect(() => {
    if (!todoTouchDrag?.isDragging) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setTodoTouchDrag((prev) =>
        prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY } : null
      );
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot) setDragOverSlot({ dayIndex: slot.dayIndex, startHour: Math.floor(slot.startHour) });
      else setDragOverSlot(null);
    };

    const onEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const slot = getSlotFromTouch(touch.clientX, touch.clientY);
      if (slot && todoTouchDrag) {
        const { todoId } = todoTouchDrag;
        const fake = {
          preventDefault: () => {},
          dataTransfer: {
            getData: (k: string) =>
              ({ type: "todo", todoId: todoId.toString() } as Record<string, string>)[k] ?? "",
          },
        } as unknown as React.DragEvent<HTMLDivElement>;
        handleDrop(fake, slot.dayIndex, slot.startHour);
      } else if (todoTouchDrag && !slot) {
        toast.error("カレンダーの時間帯にドロップしてください");
      }
      setTodoTouchDrag(null);
      setDragOverSlot(null);
    };

    const onCancel = () => {
      setTodoTouchDrag(null);
      setDragOverSlot(null);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [todoTouchDrag, getSlotFromTouch, handleDrop, setTodoTouchDrag]);

  return { touchDragInfo, handleTouchEventDragStart };
}
