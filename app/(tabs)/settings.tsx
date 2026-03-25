import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Share, ActivityIndicator, Switch, Platform,
} from 'react-native';
import {
  LogOut, Link2, Clock, Calendar as CalendarIcon,
  Share2, ChevronRight, User, Save, Mail, Plus, FolderPlus, Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCalendarContext } from '@/context/CalendarContext';

// カレンダーのグループ選択ダイアログを表示するヘルパー
function showGroupPicker(
  calendarId: string,
  groups: { id: string; name: string }[],
  moveCalendarToGroup: (calId: string, groupId: string | null) => Promise<void>,
) {
  const buttons = [
    ...groups.map(g => ({
      text: g.name,
      onPress: () => moveCalendarToGroup(calendarId, g.id),
    })),
    { text: '未分類に戻す', onPress: () => moveCalendarToGroup(calendarId, null) },
    { text: 'キャンセル', style: 'cancel' as const },
  ];
  Alert.alert('グループを選択', undefined, buttons);
}

export default function SettingsScreen() {
  const {
    isAuthenticated, signIn, signOut, userEmail, profile, saveProfile,
    calendarList, calendarGroups, toggleCalendarVisibility,
    createCalendarGroup, deleteCalendarGroup, moveCalendarToGroup,
  } = useCalendarContext();
  const [slug, setSlug] = useState('');
  const [bookingDuration, setBookingDuration] = useState('30');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
  const [isSaving, setIsSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupInput, setShowGroupInput] = useState(false);

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

      {/* カレンダーグループ管理 */}
      {calendarList.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>カレンダー管理</Text>
            <TouchableOpacity
              onPress={() => setShowGroupInput(v => !v)}
              style={styles.addGroupButton}
            >
              <FolderPlus size={16} color="#4285F4" />
              <Text style={styles.addGroupText}>グループを作成</Text>
            </TouchableOpacity>
          </View>

          {/* グループ作成フォーム */}
          {showGroupInput && (
            <View style={[styles.card, styles.groupInputCard]}>
              <TextInput
                style={styles.groupNameInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="グループ名を入力"
                placeholderTextColor="#999"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.groupCreateBtn, !newGroupName.trim() && styles.disabled]}
                disabled={!newGroupName.trim()}
                onPress={async () => {
                  await createCalendarGroup(newGroupName.trim());
                  setNewGroupName('');
                  setShowGroupInput(false);
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.groupCreateBtnText}>作成</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 既存グループとそのカレンダー */}
          {calendarGroups.map(group => {
            const groupCals = calendarList.filter(c => c.groupId === group.id);
            const allSelected = groupCals.every(c => c.selected);
            return (
              <View key={group.id} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <TouchableOpacity
                    style={styles.groupToggleArea}
                    onPress={() => {
                      // グループ全体の表示切り替え
                      groupCals.forEach(c => {
                        if (c.selected === allSelected) toggleCalendarVisibility(c.id);
                      });
                    }}
                  >
                    <Switch
                      value={allSelected}
                      onValueChange={() => {
                        groupCals.forEach(c => {
                          if (c.selected === allSelected) toggleCalendarVisibility(c.id);
                        });
                      }}
                      trackColor={{ true: '#4285F4' }}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupCount}>{groupCals.length}件</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(`グループ「${group.name}」を削除`, 'カレンダーはグループなしに戻ります', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: () => deleteCalendarGroup(group.id) },
                      ]);
                    }}
                  >
                    <Trash2 size={16} color="#ccc" />
                  </TouchableOpacity>
                </View>
                <View style={styles.card}>
                  {groupCals.length === 0 ? (
                    <Text style={styles.emptyGroupText}>カレンダーがありません</Text>
                  ) : (
                    groupCals.map((cal, i) => (
                      <React.Fragment key={cal.id}>
                        {i > 0 && <View style={styles.divider} />}
                        <View style={styles.row}>
                          <View style={styles.rowLeft}>
                            <View style={[styles.calDot, { backgroundColor: cal.backgroundColor }]} />
                            <Text style={styles.rowText} numberOfLines={1}>{cal.summary}</Text>
                          </View>
                          <View style={styles.calActions}>
                            <TouchableOpacity onPress={() => showGroupPicker(cal.id, calendarGroups, moveCalendarToGroup)}>
                              <Text style={styles.moveText}>移動</Text>
                            </TouchableOpacity>
                            <Switch
                              value={cal.selected}
                              onValueChange={() => toggleCalendarVisibility(cal.id)}
                              trackColor={{ true: '#4285F4' }}
                            />
                          </View>
                        </View>
                      </React.Fragment>
                    ))
                  )}
                </View>
              </View>
            );
          })}

          {/* 未分類のカレンダー */}
          {calendarList.filter(c => !c.groupId).length > 0 && (
            <View style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupName, { color: '#888' }]}>未分類</Text>
                <Text style={styles.groupCount}>{calendarList.filter(c => !c.groupId).length}件</Text>
              </View>
              <View style={styles.card}>
                {calendarList.filter(c => !c.groupId).map((cal, i) => (
                  <React.Fragment key={cal.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.row}>
                      <View style={styles.rowLeft}>
                        <View style={[styles.calDot, { backgroundColor: cal.backgroundColor }]} />
                        <Text style={styles.rowText} numberOfLines={1}>{cal.summary}</Text>
                      </View>
                      <View style={styles.calActions}>
                        {calendarGroups.length > 0 && (
                          <TouchableOpacity onPress={() => showGroupPicker(cal.id, calendarGroups, moveCalendarToGroup)}>
                            <Text style={styles.moveText}>グループに追加</Text>
                          </TouchableOpacity>
                        )}
                        <Switch
                          value={cal.selected}
                          onValueChange={() => toggleCalendarVisibility(cal.id)}
                          trackColor={{ true: '#4285F4' }}
                        />
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </>
      )}

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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  rowText: { fontSize: 15, fontWeight: '500', flex: 1 },
  calDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  // カレンダーグループ関連スタイル
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  addGroupButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addGroupText: { fontSize: 13, color: '#4285F4', fontWeight: '600' },
  groupInputCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  groupNameInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupCreateBtn: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  groupCreateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  groupSection: { marginBottom: 4 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 8,
  },
  groupToggleArea: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  groupName: { fontSize: 13, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.3 },
  groupCount: { fontSize: 12, color: '#aaa' },
  emptyGroupText: { fontSize: 13, color: '#bbb', textAlign: 'center', paddingVertical: 12 },
  calActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moveText: { fontSize: 12, color: '#4285F4', fontWeight: '500' },
  sectionTitleInline: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
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
