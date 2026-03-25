import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Share, ActivityIndicator,
} from 'react-native';
import {
  LogOut, Link2, Clock, Calendar as CalendarIcon,
  Share2, ChevronRight, User, Save, Mail,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCalendarContext } from '@/context/CalendarContext';

export default function SettingsScreen() {
  const { isAuthenticated, signIn, signOut, userEmail, profile, saveProfile } = useCalendarContext();
  const [slug, setSlug] = useState('');
  const [bookingDuration, setBookingDuration] = useState('30');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
  const [isSaving, setIsSaving] = useState(false);

  // Load profile values
  useEffect(() => {
    if (profile) {
      setSlug(profile.slug || '');
      setBookingDuration(String(profile.booking_duration || 30));
      setStartHour(String(profile.booking_start_hour || 9));
      setEndHour(String(profile.booking_end_hour || 18));
    }
  }, [profile]);

  const bookingUrl = slug ? `https://mincale.vercel.app/booking/${encodeURIComponent(slug)}` : '';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProfile({
        slug: slug || undefined,
        booking_duration: parseInt(bookingDuration, 10) || 30,
        booking_start_hour: parseInt(startHour, 10) || 9,
        booking_end_hour: parseInt(endHour, 10) || 18,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('保存完了', '設定を保存しました');
    } catch {
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareLink = async () => {
    if (!bookingUrl) {
      Alert.alert('エラー', '予約URLのスラッグを設定してください');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `予約はこちらから: ${bookingUrl}`,
      url: bookingUrl,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <Text style={styles.sectionTitle}>アカウント</Text>
      <View style={styles.card}>
        {isAuthenticated ? (
          <>
            {userEmail && (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Mail size={20} color="#666" />
                  <Text style={styles.rowText}>{userEmail}</Text>
                </View>
              </View>
            )}
            {userEmail && <View style={styles.divider} />}
            <TouchableOpacity onPress={signOut} style={styles.row}>
              <View style={styles.rowLeft}>
                <LogOut size={20} color="#EA4335" />
                <Text style={[styles.rowText, { color: '#EA4335' }]}>ログアウト</Text>
              </View>
              <ChevronRight size={18} color="#ccc" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={signIn} style={styles.row}>
            <View style={styles.rowLeft}>
              <User size={20} color="#4285F4" />
              <Text style={[styles.rowText, { color: '#4285F4' }]}>Googleでログイン</Text>
            </View>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Booking Configuration */}
      <Text style={styles.sectionTitle}>予約設定</Text>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Link2 size={18} color="#666" />
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>予約URLスラッグ</Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={(v) => setSlug(v.replace(/\s/g, '-'))}
              placeholder="your-name"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <Clock size={18} color="#666" />
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>予約枠 (分)</Text>
            <TextInput
              style={styles.input}
              value={bookingDuration}
              onChangeText={setBookingDuration}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <CalendarIcon size={18} color="#666" />
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>営業時間</Text>
            <View style={styles.timeRange}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                value={startHour}
                onChangeText={setStartHour}
                keyboardType="number-pad"
              />
              <Text style={styles.timeSeparator}>〜</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                value={endHour}
                onChangeText={setEndHour}
                keyboardType="number-pad"
              />
              <Text style={styles.timeUnit}>時</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveButtonText}>保存</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Share Link */}
      {slug && (
        <>
          <Text style={styles.sectionTitle}>予約リンク</Text>
          <View style={styles.card}>
            <Text style={styles.urlText}>{bookingUrl}</Text>
            <TouchableOpacity onPress={handleShareLink} style={styles.shareButton}>
              <Share2 size={18} color="#fff" />
              <Text style={styles.shareButtonText}>リンクを共有</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8ecf4',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  input: {
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeRange: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { width: 60, textAlign: 'center' },
  timeSeparator: { fontSize: 15, color: '#666' },
  timeUnit: { fontSize: 13, color: '#666' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8ecf4',
    marginHorizontal: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  urlText: {
    fontSize: 13,
    color: '#4285F4',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34A853',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
