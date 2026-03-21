import { useEffect, RefObject } from "react";

/**
 * iPhone向けタッチスクロール軸ロック
 * 最初に検出した方向（縦 or 横）に固定し、斜めスクロールを防ぐ
 */
export function useTouchAxisScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let axis: "x" | "y" | null = null;
    let startX = 0;
    let startY = 0;
    const THRESHOLD = 8; // px: 軸を確定するまでの最小移動量

    const onStart = (e: TouchEvent) => {
      // イベントカード・ボタン上のタッチは除外（ドラッグ操作と競合しないよう）
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-axis-lock], .calendar-event, button")) return;
      axis = null;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      // 軸ロック解除状態にリセット
      el.style.overflowX = "auto";
      el.style.overflowY = "auto";
    };

    const onMove = (e: TouchEvent) => {
      if (axis !== null) return; // 軸が確定済みなら再チェック不要
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (Math.max(dx, dy) < THRESHOLD) return;

      axis = dx > dy ? "x" : "y";
      if (axis === "x") {
        // 横スクロール → 縦をロック
        el.style.overflowY = "hidden";
        el.style.overflowX = "auto";
      } else {
        // 縦スクロール → 横をロック
        el.style.overflowX = "hidden";
        el.style.overflowY = "auto";
      }
    };

    const onEnd = () => {
      axis = null;
      el.style.overflowX = "auto";
      el.style.overflowY = "auto";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled]);
}
