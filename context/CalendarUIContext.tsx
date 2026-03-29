import { createContext, useContext } from 'react';
import { ViewMode } from '@/types';

/** カレンダーUI状態（ビューモード・ナビゲーション）のコンテキスト型 */
export interface UIContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  syncRangeDays: number;
  setSyncRangeDays: (days: number) => Promise<void>;
}

export const CalendarUIContext = createContext<UIContextType | undefined>(undefined);

/** カレンダーUIの状態とナビゲーション操作にアクセスするフック */
export function useCalendarUIContext(): UIContextType {
  const ctx = useContext(CalendarUIContext);
  if (!ctx) throw new Error('useCalendarUIContext must be used within CalendarProvider');
  return ctx;
}
