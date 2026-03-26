import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Share, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import {
  LogOut, Link2, Clock, Calendar as CalendarIcon,
  Share2, ChevronRight, User, Save, Mail, FolderPlus, Trash2, Pencil, Check, Copy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useCalendarContext } from '@/context/CalendarContext';

export default function SettingsScreen() {
  const {
    isAuthenticated, signIn, signOut, userEmail, profile, saveProfile,
    calendarList, calendarGroups, toggleCalendarVisibility,
    createCalendarGroup, updateCalendarGroup, deleteCalendarGroup, setGroupVisibility,
    syncRangeDays, setSyncRangeDays, isLoading, refreshEvents, fetchCalendarList,
  } = useCalendarContext();
  const [slug, setSlug] = useState('');
  const [bookingDuration, setBookingDuration] = useState('30');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
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

      {/* 同期範囲設定 */}
      {isAuthenticated && (
        <>
          <Text style={styles.sectionTitle}>同期範囲</Text>
          <View style={styles.card}>
            {[
              { label: '都度（現在のビューのみ）', value: 0 },
              { label: '前後 30日', value: 30 },
              { label: '前後 60日', value: 60 },
              { label: '前後 90日', value: 90 },
              { label: '前後 120日', value: 120 },
            ].map(({ label, value }, i, arr) => (
              <React.Fragment key={value}>
                {i > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setSyncRangeDays(value)}
                >
                  <Text style={styles.rowText}>{label}</Text>
                  {syncRangeDays === value && (
                    <View style={styles.selectedDot} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
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
                <CalendarIcon size={18} color="#4285F4" />
                <Text style={[styles.rowText, { color: '#4285F4' }]}>カレンダーを再読み込み</Text>
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
              <FolderPlus size={16} color="#4285F4" />
              <Text style={styles.addGroupText}>グループを作成</Text>
            </TouchableOpacity>
          </View>

          {/* 全て ON/OFF マスタースイッチ */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <CalendarIcon size={18} color="#4285F4" />
                <Text style={[styles.rowText, { color: '#333' }]}>すべてのカレンダーを表示</Text>
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
                            <Pencil size={15} color="#4285F4" />
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
                            <Trash2 size={15} color="#EA4335" />
                          </TouchableOpacity>
                          <Switch
                            value={allSelected}
                            onValueChange={(val) => setGroupVisibility(groupCals.map(c => c.id), val)}
                            trackColor={{ false: '#ccc', true: '#4285F4' }}
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
                          <Text style={[styles.calGroupLabel, { color: '#bbb' }]}>未分類</Text>
                        )}
                      </View>
                    </View>
                    <Switch
                      value={cal.selected}
                      onValueChange={() => toggleCalendarVisibility(cal.id)}
                      trackColor={{ false: '#ccc', true: '#4285F4' }}
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
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
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
                  ? <Check size={16} color="#22C55E" />
                  : <Copy size={16} color="#4285F4" />}
              </TouchableOpacity>
            </View>
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
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4285F4' },
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
  groupSection: { marginBottom: 4 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  groupName: { fontSize: 13, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.3 },
  groupCount: { fontSize: 12, color: '#aaa' },
  groupCountInline: { fontSize: 12, color: '#aaa', marginLeft: 4 },
  groupRowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  groupActionBtn: { padding: 6 },
  emptyGroupText: { fontSize: 13, color: '#bbb', textAlign: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  sectionTitleInline: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  calGroupLabel: { fontSize: 11, color: '#999', marginTop: 1 },
  // グループ作成・編集モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 12 },
  modalInput: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalCalList: { maxHeight: 260, marginBottom: 4 },
  modalCalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalCalName: { flex: 1, fontSize: 15, color: '#333' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#4285F4', borderColor: '#4285F4' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.4 },
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
    color: '#4285F4',
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F4FF',
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
