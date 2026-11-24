import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';

import { ActionButton, AppText } from '@/components/ui/primitives';
import { ConsentDetails } from '@/components/consent-details';
import { Palette, Space } from '@/constants/design';
import { CAPTCHA_CONSENT_TEXT } from '@/constants/privacy';
import { clearCaptchaConsent, grantCaptchaConsent, useCaptchaConsent } from '@/lib/captcha-consent';

function withdraw() {
  clearCaptchaConsent();
  // Unmounting an iframe alone does not stop an already loaded third-party SDK.
  // A fresh document unloads it completely, without resetting/contacting hCaptcha.
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
}

export function CaptchaWithdrawal({ compact = false }: { compact?: boolean }) {
  const consent = useCaptchaConsent();
  return <View style={{ gap: Space.sm }}>
    {!compact && <AppText color={Palette.inkSoft} style={{ fontSize: 16, lineHeight: 26 }}>
      {consent ? 'hCaptcha ist für diesen Besuch aktiviert. Die Einwilligung kann hier jederzeit widerrufen werden.' : 'hCaptcha ist derzeit nicht aktiviert. Der Dienst wird erst nach Ihrer Zustimmung geladen.'}
    </AppText>}
    {consent && <>
      <AppText color={Palette.inkSoft} style={{ fontSize: compact ? 14 : 16, lineHeight: compact ? 20 : 26 }}>
        {Platform.OS === 'web' ? (compact ? 'Ein Widerruf lädt die Seite neu und verwirft nicht abgesendete Eingaben.' : 'Beim Widerruf wird diese Seite neu geladen. Nicht abgesendete Eingaben gehen dabei verloren. Bereits gesetzte Anbieter-Cookies lassen sich zusätzlich in den Browsereinstellungen entfernen.') : 'Beim Widerruf wird die Sicherheitsprüfung geschlossen. Bereits gespeicherte Anbieterinformationen lassen sich zusätzlich in den Geräteeinstellungen entfernen.'}
      </AppText>
      <ActionButton label="hCaptcha-Einwilligung widerrufen" variant="secondary" lableStyle={{ fontSize: 16 }} onPress={withdraw} />
    </>}
  </View>;
}

export function CaptchaPrivacyGate({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const consent = useCaptchaConsent();
  return <View style={{ gap: Space.md, width: '100%' }}>
    {consent ? <>{children}<CaptchaWithdrawal compact /></> : <>
      <AppText variant="bodyStrong">Sicherheitsprüfung</AppText>
      <AppText color={Palette.inkSoft} style={{ fontSize: 16, lineHeight: 24 }}>hCaptcha (Intuition Machines, USA) verarbeitet zur Bot-Prüfung IP-/Gerätedaten und Interaktionen; Cookies bis 30 Tage. Ich willige ausdrücklich ein, auch soweit dabei religiöse Überzeugungen erkennbar werden.</AppText>
      <ConsentDetails title="hCaptcha" text={CAPTCHA_CONSENT_TEXT}>
        <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: Palette.forest, textDecorationLine: 'underline' }}>Datenschutzerklärung</Link>
      </ConsentDetails>
    </>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
      {!consent && <ActionButton label="Einwilligen und hCaptcha laden" variant="secondary" disabled={disabled} onPress={grantCaptchaConsent} style={{ flexGrow: 1, flexBasis: 180 }} />}
      <ActionButton label="Ohne hCaptcha per E-Mail" variant="secondary" disabled={disabled}
        style={{ flexGrow: 1, flexBasis: 180 }} onPress={() => void Linking.openURL('mailto:info@bufib.de?subject=Kontoanliegen%20ohne%20hCaptcha')} />
    </View>
    {!consent && <AppText color={Palette.inkSoft} style={{ fontSize: 14, lineHeight: 20 }}>Jederzeit widerrufbar. Alternativ Kontoanlage, Zugangshilfe und Löschung per E-Mail; die Unterrichtsteilnahme bleibt möglich.</AppText>}
  </View>;
}
