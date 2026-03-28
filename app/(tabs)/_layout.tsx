import React from 'react';
import { Tabs } from 'expo-router';
import { Calendar, Clock, CalendarCheck, Settings } from 'lucide-react-native';
import { C } from '@/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.borderLight,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'カレンダー',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="free-slots"
        options={{
          title: '空き時間',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: '予約',
          tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
