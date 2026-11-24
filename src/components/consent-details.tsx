import { useId, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { PRIVACY_DATE } from '@/constants/privacy';

/** Keep the complete versioned declaration one action away from the choice. */
export function ConsentDetails({ title, text, children }: {
  title: string; text: string; children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return <View style={styles.container}>
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${title}: ${expanded ? 'Details schließen' : 'vollständige Erklärung lesen'}`}
      accessibilityState={{ expanded }} aria-expanded={expanded} aria-controls={id}
      onPress={() => setExpanded((current) => !current)} style={styles.toggle}>
      <AppText style={styles.link} color={Palette.forest}>{expanded ? 'Details schließen' : 'Details lesen'}</AppText>
    </Pressable>
    <View nativeID={id} style={[styles.details, !expanded && styles.hidden]}>
      <AppText style={styles.text} color={Palette.inkSoft}>{text}</AppText>
      <AppText style={styles.version} color={Palette.inkSoft}>Textfassung: {PRIVACY_DATE}</AppText>
      {children}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { minWidth: 0, gap: Space.sm },
  toggle: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: Space.xs },
  link: { fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  details: { gap: Space.md, padding: Space.lg, borderLeftWidth: 2, borderColor: Palette.line, backgroundColor: Palette.cream },
  hidden: { display: 'none' },
  text: { fontSize: 16, lineHeight: 25 },
  version: { fontSize: 14, lineHeight: 20 },
});
