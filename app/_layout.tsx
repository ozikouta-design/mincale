import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { CalendarProvider } from '@/context/CalendarContext';

// OAuth ポップアップが戻ってきた際に認証を完了させる（Web 必須）
WebBrowser.maybeCompleteAuthSession();

// Web: PWA に必要な <link> / <meta> タグを動的に注入
// (+html.tsx では Expo が <link> タグをフィルタリングするため)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const injectIfMissing = (tag: string, attrs: Record<string, string>) => {
    const selector = Object.entries(attrs)
      .map(([k, v]) => `[${k}="${v}"]`)
      .join('');
    if (!document.head.querySelector(selector)) {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    }
  };
  // manifest
  injectIfMissing('link', { rel: 'manifest', href: '/manifest.json' });
  // apple-touch-icon
  injectIfMissing('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  // apple PWA meta
  injectIfMissing('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  injectIfMissing('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  injectIfMissing('meta', { name: 'apple-mobile-web-app-title', content: 'みんカレ' });
  // viewport-fit for iPhone notch
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !vp.getAttribute('content')?.includes('viewport-fit')) {
    vp.setAttribute('content', vp.getAttribute('content') + ', viewport-fit=cover');
  }
}

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CalendarProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="event/create"
            options={{ presentation: 'modal', title: '予定を作成' }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{ presentation: 'modal', title: '予定の詳細' }}
          />
          <Stack.Screen
            name="booking/[slug]"
            options={{ title: '予約' }}
          />
        </Stack>
      </CalendarProvider>
    </ThemeProvider>
  );
}
