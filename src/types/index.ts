// カレンダーのメンバー（Googleカレンダーのアカウント情報など）
export interface Member {
  id: string;
  name: string;
  colorHex: string;
  initials: string;
  primary: boolean;
}

// 予定（イベント）データ
export interface CalendarEvent {
  id: string;
  memberId: string;
  title: string;
  dayIndex: number;
  startHour: number;
  duration: number;
  isGoogle: boolean;
  colorHex: string | null;
  colorId?: string;
  recurrence?: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
}

// Todo（タスク）データ
export interface Todo {
  id: number;
  title: string;
  project?: string;
  due_date?: string;
  is_completed: boolean;
  user_email: string;
  created_at?: string;
}

// グループデータ
export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

// ── カレンダーUI状態型（any 撲滅用） ────────────────────────────

/** 新規予定作成時の範囲選択状態 */
export interface SelectionState {
  dayIndex: number;
  colIndex: number;
  memberId?: string;
  startHour: number;
  currentHour: number;
}

/** 既存予定リサイズ中の状態 */
export interface ResizingEventState {
  eventId: string;
  initialDuration: number;
  startY: number;
  currentDuration: number;
  memberId: string;
}

/** カレンダーの日情報 */
export interface DayData {
  dayIndex: number;
  label: string;
  isToday: boolean;
  date: Date;
}

/** カレンダーの月情報 */
export interface MonthData {
  year: number;
  month: number;
  monthIndex: number;
  date: Date;
}

/** イベントレイアウト計算結果 */
export interface EventLayout {
  column: number;
  totalColumns: number;
}

/** ドラッグオーバー中のスロット */
export interface DragOverSlot {
  dayIndex: number;
  startHour: number;
}

/** Todo タッチドラッグ状態 */
export interface TodoTouchDragState {
  todoId: number;
  title: string;
  ghostX: number;
  ghostY: number;
  isDragging: boolean;
}
