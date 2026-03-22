/**
 * useWeekHorizontalScroll
 * WeekViewのスマホ水平スクロールを1週間単位に制限するhook。
 *
 * 【問題】iOSのモメンタムスクロールが snap-mandatory を飛び越え、
 *         一気に数ヶ月移動してしまう。
 *
 * 【解決】touchmove で scrollLeft を直接制御し、最大移動量を
 *         1週間分（dayWidth * 7）に制限する。
 *         touchend で 25% 以上スワイプしたら次の週へスナップ。
 */
import { useEffect, RefObject } from "react";

export function useWeekHorizontalScroll(
  ref: RefObject<HTMLDivElement | null>,
  dayWidth: number,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || dayWidth <= 0) return;
    const el = ref.current;
    if (!el) return;

    const pageWidth = dayWidth * 7;
    let startX = 0;
    let startScrollLeft = 0;
    let axis: "x" | "y" | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startScrollLeft = el.scrollLeft;
      axis = null;
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = startX - touch.clientX;
      const dy = touch.clientY - e.touches[0].clientY;

      // 軸が未確定の場合は決定する
      if (axis === null) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          axis = Math.abs(dx) >= Math.abs(Math.abs(dy)) ? "x" : "y";
        }
      }

      if (axis === "x") {
        // 1週間分を超えないようにクランプ
        const clampedDx = Math.max(-pageWidth, Math.min(pageWidth, dx));
        el.scrollLeft = startScrollLeft + clampedDx;
        e.preventDefault(); // 縦スクロールを防ぐ（横スワイプ時のみ）
      }
    };

    const onEnd = () => {
      if (axis !== "x") return;
      const moved = el.scrollLeft - startScrollLeft;
      const threshold = pageWidth * 0.2; // 20%以上で次の週へ

      const direction =
        moved > threshold ? 1 : moved < -threshold ? -1 : 0;
      const targetScrollLeft =
        Math.round((startScrollLeft + direction * pageWidth) / pageWidth) *
        pageWidth;

      el.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, dayWidth, enabled]);
}