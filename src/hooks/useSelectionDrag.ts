/**
 * useSelectionDrag
 * 長押し（タッチ）・マウスドラッグによる新規予定の範囲選択を管理するhook。
 *
 * 【重要な修正点】
 * ① キャンセル閾値を 10px → 30px に変更
 *    iPhoneは長押し待機中（450ms）に指先が普通に10〜15px揺れる。
 *    10pxのままだと毎回キャンセルされていた。
 *
 * ② calcHourFromDayCol で data-day-index 要素の getBoundingClientRect() を使用
 *    getBoundingClientRect().top はスクロール済みのビューポート座標を返すため、
 *    scrollTop を足す必要がなく常に正確な時刻が得られる。
 */
import { useState, useRef, useCallback, useEffect, RefObject } from "react";
import { SelectionState } from "@/types";

interface SlotResult {
  dayIndex: number;
  colIndex: number;
  startHour: number;
  memberId?: string;
}

interface UseSelectionDragProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  hourHeight: number;
  getSlotFromTouch: (x: number, y: number) => SlotResult | null;
  handleRangeSelect: (dayIndex: number, startHour: number, duration: number) => void;
}

export function useSelectionDrag({
  wrapperRef,
  hourHeight,
  getSlotFromTouch,
  handleRangeSelect,
}: UseSelectionDragProps) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const selRef = useRef<SelectionState | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressActivatedRef = useRef(false);

  /**
   * data-day-index 要素の getBoundingClientRect().top から時刻を計算。
   * getBoundingClientRect はスクロール量を自動的に反映したビューポート座標を返すため、
   * scrollTop の加算が不要で、常に正確な値が得られる。
   */
  const calcHourFromDayCol = useCallback(
    (dayIndex: number, clientY: number): number => {
      const dayCol = document.querySelector(
        `[data-day-index="${dayIndex}"]`
      ) as HTMLElement | null;
      if (!dayCol) return 0;
      const relY = clientY - dayCol.getBoundingClientRect().top;
      return Math.max(0, Math.min(23.75, Math.round((relY / hourHeight) * 4) / 4));
    },
    [hourHeight]
  );

  // ── タッチ長押し（新規予定作成） ────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest(".calendar-event") ||
        target.closest(".modal-content") ||
        target.closest("[data-no-axis-lock]")
      ) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      longPressActivatedRef.current = false;

      // タッチ瞬間のスロットを即時取得（DOM状態が安定している瞬間）
      const immediateSlot = getSlotFromTouch(startX, startY);

      longPressTimerRef.current = setTimeout(() => {
        if (!immediateSlot) return;
        longPressActivatedRef.current = true;
        const newSel: SelectionState = {
          dayIndex: immediateSlot.dayIndex,
          colIndex: immediateSlot.colIndex,
          memberId: immediateSlot.memberId,
          startHour: immediateSlot.startHour,
          currentHour: immediateSlot.startHour + 1,
        };
        selRef.current = newSel;
        setSelection(newSel);
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      }, 450);
    };

    const onTouchMove = (e: TouchEvent) => {
      // ── 長押し確定後：スクロールを止めて枠をドラッグ ──
      if (longPressActivatedRef.current && selRef.current) {
        e.preventDefault();
        const newHour = calcHourFromDayCol(
          selRef.current.dayIndex,
          e.touches[0].clientY
        );
        selRef.current = { ...selRef.current, currentHour: newHour };
        setSelection({ ...selRef.current });
        return;
      }

      // ── 長押し待機中：30px 以上動いたらキャンセル ──
      // ★旧: 10px → iPhoneで常にキャンセルされていた
      // ★新: 30px → 明確なスクロール意図のみキャンセル
      if (longPressTimerRef.current) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > 30) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!longPressActivatedRef.current || !selRef.current) return;

      const sel = selRef.current;
      // calcHourFromDayCol で正確な終了時刻を計算
      const finalHour = calcHourFromDayCol(sel.dayIndex, e.changedTouches[0].clientY);
      const startHr = Math.min(sel.startHour, finalHour);
      const endHr = Math.max(sel.startHour, finalHour);
      let duration = Math.round((endHr - startHr) * 4) / 4;
      if (duration < 0.25) duration = 1;

      handleRangeSelect(sel.dayIndex, Math.round(startHr * 4) / 4, duration);
      setSelection(null);
      selRef.current = null;
      longPressActivatedRef.current = false;
      if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(20);
    };

    const onTouchCancel = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (longPressActivatedRef.current) {
        setSelection(null);
        selRef.current = null;
        longPressActivatedRef.current = false;
      }
    };

    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    // passive:false が必須 → 長押し確定後に e.preventDefault() を呼ぶため
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapper.addEventListener("touchend", onTouchEnd, { passive: true });
    wrapper.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      wrapper.removeEventListener("touchend", onTouchEnd);
      wrapper.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [wrapperRef, getSlotFromTouch, calcHourFromDayCol, handleRangeSelect]);

  // ── マウス選択（PC）────────────────────────────────────────────
  useEffect(() => {
    if (!selection) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!selRef.current) return;
      const newHour = calcHourFromDayCol(selRef.current.dayIndex, e.clientY);
      setSelection((prev) => (prev ? { ...prev, currentHour: newHour } : null));
    };

    const onMouseUp = () => {
      if (selRef.current) {
        const sel = selRef.current;
        const start = Math.min(sel.startHour, sel.currentHour);
        const end = Math.max(sel.startHour, sel.currentHour);
        let duration = Math.round((end - start) * 4) / 4;
        if (duration < 0.25) duration = 1;
        handleRangeSelect(sel.dayIndex, Math.round(start * 4) / 4, duration);
        setSelection(null);
        selRef.current = null;
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [selection, calcHourFromDayCol, handleRangeSelect]);

  /** hour slot の mousedown ハンドラ（WeekView/DayView から呼ぶ） */
  const handleSlotMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      dayIndex: number,
      colIndex: number,
      memberId?: string
    ) => {
      const dayCol = (e.currentTarget as HTMLElement).closest(
        "[data-day-index]"
      ) as HTMLElement | null;
      if (!dayCol) return;
      const exactHour = Math.max(
        0,
        Math.min(23.75, (e.clientY - dayCol.getBoundingClientRect().top) / hourHeight)
      );
      const newSel: SelectionState = {
        dayIndex, colIndex, memberId,
        startHour: exactHour,
        currentHour: exactHour,
      };
      selRef.current = newSel;
      setSelection(newSel);
    },
    [hourHeight]
  );

  return { selection, setSelection, selectionActive: !!selection, handleSlotMouseDown };
}