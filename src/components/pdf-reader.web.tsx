import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';

type PdfReaderProps = {
  sourceUrl: string;
  title: string;
  height?: number;
  onError?: () => void;
};

export default function PdfReader({
  sourceUrl,
  title,
  height = 680,
  onError,
}: PdfReaderProps) {
  return (
    <View style={[styles.frame, { height }]}>
      {React.createElement('iframe', {
        src: sourceUrl,
        loading: 'lazy',
        title,
        onError,
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: Palette.white,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.medium,
    backgroundColor: Palette.white,
  },
});
