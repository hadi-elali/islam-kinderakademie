import { Linking, Text, View } from 'react-native';

import { LegalPlaceholder } from '@/components/legal-placeholder';
import { CaptchaWithdrawal } from '@/components/auth/captcha-privacy';
import { AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { PRIVACY_DATE } from '@/constants/privacy';
import policy from '@/constants/privacy-policy.json';

function LegalParagraph({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\((?:https:\/\/|mailto:)[^\s)]+\)|\*\*[^*]+\*\*)/g);
  return <AppText color={Palette.inkSoft}>{parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <Text key={index} accessibilityRole="link" style={{ color: Palette.forest, textDecorationLine: 'underline' }} onPress={() => void Linking.openURL(link[2])}>{link[1]}</Text>;
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={index} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
    return part;
  })}</AppText>;
}

export default function DatenschutzScreen() {
  return <LegalPlaceholder title="Datenschutzerklärung"
    description={`Informationen zu deinen Daten, unseren Diensten und deinen Rechten. Stand: ${PRIVACY_DATE}.`}
    isPlaceholder={false}
    fields={[{ label: 'Deine hCaptcha-Entscheidung', placeholder: '', content: <CaptchaWithdrawal /> }, ...policy.sections.map((section) => ({
      label: section.title,
      placeholder: '',
      content: <View style={{ gap: Space.md }}>{section.paragraphs.map((paragraph, index) => <LegalParagraph key={index} text={paragraph} />)}</View>,
    }))]} />;
}
