/**
 * useWeekTouch
 * =========================================================
 * 週ビューのタッチ操作を「このファイルだけ」で完結させる。
 *
 * 担当する操作:
 *  1. 水平スワイプ → 1週間単位でスナップ（モメンタム暴走なし）
 *  2. 垂直スクロール（通常）
 *  3. 長押し → 新規予定の枠を作成（30px以上動いたらキャンセル）
 *  4. 長押し後ドラッグ → 枠の終端を伸ばす
 *
 * 座標の取り方（唯一のルール）:
 *  - dayCol.getBoundingClientRect().top を使う
 *  - scrollTop の加算は不要（getBoundingClientRect は scroll 済み座標）
 *  - TIME_AXIS_W / DAY_HEADER_H の減算は不要
 *
 * 競合ゼロの設計:
 *  - CalendarMain はこの hook を呼ぶだけ
 *  - resize は別 hook (useResizeDrag) が担当 → touchmove を奪わない
 */

import { useEffect, useRef, RefObject } from "react";
import { LONG_PRESS_MS, SWIPE_CANCEL_PX, HOUR_H } from "@/constants/calendar";
import type { SelectionState, DayData } from "@/types";

interface Options {
  /** scrollable container of the week grid */
  scrollRef: RefObject<HTMLDivElement | null>;
  days: DayData[];
  dayWidth: number;         // px – width of each day column (TIME_AXIS_W を除いた部分 / 7)
  hourHeight?: number;
  selectionActive: boolean; // true while a new-event rectangle is being drawn
  onSelectionStart: (sel: SelectionState) => void;
  onSelectionUpdate: (endHour: number) => void;
  onSelectionCommit: () => void;
  onSelectionCancel: () => void;
}

/** Resolve data-day-index → DayData */
function findDayByIndex(days: DayData[], dayIndex: number) {
  return days.find((d) => d.dayIndex === dayIndex) ?? null;
}

/** Get hour from clientY using the day column's bounding rect */
function hourFromClientY(dayIndex: number, clientY: number, hourH: number): number {
  const col = document.querySelector(`[data-day-index="${dayIndex}"]`) as HTMLElement | null;
  if (!col) return 0;
  const relY = clientY - col.getBoundingClientRect().top;
  return Math.max(0, Math.min(23.75, Math.round((relY / hourH) * 4) / 4));
}

/** Get dayIndex from clientX within the scroll container */
function dayIndexFromClientX(
  scrollEl: HTMLElement,
  clientX: number,
  dayWidth: number,
  days: DayData[]
): number | null {
  // Use elementFromPoint to find the actual [data-day-index] column
  const el = document.elementFromPoint(clientX, scrollEl.getBoundingClientRect().top + 100);
  const col = el?.closest("[data-day-index]") as HTMLElement | null;
  if (col) {
    const idx = Number(col.getAttribute("data-day-index"));
    if (days.some((d) => d.dayIndex === idx)) return idx;
  }
  return null;
}

