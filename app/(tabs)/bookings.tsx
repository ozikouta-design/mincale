import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { CalendarX } from 'lucide-react-native';
import { useBookings } from '@/hooks/useBookings';
import BookingCard from '@/components/bookings/BookingCard';
import { useCalendarContext } from '@/context/CalendarContext';

export default function BookingsScreen() {
  const { isAuthenticated, userEmail } = useCalendarContext();
  const { bookings, isLoading, refetch } = useBookings(
    isAuthenticated ? userEmail ?? undefined : undefined,
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ログインしてください</Text>
        <Text style={styles.emptySubtext}>
          カレンダータブからログインすると{'\n'}予約一覧が表示されます
        </Text>
      </View>
    );
  }

  if (bookings.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarX size={48} color="#ccc" />
        <Text style={[styles.emptyText, { marginTop: 16 }]}>予約はまだありません</Text>
        <Text style={styles.emptySubtext}>
          設定タブから予約リンクを共有すると{'\n'}ここに予約が表示されます
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#4285F4" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
