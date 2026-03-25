import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  PanResponder, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalendarContext } from '@/context/CalendarContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import MonthView from '@/components/calendar/MonthView';
import { LogIn } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CalendarScreen() {
  const { viewMode, isAuthenticated, isLoading, signIn, goNext, goPrev, currentDate } = useCalendarContext();

  // スライドアニメーション
  const slideAnim = useRef(new Animated.Value(0)).current;
  // ナビゲーション方向を追跡するref（next=右スワイプで次、prev=左スワイプで前）
  const directionRef = useRef<'next' | 'prev'>('next');

  // currentDate が変わったときにスライドアニメーションを実行
  useEffect(() => {
    const startX = directionRef.current === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideAnim.setValue(startX);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 280,
      friction: 32,
      useNativeDriver: true,
    }).start();
  }, [currentDate, viewMode]);

  // アニメーション付きナビゲーション関数
  const navigateNext = useCallback(() => {
    directionRef.current = 'next';
    goNext();
  }, [goNext]);

  const navigatePrev = useCallback(() => {
    directionRef.current = 'prev';
    goPrev();
  }, [goPrev]);

  // PanResponder用のrefを最新の関数に保持
  const navigateNextRef = useRef(navigateNext);
  const navigatePrevRef = useRef(navigatePrev);
  navigateNextRef.current = navigateNext;
  navigatePrevRef.current = navigatePrev;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) navigateNextRef.current();
        else if (gs.dx > 50) navigatePrevRef.current();
      },
    })
  ).current;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.appTitle}>Calendar</Text>
          <Text style={styles.loginSubtext}>
            Googleアカウントでログインして{'\n'}カレンダーを同期しましょう
          </Text>
          <TouchableOpacity onPress={signIn} style={styles.loginButton} activeOpacity={0.7}>
            <LogIn size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Googleでログイン</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダーにアニメーション付きナビゲーションを渡す */}
      <CalendarHeader onNext={navigateNext} onPrev={navigatePrev} />
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#4285F4" />
        </View>
      )}
      {/* スライドアニメーション付きコンテンツエリア */}
      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'day' && <DayView />}
        {viewMode === 'month' && <MonthView />}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingBar: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 12,
  },
  loginSubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4285F4',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
