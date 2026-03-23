/**
 * useTouchAxisScroll
 * タッチ操作時に最初の移動方向（縦 or 横）に軸をロックし、
 * 斜めスクロールを防ぐ。
 */
import { useEffect, RefObject } from "react";

export function useTouchAxisScroll(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let axis: "x" | "y" | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      axis = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!axis) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx < 3 && dy < 3) return;
        axis = dx > dy ? "x" : "y";
      }
      // 横スクロール軸のとき縦スクロールを止める
      if (axis === "x") {
        e.preventDefault();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [ref, enabled]);
}
