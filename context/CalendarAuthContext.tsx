import { createContext, useContext } from 'react';
import { UserProfile } from '@/types';

/** 認証・プロフィール関連のコンテキスト型 */
export interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  profile: UserProfile | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const CalendarAuthContext = createContext<AuthContextType | undefined>(undefined);

/** 認証状態とプロフィールにアクセスするフック */
export function useAuthContext(): AuthContextType {
  const ctx = useContext(CalendarAuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within CalendarProvider');
  return ctx;
}
