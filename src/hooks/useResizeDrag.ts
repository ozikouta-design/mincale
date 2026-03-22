/**
 * useResizeDrag
 * Handles ONLY the resize handle at the bottom of event cards.
 * Mouse + Touch. Does NOT interfere with useWeekTouch.
 */
import { useEffect, useRef } from "react";
import type { ResizingState } from "@/types";

interface Options {
  resizing: ResizingState | null;
  setResizing: (s: ResizingState | null) => void;
  hourHeight: number;
  onCommit: (eventId: string, memberId: string, duration: number) => void;
}

export function useResizeDrag({ resizing, setResizing, hourHeight, onCommit }: Options) {
  const resizingRef = useRef(resizing);
  useEffect(() => { resizingRef.current = resizing; }, [resizing]);
  const onCommitRef = useRef(onCommit);
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);

  useEffect(() => {
    if (!resizing) return;

    const move = (clientY: number) => {
      const r = resizingRef.current;
      if (!r) return;
      const delta = clientY - r.startY;
      const dur = Math.max(0.25, Math.round((r.initialDuration + delta / hourHeight) * 4) / 4);
      setResizing({ ...r, currentDuration: dur });
    };

    const commit = () => {
      const r = resizingRef.current;
      if (!r) return;
      onCommitRef.current(r.eventId, r.memberId, r.currentDuration);
      setResizing(null);
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientY);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); move(e.touches[0].clientY); };
    const onUp = () => commit();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [resizing, hourHeight, setResizing]);
}
