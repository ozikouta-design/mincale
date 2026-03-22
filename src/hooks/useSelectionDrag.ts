/**
 * useSelectionDrag
 * 長押し（タッチ）・マウスドラッグによる新規予定の範囲選択を管理するhook。
 *
 * 【座標計算の根本修正】
 *   旧コード: parentElement.parentElement.getBoundingClientRect() - CALENDAR_HEADER_HEIGHT
 *     → time-gridのtopから CALENDAR_HEADER_HEIGHT(72px) を余分に引いていたため
 *       スクロールなし時でも 72/64≈1.1h ずれていた。
 *   新コード: data-day-index 要素の getBoundingClientRect().top を直接使用。
 *     → (clientY - dayColRect.top) / hourHeight で正確に時刻を計算。
 *        スクロール量・CalendarHeader高さの影響を受けない。
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
   * data-day-index 要素のrectから時刻を計算（共通ヘルパー）
   * これが座標バグ修正の核心。
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

      // タッチ瞬間のスロットを即時取得（DOM状態が安定している）
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
      if (longPressActivatedRef.current && selRef.current) {
        // 長押し確定後：iOSスクロールを止めて枠をドラッグ
        e.preventDefault();
        const newHour = calcHourFromDayCol(
          selRef.current.dayIndex,
          e.touches[0].clientY
        );
        selRef.current = { ...selRef.current, currentHour: newHour };
        setSelection({ ...selRef.current });
        return;
      }
      // 長押し待機中：指が動いたらキャンセル
      if (longPressTimerRef.current) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > 30) { // ★ 30px: iPhoneの指先ゆれ対策(旧10pxだと常にキャンセルされた)
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
      if (longPressActivatedRef.current && selRef.current) {
        const sel = selRef.current;
        const finalHour = calcHourFromDayCol(
          sel.dayIndex,
          e.changedTouches[0].clientY
        );
        const startHr = Math.min(sel.startHour, finalHour);
        const endHr = Math.max(sel.startHour, finalHour);
        let duration = Math.round((endHr - startHr) * 4) / 4;
        if (duration < 0.25) duration = 1;
        handleRangeSelect(sel.dayIndex, Math.round(startHr * 4) / 4, duration);
        setSelection(null);
        selRef.current = null;
        longPressActivatedRef.current = false;
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(20);
      }
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

  /**
   * hour slot の mousedown ハンドラ（WeekView/DayView から呼ぶ）
   * 【修正】data-day-index 要素の rect を使って正確に時刻計算
   */
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
        Math.min(
          23.75,
          (e.clientY - dayCol.getBoundingClientRect().top) / hourHeight
        )
      );
      const newSel: SelectionState = {
        dayIndex,
        colIndex,
        memberId,
        startHour: exactHour,
        currentHour: exactHour,
      };
      selRef.current = newSel;
      setSelection(newSel);
    },
    [hourHeight]
  );

  return {
    selection,
    setSelection,
    selectionActive: !!selection,
    handleSlotMouseDown,
  };
}
