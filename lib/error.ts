import { Alert } from 'react-native';

/**
 * ユーザー起点の操作で発生したエラーをコンソールに記録しつつ
 * Alert でユーザーに通知する共通ハンドラ
 */
export function handleApiError(err: unknown, userMessage: string): void {
  console.error(err);
  Alert.alert('エラー', userMessage);
}
