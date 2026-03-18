/**
 * カレンダーレイアウトに関する定数
 */

// レイアウトサイズ
export const HEADER_HEIGHT_PX = 72;      // 予約ページやメインヘッダーの基準高
export const TIME_AXIS_WIDTH_PX = 64;    // 左側の時間軸（00:00等）の幅
export const CALENDAR_HEADER_HEIGHT = 72; // カレンダー上部の曜日表示エリアの高さ

// カレンダー表示設定
export const DEFAULT_HOUR_HEIGHT = 64;   // 1時間あたりの高さ(px)
export const MIN_EVENT_DURATION = 0.25;  // 最小予定時間（15分）
export const SNAP_STEP_MINUTES = 15;     // スナップする単位（分）

// 表示制限
export const MAX_VISIBLE_EVENTS_MONTH = 2; // 月ビューで表示する最大イベント数