import { useRef, type RefObject } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CaptchaWithdrawal } from '@/components/auth/captcha-privacy';
import { Card } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { PRIVACY_VERSION } from '@/constants/privacy';
import policy from '@/constants/privacy-policy.json';
import { hCaptchaBaseUrl } from '@/lib/hcaptcha';

export type PrivacyDocumentProps = { scrollRef: RefObject<ScrollView | null> };

function FormattedText({ text }: { text: string }) {
  return <Text selectable style={styles.body}>{text.split(/(\[[^\]]+\]\((?:https:\/\/|mailto:)[^\s)]+\)|\*\*[^*]+\*\*)/g).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <Text key={index} accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(link[2])}>{link[1]}</Text>;
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={index} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
    return part;
  })}</Text>;
}

export function PrivacyTitle() {
  return <Text accessibilityRole="header" style={styles.title}>Datenschutzerklärung</Text>;
}

export function PrivacyDocument({ scrollRef }: PrivacyDocumentProps) {
  const targets = useRef(new Map<string, View>());
  function goTo(id: string) {
    const container = scrollRef.current?.getInnerViewNode();
    const target = targets.current.get(id);
    if (container && target) target.measureLayout(container, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - Space.lg), animated: true }));
  }
  const jump = (id: string, label: string) => <Pressable accessibilityRole="link" onPress={() => goTo(id)} style={styles.navLink}><Text style={[styles.body, styles.link]}>{label}</Text></Pressable>;

  return <View style={{ gap: Space.xl }}>
    <View style={{ gap: Space.sm }}>
      {jump('hcaptcha-einstellungen', 'hCaptcha-Einstellungen und Widerruf')}
      <Pressable accessibilityRole="link" style={styles.navLink} onPress={() => void Linking.openURL(`${hCaptchaBaseUrl}/legal/privacy-${PRIVACY_VERSION}.html`)}><Text style={[styles.body, styles.link]}>Druckansicht öffnen</Text></Pressable>
    </View>
    <Card>
      <View collapsable={false} ref={(node) => { if (node) targets.current.set('inhaltsverzeichnis', node); else targets.current.delete('inhaltsverzeichnis'); }} style={{ gap: Space.md }}>
        <Text accessibilityRole="header" style={styles.heading}>Inhaltsverzeichnis</Text>
        {policy.sections.map((section, index) => <View key={section.title}>{jump(`abschnitt-${index + 1}`, section.title)}</View>)}
      </View>
    </Card>
    <Card>
      {policy.sections.map((section, index) => <View key={section.title} collapsable={false} ref={(node) => { if (node) targets.current.set(`abschnitt-${index + 1}`, node); else targets.current.delete(`abschnitt-${index + 1}`); }} style={[styles.section, index > 0 && styles.sectionBorder]}>
        <Text accessibilityRole="header" style={styles.heading}>{section.title}</Text>
        {section.paragraphs.map((paragraph, n) => <FormattedText key={n} text={paragraph} />)}
        {index === 10 && <View collapsable={false} ref={(node) => { if (node) targets.current.set('hcaptcha-einstellungen', node); else targets.current.delete('hcaptcha-einstellungen'); }} style={styles.settings}>
          <Text accessibilityRole="header" style={styles.subheading}>Einstellungen zu hCaptcha</Text>
          <CaptchaWithdrawal />
        </View>}
        {jump('inhaltsverzeichnis', 'Zum Inhaltsverzeichnis')}
      </View>)}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800', color: Palette.ink, flexShrink: 1 },
  heading: { fontSize: 21, lineHeight: 29, fontWeight: '700', color: Palette.ink },
  subheading: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: Palette.ink },
  body: { fontSize: 16, lineHeight: 26, color: Palette.inkSoft },
  link: { color: Palette.forest, textDecorationLine: 'underline' },
  navLink: { minHeight: 32, justifyContent: 'center', paddingVertical: Space.xs },
  section: { gap: Space.lg, paddingVertical: Space.xl },
  sectionBorder: { borderTopWidth: 1, borderTopColor: Palette.line },
  settings: { gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: Palette.forest, borderRadius: 12 },
});
