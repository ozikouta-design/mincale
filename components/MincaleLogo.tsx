import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  size?: number;
  showText?: boolean;
}

export default function MincaleLogo({ size = 80, showText = false }: Props) {
  const r = size * 0.22; // border radius

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4F8EF7" />
            <Stop offset="1" stopColor="#2563EB" />
          </LinearGradient>
          <LinearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#E0EDFF" stopOpacity="0.85" />
          </LinearGradient>
        </Defs>

        {/* 背景角丸四角 */}
        <Rect x="4" y="4" width="92" height="92" rx="22" ry="22" fill="url(#bgGrad)" />

        {/* カレンダーボディ */}
        <Rect x="16" y="28" width="68" height="54" rx="8" ry="8" fill="url(#accentGrad)" />

        {/* ヘッダーバー */}
        <Rect x="16" y="28" width="68" height="20" rx="8" ry="8" fill="#2563EB" />
        <Rect x="16" y="38" width="68" height="10" fill="#2563EB" />

        {/* リングピン 左 */}
        <Rect x="30" y="20" width="8" height="18" rx="4" ry="4" fill="#1D4ED8" />
        {/* リングピン 右 */}
        <Rect x="62" y="20" width="8" height="18" rx="4" ry="4" fill="#1D4ED8" />

        {/* グリッド横線 */}
        <Line x1="16" y1="66" x2="84" y2="66" stroke="#C7D9F8" strokeWidth="1" />

        {/* 日付マス（3列×2行） */}
        {/* 行1 */}
        <Circle cx="32" cy="58" r="5" fill="#3B82F6" opacity="0.5" />
        <Circle cx="50" cy="58" r="5" fill="#3B82F6" opacity="0.5" />
        <Circle cx="68" cy="58" r="5" fill="#EF4444" />
        {/* 行2 */}
        <Circle cx="32" cy="74" r="5" fill="#3B82F6" opacity="0.5" />
        <Circle cx="50" cy="74" r="5" fill="#3B82F6" opacity="0.5" />
        <Circle cx="68" cy="74" r="5" fill="#3B82F6" opacity="0.5" />

        {/* みんカレ "M" を白でヘッダーに */}
        <Path
          d="M 36 43 L 40 35 L 44 43 L 48 35 L 52 43"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* 小さい人シルエット2つ */}
        <Circle cx="60" cy="37" r="3" fill="white" opacity="0.9" />
        <Circle cx="69" cy="37" r="3" fill="white" opacity="0.9" />
        <Path d="M 55 46 Q 60 42 65 46" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9" />
        <Path d="M 64 46 Q 69 42 74 46" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9" />
      </Svg>

      {showText && (
        <Text style={[styles.logoText, { fontSize: size * 0.3 }]}>みんカレ</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1,
  },
});
