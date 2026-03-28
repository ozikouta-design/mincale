import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Share, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import {
  LogOut, Link2, Clock, Calendar as CalendarIcon,
  Share2, ChevronRight, User, Save, Mail, FolderPlus, Trash2, Pencil, Check, Copy, Bell, BellOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useCalendarContext } from '@/context/CalendarContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { C, SHADOW, R } from '@/constants/design';
import SettingPickerRow from '@/components/SettingPickerRow';

export default function SettingsScreen() {
  const {
    isAuthenticated, signIn, signOut, userEmail, profile, saveProfile,
    calendarList, calendarGroups, toggleCalendarVisibility,
    createCalendarGroup, updateCalendarGroup, deleteCalendarGroup, setGroupVisibility,
    syncRangeDays, setSyncRangeDays, isLoading, refreshEvents, fetchCalendarList,
  } = useCalendarContext();
  const { settings, updateSettings } = useAppSettings();
  const [slug, setSlug] = useState('');
  const [bookingDuration, setBookingDuration] = useState('30');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
  const [blockAllDayEvents, setBlockAllDayEvents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // グループ作成・編集モーダルの状態
  const [groupModal, setGroupModal] = useState<{
    mode: 'create' | 'edit';
    groupId?: string;
    name: string;
    selectedCalendarIds: string[];
  } | null>(null);

  // Load profile values
  useEffect(() => {
    if (profile) {
      setSlug(profile.slug || '');
      setBookingDuration(String(profile.booking_duration || 30));
      setStartHour(String(profile.booking_start_hour || 9));
      setEndHour(String(profile.booking_end_hour || 18));
      setBlockAllDayEvents(profile.block_all_day_events ?? false);
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
        block_all_day_events: blockAllDayEvents,
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

  const [copied, setCopied] = useState(false);
  const handleCopyUrl = async () => {
    if (!bookingUrl) return;
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(bookingUrl); } catch { /* fallback */ }
    } else {
      await Clipboard.setStringAsync(bookingUrl);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                  <Mail size={20} color={C.textSub} />
                  <Text style={styles.rowText}>{userEmail}</Text>
                </View>
              </View>
            )}
            {userEmail && <View style={styles.divider} />}
            <TouchableOpacity onPress={signOut} style={styles.row}>
              <View style={styles.rowLeft}>
                <LogOut size={20} color={C.danger} />
                <Text style={[styles.rowText, { color: C.danger }]}>ログアウト</Text>
              </View>
              <ChevronRight size={18} color={C.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={signIn} style={styles.row}>
            <View style={styles.rowLeft}>
              <User size={20} color={C.primary} />
              <Text style={[styles.rowText, { color: C.primary }]}>Googleでログイン</Text>
            </View>
            <ChevronRight size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 表示設定 */}
      <Text style={styles.sectionTitle}>表示設定</Text>
      <View style={styles.card}>
        <SettingPickerRow
          label="週の始め"
          value={settings.weekStartsOn}
          options={[
            { label: '日曜日', value: 0 as 0 | 1 | 6 },
            { label: '月曜日', value: 1 as 0 | 1 | 6 },
            { label: '土曜日', value: 6 as 0 | 1 | 6 },
          ]}
          onChange={(v) => updateSettings({ weekStartsOn: v })}
        />
        <View style={styles.divider} />
        <SettingPickerRow
          label="デフォルト表示"
          value={settings.defaultView}
          options={[
            { label: '週表示', value: 'week' as const },
            { label: '月表示', value: 'month' as const },
            { label: '日表示', value: 'day' as const },
          ]}
          onChange={(v) => updateSettings({ defaultView: v })}
        />
        <View style={styles.divider} />
        <SettingPickerRow
          label="デフォルト予定時間"
          value={settings.defaultEventDuration}
          options={[
            { label: '15分', value: 15 as 15 | 30 | 60 | 90 | 120 },
            { label: '30分', value: 30 as 15 | 30 | 60 | 90 | 120 },
            { label: '1時間', value: 60 as 15 | 30 | 60 | 90 | 120 },
            { label: '1時間30分', value: 90 as 15 | 30 | 60 | 90 | 120 },
            { label: '2時間', value: 120 as 15 | 30 | 60 | 90 | 120 },
          ]}
          onChange={(v) => updateSettings({ defaultEventDuration: v })}
        />
        <View style={styles.divider} />
        <SettingPickerRow
          label="時間表示形式"
          value={settings.timeFormat}
          options={[
            { label: '24時間制', value: '24h' as const },
            { label: '12時間制 (AM/PM)', value: '12h' as const },
          ]}
          onChange={(v) => updateSettings({ timeFormat: v })}
        />
        <View style={styles.divider} />
        <SettingPickerRow
          label="カレンダー表示開始"
          value={settings.calendarStartHour}
          options={[6, 7, 8, 9, 10, 11, 12].map(h => ({ label: `${h}時`, value: h }))}
          onChange={(v) => updateSettings({ calendarStartHour: v })}
        />
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowText}>週末をハイライト表示</Text>
          <Switch
            value={settings.highlightWeekends}
            onValueChange={(val) => updateSettings({ highlightWeekends: val })}
            trackColor={{ false: C.border, true: C.primary }}
          />
        </View>
      </View>

      {/* 通知設定 */}
      <Text style={styles.sectionTitle}>通知</Text>
      <View style={styles.card}>
        {/* マスターON/OFF */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            {settings.notificationsEnabled
              ? <Bell size={20} color={C.primary} />
              : <BellOff size={20} color={C.textMuted} />}
            <Text style={styles.rowText}>通知を受け取る</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={async (val) => {
              if (val && Platform.OS === 'web' && typeof Notification !== 'undefined') {
                if (Notification.permission === 'default') {
                  await Notification.requestPermission().catch(() => {});
                }
                if (Notification.permission === 'denied') {
                  Alert.alert(
                    '通知がブロックされています',
                    'ブラウザの設定から通知を許可してください。',
                  );
                  return;
                }
              }
              updateSettings({ notificationsEnabled: val });
            }}
            trackColor={{ false: C.border, true: C.primary }}
          />
        </View>

        {settings.notificationsEnabled && (
          <>
            <View style={styles.divider} />
            {/* 新規予約通知 */}
            <View style={styles.row}>
              <Text style={[styles.rowText, { color: C.textSub }]}>新規予約の通知</Text>
              <Switch
                value={settings.notifyNewBooking}
                onValueChange={(val) => updateSettings({ notifyNewBooking: val })}
                trackColor={{ false: C.border, true: C.primary }}
              />
            </View>
            <View style={styles.divider} />
            {/* ステータス変更通知 */}
            <View style={styles.row}>
              <Text style={[styles.rowText, { color: C.textSub }]}>予約確定・キャンセル通知</Text>
              <Switch
                value={settings.notifyBookingStatus}
                onValueChange={(val) => updateSettings({ notifyBookingStatus: val })}
                trackColor={{ false: C.border, true: C.primary }}
              />
            </View>
            <View style={styles.divider} />
            {/* リマインダー時間 */}
            <SettingPickerRow
              label="予定リマインダー"
              value={settings.reminderMinutesBefore}
              options={[
                { label: '5分前', value: 5 as 5 | 10 | 15 | 30 | 60 },
                { label: '10分前', value: 10 as 5 | 10 | 15 | 30 | 60 },
                { label: '15分前', value: 15 as 5 | 10 | 15 | 30 | 60 },
                { label: '30分前', value: 30 as 5 | 10 | 15 | 30 | 60 },
                { label: '1時間前', value: 60 as 5 | 10 | 15 | 30 | 60 },
              ]}
              onChange={(v) => updateSettings({ reminderMinutesBefore: v })}
            />
          </>
        )}
      </View>

      {/* Booking Configuration */}
      <Text style={styles.sectionTitle}>予約設定</Text>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Link2 size={18} color={C.textSub} />
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
          <Clock size={18} color={C.textSub} />
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
          <CalendarIcon size={18} color={C.textSub} />
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

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <CalendarIcon size={18} color={C.textSub} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>終日予定で予約をブロック</Text>
              <Text style={styles.calGroupLabel}>オフにすると誕生日・祝日は予約枠に影響しません</Text>
            </View>
          </View>
          <Switch
            value={blockAllDayEvents}
            onValueChange={setBlockAllDayEvents}
            trackColor={{ false: C.border, true: C.primary }}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={C.inverse} />
          ) : (
            <>
              <Save size={18} color={C.inverse} />
              <Text style={styles.saveButtonText}>保存</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 同期範囲設定 */}
      {isAuthenticated && (
        <>
          <Text style={styles.sectionTitle}>同期範囲</Text>
          <View style={styles.card}>
            <SettingPickerRow
              label="同期範囲"
              value={syncRangeDays}
              options={[
                { label: '都度（現在のビューのみ）', value: 0 },
                { label: '前後 30日', value: 30 },
                { label: '前後 60日', value: 60 },
                { label: '前後 90日', value: 90 },
                { label: '前後 120日', value: 120 },
              ]}
              onChange={(v) => setSyncRangeDays(v)}
            />
          </View>
        </>
      )}

      {/* デフォルト表示カレンダー */}
      {isAuthenticated && calendarGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>デフォルト表示</Text>
          <View style={styles.card}>
            <SettingPickerRow
              label="デフォルト表示カレンダー"
              value={settings.defaultGroupId ?? '__all__'}
              options={[
                { label: '全カレンダー', value: '__all__' },
                ...calendarGroups.map(g => ({ label: g.name, value: g.id })),
              ]}
              onChange={(v) => updateSettings({ defaultGroupId: v === '__all__' ? null : v })}
            />
          </View>
        </>
      )}

      {/* カレンダーグループ管理 */}
      {isAuthenticated && calendarList.length === 0 && !isLoading && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>カレンダー管理</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={async () => {
                await fetchCalendarList();
              }}
            >
              <View style={styles.rowLeft}>
                <CalendarIcon size={18} color={C.primary} />
                <Text style={[styles.rowText, { color: C.primary }]}>カレンダーを再読み込み</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
      {calendarList.length > 0 && (
        <>
          {/* ヘッダー：タイトル＋グループ作成ボタン */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>カレンダー管理</Text>
            <TouchableOpacity
              onPress={() => setGroupModal({ mode: 'create', name: '', selectedCalendarIds: [] })}
              style={styles.addGroupButton}
            >
              <FolderPlus size={16} color={C.primary} />
              <Text style={styles.addGroupText}>グループを作成</Text>
            </TouchableOpacity>
          </View>

          {/* 全て ON/OFF マスタースイッチ */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <CalendarIcon size={18} color={C.primary} />
                <Text style={[styles.rowText, { color: C.text }]}>すべてのカレンダーを表示</Text>
              </View>
              <Switch
                value={calendarList.some(c => c.selected)}
                onValueChange={(val) => setGroupVisibility(calendarList.map(c => c.id), val)}
                trackColor={{ true: '#4285F4' }}
              />
            </View>
          </View>

          {/* グループ一覧（スイッチのみ、カレンダー詳細なし） */}
          {calendarGroups.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>グループ</Text>
              <View style={styles.card}>
                {calendarGroups.map((group, i) => {
                  const groupCals = calendarList.filter(c => (c.groupIds ?? []).includes(group.id));
                  const allSelected = groupCals.length > 0 && groupCals.every(c => c.selected);
                  return (
                    <React.Fragment key={group.id}>
                      {i > 0 && <View style={styles.divider} />}
                      <View style={styles.row}>
                        <View style={styles.rowLeft}>
                          <Text style={styles.rowText}>{group.name}</Text>
                          <Text style={styles.groupCountInline}>{groupCals.length}件</Text>
                        </View>
                        <View style={styles.groupRowActions}>
                          <TouchableOpacity
                            style={styles.groupActionBtn}
                            onPress={() => setGroupModal({
                              mode: 'edit',
                              groupId: group.id,
                              name: group.name,
                              selectedCalendarIds: groupCals.map(c => c.id),
                            })}
                          >
                            <Pencil size={15} color={C.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.groupActionBtn}
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                if (window.confirm(`「${group.name}」を削除しますか？\nカレンダーは未分類に戻ります`)) {
                                  deleteCalendarGroup(group.id);
                                }
                              } else {
                                Alert.alert(`「${group.name}」を削除`, 'カレンダーは未分類に戻ります', [
                                  { text: 'キャンセル', style: 'cancel' },
                                  { text: '削除', style: 'destructive', onPress: () => deleteCalendarGroup(group.id) },
                                ]);
                              }
                            }}
                          >
                            <Trash2 size={15} color={C.danger} />
                          </TouchableOpacity>
                          <Switch
                            value={allSelected}
                            onValueChange={(val) => setGroupVisibility(groupCals.map(c => c.id), val)}
                            trackColor={{ false: C.border, true: C.primary }}
                            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                          />
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </>
          )}

          {/* カレンダー一覧（全グループのメンバー＋未分類をフラットに表示） */}
          <Text style={styles.sectionTitle}>カレンダー</Text>
          <View style={styles.card}>
            {calendarList.map((cal, i) => {
              const groupNames = (cal.groupIds ?? [])
                .map(gid => calendarGroups.find(g => g.id === gid)?.name)
                .filter(Boolean)
                .join(', ');
              return (
                <React.Fragment key={cal.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.calDot, { backgroundColor: cal.backgroundColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowText} numberOfLines={1}>{cal.summary}</Text>
                        {groupNames ? (
                          <Text style={styles.calGroupLabel}>{groupNames}</Text>
                        ) : (
                          <Text style={[styles.calGroupLabel, { color: C.textMuted }]}>未分類</Text>
                        )}
                      </View>
                    </View>
                    <Switch
                      value={cal.selected}
                      onValueChange={() => toggleCalendarVisibility(cal.id)}
                      trackColor={{ false: C.border, true: C.primary }}
                    />
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </>
      )}

      {/* グループ作成・編集モーダル */}
      <Modal
        visible={!!groupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {groupModal?.mode === 'create' ? 'グループを作成' : 'グループを編集'}
            </Text>

            {/* グループ名入力 */}
            <Text style={styles.modalLabel}>グループ名</Text>
            <TextInput
              style={styles.modalInput}
              value={groupModal?.name ?? ''}
              onChangeText={text => setGroupModal(prev => prev ? { ...prev, name: text } : prev)}
              placeholder="例：仕事、プライベート"
              placeholderTextColor="#bbb"
              autoFocus
            />

            {/* 表示するカレンダー選択 */}
            <Text style={styles.modalLabel}>表示するカレンダー</Text>
            <ScrollView style={styles.modalCalList} showsVerticalScrollIndicator={false}>
              {calendarList.map(cal => {
                const checked = groupModal?.selectedCalendarIds.includes(cal.id) ?? false;
                return (
                  <TouchableOpacity
                    key={cal.id}
                    style={styles.modalCalRow}
                    onPress={() => setGroupModal(prev => {
                      if (!prev) return prev;
                      const ids = checked
                        ? prev.selectedCalendarIds.filter(id => id !== cal.id)
                        : [...prev.selectedCalendarIds, cal.id];
                      return { ...prev, selectedCalendarIds: ids };
                    })}
                  >
                    <View style={[styles.calDot, { backgroundColor: cal.backgroundColor }]} />
                    <Text style={styles.modalCalName} numberOfLines={1}>{cal.summary}</Text>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Check size={12} color={C.inverse} strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ボタン */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setGroupModal(null)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !groupModal?.name.trim() && styles.disabled]}
                disabled={!groupModal?.name.trim()}
                onPress={async () => {
                  if (!groupModal?.name.trim()) return;
                  if (groupModal.mode === 'create') {
                    await createCalendarGroup(groupModal.name.trim(), groupModal.selectedCalendarIds);
                  } else if (groupModal.groupId) {
                    await updateCalendarGroup(groupModal.groupId, groupModal.name.trim(), groupModal.selectedCalendarIds);
                  }
                  setGroupModal(null);
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Link */}
      {slug && (
        <>
          <Text style={styles.sectionTitle}>予約リンク</Text>
          <View style={styles.card}>
            <View style={styles.urlRow}>
              <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">{bookingUrl}</Text>
              <TouchableOpacity onPress={handleCopyUrl} style={styles.copyButton} activeOpacity={0.7}>
                {copied
                  ? <Check size={16} color={C.success} />
                  : <Copy size={16} color={C.primary} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleShareLink} style={styles.shareButton}>
              <Share2 size={18} color={C.inverse} />
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
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  card: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: R.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...SHADOW.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  rowText: { fontSize: 15, fontWeight: '500', color: C.text, flex: 1 },
  calDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
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
  addGroupText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  groupSection: { marginBottom: 4 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  groupName: { fontSize: 13, fontWeight: '600', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.3 },
  groupCount: { fontSize: 12, color: C.textMuted },
  groupCountInline: { fontSize: 12, color: C.textMuted, marginLeft: 4 },
  groupRowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  groupActionBtn: { padding: 6 },
  emptyGroupText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  sectionTitleInline: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  calGroupLabel: { fontSize: 11, color: C.textSub, marginTop: 1 },
  // グループ作成・編集モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6, marginTop: 12 },
  modalInput: {
    fontSize: 16,
    color: C.text,
    backgroundColor: C.input,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCalList: { maxHeight: 260, marginBottom: 4 },
  modalCalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  modalCalName: { flex: 1, fontSize: 15, color: C.text },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: C.textSub },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: R.sm,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: C.inverse },
  disabled: { opacity: 0.4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, color: C.textSub, marginBottom: 6 },
  input: {
    fontSize: 15,
    color: C.text,
    backgroundColor: C.input,
    borderRadius: R.xs,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  timeRange: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { width: 60, textAlign: 'center' },
  timeSeparator: { fontSize: 15, color: C.textSub },
  timeUnit: { fontSize: 13, color: C.textSub },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginHorizontal: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 13,
    borderRadius: R.sm,
  },
  saveButtonText: { color: C.inverse, fontSize: 15, fontWeight: '700' },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: C.primary,
  },
  copyButton: {
    padding: 6,
    borderRadius: R.xs,
    backgroundColor: C.primaryLight,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.success,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 13,
    borderRadius: R.sm,
  },
  shareButtonText: { color: C.inverse, fontSize: 15, fontWeight: '700' },
});
