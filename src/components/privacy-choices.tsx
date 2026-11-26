import { Link } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { ConsentDetails } from '@/components/consent-details';
import { ConsentCheckbox } from '@/components/consent-checkbox';
import { CHILD_DATA_CONSENT_TEXT, GUARDIAN_CONSENT_TEXT, RECORDING_CONSENT_TEXT, type PrivacyChoices as Choices } from '@/constants/privacy';
import { Palette, Space } from '@/constants/design';

export function PrivacyChoices({ value, onChange, disabled = false, combineGuardianConfirmation = false }: {
  value: Choices; onChange: Dispatch<SetStateAction<Choices>>; disabled?: boolean;
  combineGuardianConfirmation?: boolean;
}) {
  return <View style={styles.content}>
    <AppText variant="heading">Datenschutz</AppText>
    <AppText style={styles.note} color={Palette.inkSoft}>Verantwortlich: Bund für islamische Bildung e. V.</AppText>
    {combineGuardianConfirmation ? <Check
      title="Sorgeberechtigung und Kinderprofile"
      label="Als volljährige Person mit Sorge- oder Vertretungsberechtigung willige ich ausdrücklich in die Verarbeitung von Kinderprofilen und Lernständen für den Unterricht ein, einschließlich möglicher Religionsbezüge."
      checked={value.guardianConfirmed && value.childDataGranted} disabled={disabled}
      onPress={() => onChange((current) => {
        const granted = !(current.guardianConfirmed && current.childDataGranted);
        return { ...current, guardianConfirmed: granted, childDataGranted: granted };
      })}
      text={`${GUARDIAN_CONSENT_TEXT}\n\n${CHILD_DATA_CONSENT_TEXT}`}
    /> : <>
    <Check title="Sorgeberechtigung" label="Ich bin volljährig und sorgeberechtigt oder wirksam zur Abgabe dieser Erklärungen bevollmächtigt." checked={value.guardianConfirmed} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, guardianConfirmed: !current.guardianConfirmed }))} text={GUARDIAN_CONSENT_TEXT} />
    <Check title="Kinderprofile und Lernstände" label="Ich willige ausdrücklich in die Verarbeitung von Kinderprofilen und Lernständen für den Unterricht ein, auch bei möglichem Religionsbezug." checked={value.childDataGranted} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, childDataGranted: !current.childDataGranted }))} text={CHILD_DATA_CONSENT_TEXT} />
    </>}
    <Check title="Freiwillige Unterrichtsaufnahmen" label="Freiwillig: Ich willige ausdrücklich in ursprüngliche Zoom-Aufnahmen mit Bild, Stimme und möglichen Religionsbezügen ein. Bei YouTube dürfen keine Kinder erkennbar sein." checked={value.recordingGranted} disabled={disabled}
      onPress={() => onChange((current) => ({ ...current, recordingGranted: !current.recordingGranted }))} text={RECORDING_CONSENT_TEXT} />
    <View style={styles.footer}>
      <AppText style={styles.note} color={Palette.inkSoft}>{combineGuardianConfirmation
        ? 'Die Einwilligung ist für Kinder- und Lernfunktionen erforderlich. Aufnahmen sind freiwillig. Widerruf jederzeit im Konto.'
        : 'Die ersten beiden Angaben sind erforderlich. Aufnahmen sind freiwillig. Widerruf jederzeit im Konto.'}</AppText>
      <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" style={styles.link}>Datenschutzerklärung</Link>
    </View>
  </View>;
}

function Check({ title, label, text, checked, disabled, onPress }: {
  title: string; label: string; text: string; checked: boolean; disabled: boolean; onPress: () => void;
}) {
  return <View style={styles.choiceGroup}>
    <ConsentCheckbox label={label} checked={checked} disabled={disabled} onChange={onPress} />
    <View style={styles.details}><ConsentDetails title={title} text={text} /></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: Space.md, minWidth: 0 },
  choiceGroup: { gap: Space.xs },
  details: { paddingLeft: 24 + Space.md },
  note: { fontSize: 14, lineHeight: 20 },
  footer: { gap: Space.sm },
  link: { color: Palette.forest, textDecorationLine: 'underline', fontSize: 14, lineHeight: 20 },
});
