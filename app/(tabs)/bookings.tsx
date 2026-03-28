import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { CalendarX } from 'lucide-react-native';
import { useBookings } from '@/hooks/useBookings';
import BookingCard from '@/components/bookings/BookingCard';
import { useCalendarContext } from '@/context/CalendarContext';
import { C } from '@/constants/design';

export default function BookingsScreen() {
  const { isAuthenticated, userEmail } = useCalendarContext();
  const { bookings, isLoading, refetch, confirmBooking, declineBooking, deleteBooking } = useBookings(
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
        <CalendarX size={48} color={C.textMuted} />
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
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onConfirm={confirmBooking}
            onDecline={declineBooking}
            onDelete={deleteBooking}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: C.bg,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.textSub },
  emptySubtext: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
