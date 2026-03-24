export const HOUR_HEIGHT = 64;
export const TIME_AXIS_WIDTH = 52;
export const CALENDAR_HEADER_HEIGHT = 72;
export const SNAP_STEP_MINUTES = 15;
export const MIN_EVENT_DURATION = 0.25; // 15min in hours
export const MAX_VISIBLE_EVENTS_MONTH = 3;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];
export const MONTH_LABELS_JA = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

export const EVENT_COLORS = [
  '#4285F4', // Blue (Google)
  '#EA4335', // Red
  '#FBBC04', // Yellow
  '#34A853', // Green
  '#FF6D01', // Orange
  '#46BDC6', // Teal
  '#7986CB', // Lavender
  '#E67C73', // Flamingo
];

export const DEFAULT_WORKING_HOURS = {
  start: 9,
  end: 18,
};
