import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalendarContext } from '@/context/CalendarContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import MonthView from '@/components/calendar/MonthView';
import { LogIn } from 'lucide-react-native';

export default function CalendarScreen() {
  const { viewMode, isAuthenticated, isLoading, signIn } = useCalendarContext();

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
      <CalendarHeader />
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#4285F4" />
        </View>
      )}
      <View style={styles.content}>
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'day' && <DayView />}
        {viewMode === 'month' && <MonthView />}
      </View>
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
