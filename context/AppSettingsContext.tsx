import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';

const SETTINGS_KEY = 'app_settings_v1';

export interface AppSettings {
  weekStartsOn: 0 | 1 | 6;                          // 週の始め
  defaultView: 'week' | 'day' | 'month';             // デフォルト表示
  defaultEventDuration: 15 | 30 | 60 | 90 | 120;    // デフォルト予定時間(分)
  timeFormat: '24h' | '12h';                         // 時間表示形式
  calendarStartHour: number;                         // カレンダー表示開始時刻
  highlightWeekends: boolean;                        // 週末ハイライト
  defaultGroupId: string | null;                     // デフォルト表示グループ
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  weekStartsOn: 0,
  defaultView: 'week',
  defaultEventDuration: 60,
  timeFormat: '24h',
  calendarStartHour: 8,
  highlightWeekends: true,
  defaultGroupId: null,
};

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULT_APP_SETTINGS,
  updateSettings: () => {},
});

function loadSettings(): AppSettings {
  try {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_APP_SETTINGS;
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        if (Platform.OS === 'web') localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
