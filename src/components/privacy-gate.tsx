import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthLayout, InlineNotice } from '@/components/auth/auth-layout';
import { PrivacyChoices } from '@/components/privacy-choices';
import { ActionButton, AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import type { PrivacyChoices as Choices } from '@/constants/privacy';
import { useAuth } from '@/context/auth-context';
import { usePrivacy } from '@/context/privacy-context';

export function PrivacyGate() {
  const router = useRouter();
  const { signOut } = useAuth();
  const privacy = usePrivacy();
  const [choices, setChoices] = useState<Choices>({ guardianConfirmed: false, childDataGranted: false, recordingGranted: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try { await privacy.save(choices); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Die Entscheidung konnte nicht gespeichert werden.'); }
    finally { setSaving(false); }
  }

  return <AuthLayout eyebrow="DEINE ENTSCHEIDUNG" title="Datenschutz bestätigen"
    description="Bevor du die Kinder- und Lernfunktionen nutzt, benötigen wir einmalig deine gesonderte Entscheidung. Bestehende Konten holen diese Entscheidung hier nach." footer={null}>
    <View style={{ gap: Space.lg }}>
      {privacy.isLoading ? <ActivityIndicator color={Palette.forest} /> : privacy.error ? <>
        <InlineNotice tone="error">{privacy.error}</InlineNotice>
        <ActionButton label="Erneut versuchen" onPress={() => void privacy.refresh()} />
      </> : <>
        <PrivacyChoices value={choices} onChange={setChoices} disabled={saving} />
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        <ActionButton label={saving ? 'Wird gespeichert …' : 'Entscheidung speichern und weiter'}
          disabled={saving || !choices.childDataGranted || !choices.guardianConfirmed} onPress={() => void submit()} />
      </>}
      <AppText variant="small" color={Palette.muted}>Ohne Einwilligung kannst du weiterhin dein Konto und deine Rechte verwalten oder uns über info@bufib.de kontaktieren.</AppText>
      <ActionButton label="Zum Konto" variant="secondary" onPress={() => router.push('/account' as Href)} />
      <ActionButton label="Abmelden" variant="quiet" onPress={() => void signOut()} />
    </View>
  </AuthLayout>;
}
