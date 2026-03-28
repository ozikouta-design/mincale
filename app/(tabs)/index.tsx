import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  PanResponder, Animated, Dimensions, Modal, TextInput, Linking, Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalendarContext } from '@/context/CalendarContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import MonthView from '@/components/calendar/MonthView';
import { LogIn, MessageCircle, X, Send } from 'lucide-react-native';
import { C, SHADOW, R } from '@/constants/design';
import MincaleLogo from '@/components/MincaleLogo';
import { useBookingNotifications } from '@/hooks/useBookingNotifications';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SMS_LAST_PHONE_KEY = 'sms_last_phone';

function loadLastPhone(): string {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(SMS_LAST_PHONE_KEY) || '';
  } catch {}
  return '';
}

function saveLastPhone(phone: string) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(SMS_LAST_PHONE_KEY, phone);
  } catch {}
}

export default function CalendarScreen() {
  const { viewMode, isAuthenticated, isLoading, signIn, goNext, goPrev, currentDate, userEmail, profile } = useCalendarContext();
  useBookingNotifications(userEmail);

  // SMS モーダル
  const [smsVisible, setSmsVisible] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  const bookingUrl = profile?.slug
    ? `https://mincale.vercel.app/booking/${encodeURIComponent(profile.slug)}`
    : '';

  const openSmsModal = () => {
    const lastPhone = loadLastPhone();
    setSmsPhone(lastPhone);
    setSmsMessage(
      `お時間をいただきありがとうございました。\n以下よりご都合の良いお時間をご予約ください。\n\n${bookingUrl}`
    );
    setSmsVisible(true);
  };

  const handleSendSms = async () => {
    if (!smsPhone.trim()) return;
    saveLastPhone(smsPhone.trim());
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${smsPhone.trim()}${sep}body=${encodeURIComponent(smsMessage)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // web では sms: スキームが開けない場合がある
    }
    setSmsVisible(false);
  };

  // スライドアニメーション
  const slideAnim = useRef(new Animated.Value(0)).current;
  const directionRef = useRef<'next' | 'prev'>('next');

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

  const navigateNext = useCallback(() => {
    directionRef.current = 'next';
    goNext();
  }, [goNext]);

  const navigatePrev = useCallback(() => {
    directionRef.current = 'prev';
    goPrev();
  }, [goPrev]);

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
          <MincaleLogo size={96} />
          <Text style={styles.appTitle}>みんカレ</Text>
          <Text style={styles.loginSubtext}>
            Googleアカウントでログインして{'\n'}カレンダーを同期しましょう
          </Text>
          <TouchableOpacity onPress={signIn} style={styles.loginButton} activeOpacity={0.8}>
            <LogIn size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Googleでログイン</Text>
          </TouchableOpacity>
          <Text style={styles.loginNote}>カレンダーの読み取り・書き込み権限を使用します</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CalendarHeader onNext={navigateNext} onPrev={navigatePrev} />
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={C.primary} />
        </View>
      )}
      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'day' && <DayView />}
        {viewMode === 'month' && <MonthView />}
      </Animated.View>

      {/* SMS送信 FAB — slug が設定済みのときのみ表示 */}
      {!!profile?.slug && (
        <TouchableOpacity style={styles.fab} onPress={openSmsModal} activeOpacity={0.85}>
          <MessageCircle size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* SMS送信モーダル */}
      <Modal
        visible={smsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSmsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* ヘッダー */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>予約リンクをSMSで送る</Text>
              <TouchableOpacity onPress={() => setSmsVisible(false)} style={styles.modalClose}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 予約URL */}
            <Text style={styles.urlLabel}>{bookingUrl}</Text>

            {/* 電話番号 */}
            <Text style={styles.fieldLabel}>相手の電話番号</Text>
            <TextInput
              style={styles.phoneInput}
              value={smsPhone}
              onChangeText={setSmsPhone}
              placeholder="090-0000-0000"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              autoFocus
            />

            {/* メッセージ */}
            <Text style={styles.fieldLabel}>送信メッセージ（編集可）</Text>
            <TextInput
              style={styles.messageInput}
              value={smsMessage}
              onChangeText={setSmsMessage}
              multiline
              numberOfLines={5}
              placeholderTextColor="#bbb"
            />

            {/* 送信ボタン */}
            <TouchableOpacity
              style={[styles.sendButton, !smsPhone.trim() && styles.sendButtonDisabled]}
              onPress={handleSendSms}
              disabled={!smsPhone.trim()}
              activeOpacity={0.8}
            >
              <Send size={18} color="#fff" />
              <Text style={styles.sendButtonText}>SMSアプリで開く</Text>
            </TouchableOpacity>

            <Text style={styles.sendNote}>
              ※ 端末のSMSアプリが開きます。送信ボタンは端末側で押してください。
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
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
    gap: 0,
    backgroundColor: C.bg,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: C.primary,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  loginSubtext: {
    fontSize: 15,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: R.full,
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  loginButtonText: {
    color: C.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
  loginNote: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: R.full,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.fab,
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  modalClose: {
    padding: 4,
  },
  urlLabel: {
    fontSize: 12,
    color: C.primary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
    marginBottom: 6,
  },
  phoneInput: {
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
    backgroundColor: C.input,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  messageInput: {
    fontSize: 14,
    color: C.text,
    backgroundColor: C.input,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: R.md,
    marginBottom: 10,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: C.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
  sendNote: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
  },
});