export function useWeekTouch({
  scrollRef,
  days,
  dayWidth,
  hourHeight = HOUR_H,
  selectionActive,
  onSelectionStart,
  onSelectionUpdate,
  onSelectionCommit,
  onSelectionCancel,
}: Options) {
  // refs so closures always get the latest values without re-registering listeners
  const daysRef = useRef(days);
  const dayWidthRef = useRef(dayWidth);
  const hourHRef = useRef(hourHeight);
  const selActiveRef = useRef(selectionActive);
  useEffect(() => { daysRef.current = days; }, [days]);
  useEffect(() => { dayWidthRef.current = dayWidth; }, [dayWidth]);
  useEffect(() => { hourHRef.current = hourHeight; }, [hourHeight]);
  useEffect(() => { selActiveRef.current = selectionActive; }, [selectionActive]);

  const onSelStartRef = useRef(onSelectionStart);
  const onSelUpdateRef = useRef(onSelectionUpdate);
  const onSelCommitRef = useRef(onSelectionCommit);
  const onSelCancelRef = useRef(onSelectionCancel);
  useEffect(() => { onSelStartRef.current = onSelectionStart; }, [onSelectionStart]);
  useEffect(() => { onSelUpdateRef.current = onSelectionUpdate; }, [onSelectionUpdate]);
  useEffect(() => { onSelCommitRef.current = onSelectionCommit; }, [onSelectionCommit]);
  useEffect(() => { onSelCancelRef.current = onSelectionCancel; }, [onSelectionCancel]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // ── state ──────────────────────────────────────────────────
    let touchPhase: "idle" | "deciding" | "horizontal" | "vertical" | "longpress" = "idle";
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressDayIndex: number | null = null;
    let longPressStartHour = 0;
    let longPressColIndex = 0;

    // ── helpers ────────────────────────────────────────────────
    const cancelLongPress = () => {
      if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    const snapToWeek = (direction: -1 | 0 | 1) => {
      const pw = dayWidthRef.current * 7;
      const base = Math.round(startScrollLeft / pw) * pw;
      const target = Math.max(0, base + direction * pw);
      el.scrollTo({ left: target, behavior: "smooth" });
    };

    // ── touchstart ─────────────────────────────────────────────
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = el.scrollLeft;
      touchPhase = "deciding";

      // Don't start long-press on event cards or buttons
      const target = e.target as HTMLElement;
      if (target.closest(".cal-event") || target.closest("button")) return;

      // Schedule long-press
      const ci = daysRef.current.findIndex(
        (d) => d.dayIndex === dayIndexFromClientX(el, t.clientX, dayWidthRef.current, daysRef.current)
      );
      const di = ci >= 0 ? daysRef.current[ci].dayIndex : null;

      if (di !== null) {
        longPressDayIndex = di;
        longPressColIndex = ci;
        longPressStartHour = hourFromClientY(di, t.clientY, hourHRef.current);

        longPressTimer = setTimeout(() => {
          if (touchPhase !== "deciding") return; // finger moved → already horizontal/vertical
          touchPhase = "longpress";
          if (navigator.vibrate) navigator.vibrate(40);
          onSelStartRef.current({
            dayIndex: di,
            colIndex: longPressColIndex,
            startHour: longPressStartHour,
            endHour: longPressStartHour + 1,
          });
        }, LONG_PRESS_MS);
      }
    };

    // ── touchmove ──────────────────────────────────────────────
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ── longpress phase: drag the end of the selection rect ──
      if (touchPhase === "longpress" && longPressDayIndex !== null) {
        e.preventDefault(); // stop page scroll while drawing rect
        const newEnd = hourFromClientY(longPressDayIndex, t.clientY, hourHRef.current);
        onSelUpdateRef.current(newEnd);
        return;
      }

      // ── deciding phase ──
      if (touchPhase === "deciding") {
        if (dist < 6) return; // too small, keep waiting

        if (dist > SWIPE_CANCEL_PX) {
          // Clearly moved → cancel long-press
          cancelLongPress();
        }

        // Determine axis
        if (Math.abs(dx) > Math.abs(dy)) {
          touchPhase = "horizontal";
          cancelLongPress();
        } else {
          touchPhase = "vertical";
          cancelLongPress();
        }
      }

      // ── horizontal: control scrollLeft directly ──
      if (touchPhase === "horizontal") {
        e.preventDefault(); // prevent page bounce
        const pw = dayWidthRef.current * 7;
        // Clamp to ±1 week from start position
        const clampedDx = Math.max(-pw, Math.min(pw, dx));
        el.scrollLeft = startScrollLeft - clampedDx;
      }
      // vertical → browser handles naturally (no preventDefault)
    };

    // ── touchend ───────────────────────────────────────────────
    const onEnd = (e: TouchEvent) => {
      cancelLongPress();

      if (touchPhase === "longpress" && longPressDayIndex !== null) {
        onSelCommitRef.current();
        touchPhase = "idle";
        return;
      }

      if (touchPhase === "horizontal") {
        const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
        const pw = dayWidthRef.current * 7;
        const moved = -dx; // positive = scrolled right
        const threshold = pw * 0.2;
        const dir = moved > threshold ? 1 : moved < -threshold ? -1 : 0;
        snapToWeek(dir as -1 | 0 | 1);
        touchPhase = "idle";
        return;
      }

      touchPhase = "idle";
    };

    // ── touchcancel ────────────────────────────────────────────
    const onCancel = () => {
      cancelLongPress();
      if (touchPhase === "longpress") onSelCancelRef.current();
      touchPhase = "idle";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      cancelLongPress();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  // Only re-register when the scroll element changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef]);
}
