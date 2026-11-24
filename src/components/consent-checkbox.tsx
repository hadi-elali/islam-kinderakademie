import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';

export type ConsentCheckboxProps = {
  label: string; checked: boolean; disabled?: boolean; onChange: () => void;
};

export function ConsentCheckbox({ label, checked, disabled = false, onChange }: ConsentCheckboxProps) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label}
    accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onChange}
    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
    <View style={[styles.box, checked && styles.checked]}>
      <AppText color={checked ? Palette.paper : Palette.forest}>{checked ? '✓' : ''}</AppText>
    </View>
    <AppText style={styles.copy}>{label}</AppText>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  box: { width: 24, height: 24, borderWidth: 1, borderColor: Palette.forest, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: Palette.forest },
  copy: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 24 },
});
