import { Href, useRouter } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { CHILD_DATA_CONSENT_TEXT, GUARDIAN_CONSENT_TEXT, PRIVACY_DATE, RECORDING_CONSENT_TEXT, type PrivacyChoices as Choices } from '@/constants/privacy';
import { Palette, Radius, Space } from '@/constants/design';

export function PrivacyChoices({ value, onChange, disabled = false }: {
  value: Choices; onChange: Dispatch<SetStateAction<Choices>>; disabled?: boolean;
}) {
  const router = useRouter();
  return <View style={styles.content}>
    <AppText variant="heading">Datenschutz und Einwilligungen</AppText>
    <AppText color={Palette.inkSoft}>Bitte lies die Erklärungen vor deiner Entscheidung. Die Aufnahme ist freiwillig. Alle Angaben gelten für die Kinder, die du berechtigt diesem Familienkonto zuordnest.</AppText>
    <Pressable accessibilityRole="link" onPress={() => router.push('/datenschutz' as Href)}>
      <AppText color={Palette.forest} style={styles.link}>Datenschutzerklärung lesen · Stand {PRIVACY_DATE}</AppText>
    </Pressable>
    <Check label="Sorgeberechtigung bestätigen" checked={value.guardianConfirmed} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, guardianConfirmed: !current.guardianConfirmed }))} text={GUARDIAN_CONSENT_TEXT} />
    <Check label="Ausdrückliche Einwilligung für Kinderprofile und Lernstände" checked={value.childDataGranted} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, childDataGranted: !current.childDataGranted }))} text={CHILD_DATA_CONSENT_TEXT} />
    <Check label="Freiwillige ursprüngliche Unterrichtsaufnahme erlauben" checked={value.recordingGranted} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, recordingGranted: !current.recordingGranted }))} text={RECORDING_CONSENT_TEXT} />
    <AppText variant="small" color={Palette.muted}>Die Entscheidungen werden mit Zeitpunkt und Textversion dokumentiert. Du kannst sie im Konto einsehen und für die Zukunft widerrufen. Eine Ablehnung der Aufnahme verhindert die Registrierung nicht.</AppText>
  </View>;
}

function Check({ label, text, checked, disabled, onPress }: {
  label: string; text: string; checked: boolean; disabled: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label}
    aria-checked={checked} aria-disabled={disabled}
    accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
    <View style={[styles.checkbox, checked && styles.checked]}><AppText color={checked ? Palette.paper : Palette.forest}>{checked ? '✓' : ''}</AppText></View>
    <View style={styles.copy}>
      <AppText variant="bodyStrong">{label}</AppText>
      <AppText variant="small" color={Palette.inkSoft}>{text}</AppText>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: Space.lg, minWidth: 0 },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  copy: { flex: 1, minWidth: 0, gap: Space.sm },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: Palette.forest, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: Palette.forest },
  link: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
