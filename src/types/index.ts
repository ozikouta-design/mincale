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
  isAllDay?: boolean; // ★ 追加：終日イベントかどうかのフラグ
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