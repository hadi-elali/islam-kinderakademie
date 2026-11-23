import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';

import { ActionButton, AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { CAPTCHA_CONSENT_TEXT } from '@/constants/privacy';
import { clearCaptchaConsent, grantCaptchaConsent, useCaptchaConsent } from '@/lib/captcha-consent';

function withdraw() {
  clearCaptchaConsent();
  // Unmounting an iframe alone does not stop an already loaded third-party SDK.
  // A fresh document unloads it completely, without resetting/contacting hCaptcha.
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
}

export function CaptchaWithdrawal() {
  const consent = useCaptchaConsent();
  return <View style={{ gap: Space.sm }}>
    <AppText variant="small" color={Palette.inkSoft}>
      {consent ? 'hCaptcha ist für diese geöffnete Seite bzw. App-Sitzung erlaubt. Beim Widerruf wird die Webseite neu geladen; nicht abgesendete Eingaben gehen verloren. Bereits gesetzte Anbieter-Cookies kannst du in den Browsereinstellungen löschen.' : 'Für diese geöffnete Seite bzw. App-Sitzung ist hCaptcha nicht freigegeben.'}
    </AppText>
    {consent && <ActionButton label="hCaptcha-Einwilligung widerrufen" variant="secondary" onPress={withdraw} />}
  </View>;
}

export function CaptchaPrivacyGate({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const consent = useCaptchaConsent();
  return <View style={{ gap: Space.md, width: '100%' }}>
    {consent ? <>{children}<CaptchaWithdrawal /></> : <>
      <AppText variant="bodyStrong">Deine Entscheidung zu hCaptcha</AppText>
      <AppText variant="small" color={Palette.inkSoft}>{CAPTCHA_CONSENT_TEXT}</AppText>
      <ActionButton label="Einwilligen und hCaptcha laden" variant="secondary" disabled={disabled} onPress={grantCaptchaConsent} />
    </>}
    <Link href="/datenschutz" style={{ color: Palette.forest, textDecorationLine: 'underline' }}>Datenschutzerklärung lesen</Link>
    <ActionButton label="Ohne hCaptcha Kontakt aufnehmen" variant="secondary" disabled={disabled}
      onPress={() => void Linking.openURL('mailto:info@bufib.de?subject=Kontoanliegen%20ohne%20hCaptcha')} />
    <AppText variant="small" color={Palette.muted}>Ohne Zustimmung wird hCaptcha nicht geladen. Für eine Kontoanlage, Zugangshilfe oder Kontolöschung kannst du uns über info@bufib.de kontaktieren. Der Unterricht ist unabhängig von dieser Zustimmung.</AppText>
  </View>;
}
