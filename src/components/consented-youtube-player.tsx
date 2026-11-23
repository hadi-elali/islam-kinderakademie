import { useState } from 'react';
import { Href, useRouter } from 'expo-router';
import { View } from 'react-native';

import YoutubeVideoPlayer from '@/components/YoutubeVideoPlayer';
import { ActionButton, AppText } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import type { YoutubeVideoPlayerProps } from '@/constants/Types';

export function ConsentedYoutubePlayer(props: YoutubeVideoPlayerProps) {
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();
  return <View style={{ width: '100%', gap: Space.md, backgroundColor: Palette.paper }}>
    {allowed ? <>
      <ActionButton label="Video schließen und Einwilligung widerrufen" variant="quiet" compact onPress={() => setAllowed(false)} />
      <YoutubeVideoPlayer {...props} />
    </> : <View style={{ padding: Space.lg, gap: Space.md }}>
      <AppText variant="bodyStrong">YouTube-Video laden?</AppText>
      <AppText variant="small" color={Palette.inkSoft}>Mit „YouTube-Video laden“ willigst du ausdrücklich ein, dass Google/YouTube den Player bereitstellt und dabei insbesondere IP-Adresse, Geräte- und Wiedergabeinformationen verarbeitet sowie Informationen auf deinem Gerät speichern oder auslesen kann. Im Zusammenhang mit dem Religionsunterricht können Rückschlüsse auf religiöse Überzeugungen möglich sein; auch diese umfasst deine ausdrückliche Einwilligung. Verarbeitungen in den USA sind möglich. Es gelten die Hinweise zu YouTube und internationalen Übermittlungen in der Datenschutzerklärung. Die Entscheidung ist freiwillig und kann direkt am Player widerrufen werden.</AppText>
      <ActionButton label="Datenschutzerklärung lesen" variant="quiet" compact onPress={() => router.push('/datenschutz' as Href)} />
      <ActionButton label="YouTube-Video laden" variant="secondary" onPress={() => setAllowed(true)} />
    </View>}
  </View>;
}
