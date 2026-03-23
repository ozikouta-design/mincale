/**
 * カレンダーレイアウトに関する定数
 */

// レイアウトサイズ
export const HEADER_HEIGHT_PX = 72;      // 予約ページやメインヘッダーの基準高
export const TIME_AXIS_WIDTH_PX = 64;    // 左側の時間軸（00:00等）の幅
export const CALENDAR_HEADER_HEIGHT = 72; // カレンダー上部の曜日表示エリアの高さ

// カレンダー表示設定
export const DEFAULT_HOUR_HEIGHT = 64;   // 1時間あたりの高さ(px)
export const HOUR_H = DEFAULT_HOUR_HEIGHT; // エイリアス
export const MIN_EVENT_DURATION = 0.25;  // 最小予定時間（15分）
export const SNAP_STEP_MINUTES = 15;     // スナップする単位（分）

// 表示制限
export const MAX_VISIBLE_EVENTS_MONTH = 2; // 月ビューで表示する最大イベント数

// スクロール
export const DEFAULT_SCROLL_HOUR = 8;   // 初期スクロール位置（時）

// 同期設定
export const SYNC_MONTHS = 3;           // 前後何ヶ月分を同期するか

// タッチ操作
export const LONG_PRESS_MS = 500;       // 長押し判定時間（ms）
export const SWIPE_CANCEL_PX = 30;      // スワイプキャンセル閾値（px）

// Google カレンダーイベントカラー（colorId → hex）
export const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1":  "#a4bdfc", // Lavender
  "2":  "#7ae7bf", // Sage
  "3":  "#dbadff", // Grape
  "4":  "#ff887c", // Flamingo
  "5":  "#fbd75b", // Banana
  "6":  "#ffb878", // Tangerine
  "7":  "#46d6db", // Peacock
  "8":  "#e1e1e1", // Graphite
  "9":  "#5484ed", // Blueberry
  "10": "#51b749", // Basil
  "11": "#dc2127", // Tomato
};