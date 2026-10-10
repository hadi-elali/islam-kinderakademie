import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { Palette, Radius } from '@/constants/design';

export function StaffPortrait({ name, url, size = 56 }: { name: string; url: string | null; size?: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const dimensions = { width: size, height: size };
  return url && url !== failedUrl ? (
    <Image source={{ uri: url }} accessibilityLabel={`Profilbild von ${name}`} style={[styles.image, dimensions]} onError={() => setFailedUrl(url)} />
  ) : (
    <View style={[styles.placeholder, dimensions]}>
      <AppText variant="bodyStrong">{name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: Radius.medium, resizeMode: 'cover' },
  placeholder: { borderRadius: Radius.medium, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
});
