/**
 * useInitialScroll
 * Scrolls the week/day container to today's week at DEFAULT_SCROLL_HOUR.
 *
 * Design rule: ONE scrollTo({ left, top }) call.
 * Never split left and top into separate calls – that fires onScroll mid-way
 * which was causing the "December jump" bug.
 */
import { useEffect, useRef, RefObject } from "react";
import { DEFAULT_SCROLL_HOUR, HOUR_H } from "@/constants/calendar";
import type { ViewMode, DayData, MonthData } from "@/types";

function getDayIndex(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

interface Options {
  viewMode: ViewMode;
  weekScrollRef: RefObject<HTMLDivElement | null>;
  dayScrollRef:  RefObject<HTMLDivElement | null>;
  monthScrollRef: RefObject<HTMLDivElement | null>;
  days: DayData[];
  months: MonthData[];
  weekStartDay: number;   // 0=Sun, 1=Mon
  dayWidth: number;       // actualDayWidth
  singleDayWidth: number;
  hourHeight?: number;
}

export function useInitialScroll({
  viewMode,
  weekScrollRef,
  dayScrollRef,
  monthScrollRef,
  days,
  months,
  weekStartDay,
  dayWidth,
  singleDayWidth,
  hourHeight = HOUR_H,
}: Options) {
  const didAlign = useRef<string | null>(null);

  // Reset when viewMode changes so we re-align
  useEffect(() => { didAlign.current = null; }, [viewMode]);

  useEffect(() => {
    // Wait until we have a valid width
    if (viewMode === "week" && dayWidth <= 0) return;
    if (viewMode === "day" && singleDayWidth <= 0) return;
    if (didAlign.current === viewMode) return;

    const scrollTop = DEFAULT_SCROLL_HOUR * hourHeight;

    const align = () => {
      if (viewMode === "week" && weekScrollRef.current) {
        const today = new Date();
        let offset = today.getDay() - weekStartDay;
        if (offset < 0) offset += 7;
        const weekStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
        const targetDI = getDayIndex(weekStartDate);

        // Use offsetLeft of the actual DOM element – no arithmetic guessing
        const col = weekScrollRef.current.querySelector(
          `[data-day-index="${targetDI}"]`
        ) as HTMLElement | null;
        const scrollLeft = col ? Math.max(0, col.offsetLeft - 52 /* TIME_AXIS_W */) : 0;

        weekScrollRef.current.scrollTo({ left: scrollLeft, top: scrollTop, behavior: "auto" });
        didAlign.current = viewMode;

      } else if (viewMode === "day" && dayScrollRef.current) {
        const idx = days.findIndex((d) => d.isToday);
        const scrollLeft = idx >= 0 ? idx * singleDayWidth : 0;
        dayScrollRef.current.scrollTo({ left: scrollLeft, top: scrollTop, behavior: "auto" });
        didAlign.current = viewMode;

      } else if (viewMode === "month" && monthScrollRef.current) {
        const now = new Date();
        const mi = months.findIndex(
          (m) => m.year === now.getFullYear() && m.month === now.getMonth()
        );
        if (mi >= 0) {
          const w = monthScrollRef.current.clientWidth;
          monthScrollRef.current.scrollTo({ left: mi * w, behavior: "auto" });
        }
        didAlign.current = viewMode;
      }
    };

    // Small delay so the DOM has rendered day columns with correct offsetLeft
    const t = setTimeout(align, 80);
    return () => clearTimeout(t);
  }, [viewMode, dayWidth, singleDayWidth, days, months, weekStartDay, hourHeight,
      weekScrollRef, dayScrollRef, monthScrollRef]);
}

export { getDayIndex };
