import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { C, SHADOW, R } from '@/constants/design';

interface Option<T> {
  label: string;
  value: T;
}

interface Props<T> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
}

export default function SettingPickerRow<T>({ label, value, options, onChange, icon }: Props<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.left}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.value}>{selected?.label ?? ''}</Text>
          <ChevronRight size={16} color={C.textMuted} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          {/* ハンドル */}
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.option, i > 0 && styles.optionBorder]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={18} color={C.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: { width: 22, alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '500', color: C.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 14, color: C.textSub, fontWeight: '500' },
  // モーダル
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingBottom: 40,
    paddingTop: 12,
    ...SHADOW.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionBorder: {
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  optionText: {
    fontSize: 16,
    color: C.text,
    fontWeight: '400',
  },
  optionTextActive: {
    color: C.primary,
    fontWeight: '600',
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSub,
  },
});
