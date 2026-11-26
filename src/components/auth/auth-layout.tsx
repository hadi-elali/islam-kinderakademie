import { Href, useRouter } from 'expo-router';
import { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/primitives';
import { Layout, Palette, Radius, Space } from '@/constants/design';

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
}>) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < Layout.desktopBreakpoint;
  const small = width < Layout.compactBreakpoint;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Pressable accessibilityRole="link" onPress={() => router.push('/' as Href)}>
            <BrandMark dark />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/' as Href)}
            style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}>
            <AppIcon name="arrow" size={17} color={Palette.forest} style={styles.backIcon} />
            <AppText variant="bodyStrong" color={Palette.forest}>
              Zur Startseite
            </AppText>
          </Pressable>
        </View>

        <View
          style={[
            styles.content,
            compact && styles.contentCompact,
            compact && { width: Math.max(width - Space.lg * 2, 0) },
          ]}>
          {!compact && (
            <View testID="auth-intro" style={styles.storyPanel}>
              <View style={styles.storyContent}>
                <View style={styles.storyIcon}>
                  <AppIcon name="journeys" size={30} color={Palette.ink} />
                </View>
                <AppText variant="display" color={Palette.white} style={styles.storyTitle}>
                  Ein sicherer Ort für den gemeinsamen Lernweg.
                </AppText>
                <View style={styles.storyList}>
                  <StoryPoint
                    icon="calendar"
                    backgroundColor={Palette.skySoft}
                    label="Live-Termine übersichtlich im Kalender"
                  />
                  <StoryPoint
                    icon="journeys"
                    backgroundColor={Palette.sunSoft}
                    label="Interaktive Lerneinheiten an einem Ort"
                  />
                  <StoryPoint
                    icon="children"
                    backgroundColor={Palette.mint}
                    label="Eigener Bereich für jede Familie"
                  />
                </View>
              </View>
            </View>
          )}

          <View style={[styles.formColumn, compact && styles.formColumnCompact]}>
            <View testID="auth-form-card" style={[styles.formCard, compact && styles.formCardCompact, small && styles.formCardSmall]}>
              <View style={styles.formHeading}>
                <AppText variant="label" color={Palette.forest}>
                  {eyebrow}
                </AppText>
                <AppText variant="display">{title}</AppText>
                <AppText color={Palette.inkSoft}>{description}</AppText>
              </View>
              {children}
              <View style={styles.footer}>{footer}</View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthField({ label, error, ...inputProps }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" color={Palette.ink}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={Palette.muted}
        selectionColor={Palette.forest}
        {...inputProps}
        style={[styles.input, error ? styles.inputError : null, inputProps.style]}
      />
      {error && (
        <AppText variant="small" color="#A43F2C">
          {error}
        </AppText>
      )}
    </View>
  );
}

export function InlineNotice({
  tone = 'error',
  children,
}: PropsWithChildren<{ tone?: 'error' | 'info' | 'success' }>) {
  const colors = {
    error: { background: Palette.coralSoft, border: '#F1B8A8', icon: '#A43F2C' },
    info: { background: Palette.skySoft, border: '#B8D9E3', icon: '#2E6474' },
    success: { background: Palette.mint, border: Palette.mintStrong, icon: Palette.forest },
  }[tone];

  return (
    <View style={[styles.notice, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <AppIcon name={tone === 'error' ? 'close' : tone === 'success' ? 'check' : 'lock'} size={18} color={colors.icon} />
      <AppText variant="small" color={colors.icon} style={styles.noticeCopy}>
        {children}
      </AppText>
    </View>
  );
}

function StoryPoint({
  icon,
  backgroundColor,
  label,
}: {
  icon: AppIconName;
  backgroundColor: string;
  label: string;
}) {
  return (
    <View style={styles.storyPoint}>
      <View style={[styles.storyPointIcon, { backgroundColor }]}>
        <AppIcon name={icon} size={21} color={Palette.forest} />
      </View>
      <AppText color={Palette.white} style={styles.storyPointText}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  page: { flex: 1, backgroundColor: Palette.cream },
  pageContent: { flexGrow: 1, alignItems: 'center' },
  header: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1120,
    minHeight: 82,
    paddingHorizontal: Space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCompact: { paddingHorizontal: Space.lg, gap: Space.md },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  content: {
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1120,
    paddingHorizontal: Space.xxl,
    paddingTop: Space.lg,
    paddingBottom: Space.huge,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.huge,
  },
  contentCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  storyPanel: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
    backgroundColor: Palette.forest,
    borderRadius: 28,
    padding: Space.xxl,
  },
  storyContent: { maxWidth: 440 },
  storyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sunSoft,
    marginBottom: Space.xl,
  },
  storyTitle: { fontSize: 34, lineHeight: 42, letterSpacing: -0.8 },
  storyList: { marginTop: Space.xl },
  storyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.16)',
  },
  storyPointText: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 24 },
  storyPointIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formColumn: { width: '48%', minWidth: 420, justifyContent: 'flex-start' },
  formColumnCompact: { width: '100%', minWidth: 0, maxWidth: '100%' },
  formCard: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.paper,
    padding: Space.xxl,
    boxShadow: '0 12px 24px rgba(23, 61, 58, 0.07)',
  },
  formCardCompact: { padding: Space.xl },
  formCardSmall: { padding: Space.lg, borderRadius: Radius.large },
  formHeading: { minWidth: 0, gap: Space.md, marginBottom: Space.xl },
  field: { gap: 7 },
  input: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    minHeight: 52,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.medium,
    backgroundColor: Palette.white,
    paddingHorizontal: Space.lg,
    fontSize: 16,
    color: Palette.ink,
  },
  inputError: { borderColor: Palette.coral },
  notice: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  noticeCopy: { flex: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    paddingTop: Space.lg,
    marginTop: Space.xl,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
});
