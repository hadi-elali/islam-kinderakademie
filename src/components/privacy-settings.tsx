import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PrivacyChoices } from '@/components/privacy-choices';
import { CaptchaWithdrawal } from '@/components/auth/captcha-privacy';
import { ActionButton, AppText, Card } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { PRIVACY_DATE, type PrivacyChoices as Choices } from '@/constants/privacy';
import { usePrivacy } from '@/context/privacy-context';

export function PrivacySettings() {
  const privacy = usePrivacy();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choices>({ guardianConfirmed: false, childDataGranted: false, recordingGranted: false });

  async function save(next: Choices) {
    setSaving(true);
    setError(null);
    try { await privacy.save(next); setEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Die Änderung konnte nicht gespeichert werden.'); }
    finally { setSaving(false); }
  }

  return <Card>
    <View style={{ gap: Space.lg }}>
      <AppText variant="heading">Meine Datenschutzentscheidungen</AppText>
      <AppText variant="small" color={Palette.muted}>Textfassung vom {PRIVACY_DATE}. Eine erneute Abfrage ist bei unveränderten Zwecken und gültiger Entscheidung nicht erforderlich.</AppText>
      {privacy.isLoading ? <ActivityIndicator color={Palette.forest} /> : privacy.error ? <>
        <AppText color={Palette.inkSoft}>{privacy.error}</AppText>
        <ActionButton label="Erneut laden" onPress={() => void privacy.refresh()} />
      </> : editing ? <>
        <PrivacyChoices value={choices} onChange={setChoices} disabled={saving} />
        <ActionButton label={saving ? 'Wird gespeichert …' : 'Entscheidung speichern'} disabled={saving || !choices.guardianConfirmed || !choices.childDataGranted}
          onPress={() => void save(choices)} />
        <ActionButton label="Abbrechen" variant="quiet" disabled={saving} onPress={() => setEditing(false)} />
      </> : <>
        <AppText>Kinderprofile und Lernstände: {privacy.state?.child_data_granted ? 'Eingewilligt' : 'Keine aktuelle Einwilligung'}</AppText>
        <AppText>Ursprüngliche Unterrichtsaufnahme: {privacy.state?.recording_granted ? 'Freiwillig erlaubt' : 'Nicht erlaubt'}</AppText>
        {privacy.state?.child_data_recorded_at && <AppText variant="small" color={Palette.muted}>Letzte Entscheidung zu Kinderdaten: {new Date(privacy.state.child_data_recorded_at).toLocaleString('de-DE')}</AppText>}
        {privacy.state?.recording_recorded_at && <AppText variant="small" color={Palette.muted}>Letzte Aufnahmeentscheidung: {new Date(privacy.state.recording_recorded_at).toLocaleString('de-DE')}</AppText>}
        <ActionButton label="Entscheidungen ändern" variant="secondary" disabled={saving} onPress={() => {
          setChoices({ guardianConfirmed: Boolean(privacy.state?.child_data_granted), childDataGranted: Boolean(privacy.state?.child_data_granted), recordingGranted: Boolean(privacy.state?.recording_granted) });
          setEditing(true);
        }} />
        {privacy.state?.recording_granted && <ActionButton label="Aufnahme-Einwilligung widerrufen" variant="secondary" disabled={saving}
          onPress={() => void save({ guardianConfirmed: true, childDataGranted: Boolean(privacy.state?.child_data_granted), recordingGranted: false })} />}
        {privacy.state?.child_data_granted && <>
          <AppText variant="small" color={Palette.inkSoft}>Beim Widerruf der Kinderdaten-Einwilligung werden die Kinder- und Lernfunktionen sowie eine Aufnahmefreigabe beendet. Dein Konto bleibt zur Verwaltung und Kontaktaufnahme zugänglich. Bestehende Daten und Aufnahmen sind anschließend auf ihre Löschung zu prüfen.</AppText>
          <ActionButton label="Einwilligung in Kinderdaten widerrufen" variant="secondary" disabled={saving}
            onPress={() => void save({ guardianConfirmed: false, childDataGranted: false, recordingGranted: false })} />
        </>}
      </>}
      {error && <AppText color={Palette.inkSoft}>{error}</AppText>}
      <AppText variant="bodyStrong">hCaptcha auf diesem Gerät</AppText>
      <CaptchaWithdrawal />
    </View>
  </Card>;
}
