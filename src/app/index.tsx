import { Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText, Pill } from '@/components/ui/primitives';
import { Layout, Palette, Radius, Space } from '@/constants/design';
import { useAuth } from '@/context/auth-context';

const benefits: { icon: AppIconName; title: string; description: string }[] = [
  {
    icon: 'video',
    title: 'Live gemeinsam lernen',
    description: 'Feste Zoom-Termine geben Kindern Struktur und schaffen echte Begegnung.',
  },
  {
    icon: 'journeys',
    title: 'Kleine Lerneinheiten',
    description: 'Interaktive Schritte begleiten den Unterricht kindgerecht und übersichtlich.',
  },
  {
    icon: 'children',
    title: 'Eltern behalten den Überblick',
    description: 'Termine, Lernwege und wichtige Hinweise liegen an einem geschützten Ort.',
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const compact = width < Layout.desktopBreakpoint;
  const small = width < Layout.compactBreakpoint;
  const verySmall = width < 360;

  const open = (href: string) => router.push(href as Href);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.header, small && styles.headerSmall]}>
        <Pressable accessibilityRole="link" onPress={() => open('/')}>
          <BrandMark dark />
        </Pressable>
        <View style={styles.headerActions}>
          {isAuthenticated ? (
            <PublicButton label="Zur Akademie" onPress={() => open('/dashboard')} />
          ) : (
            <>
              {!small && (
                <PublicButton label="Anmelden" variant="quiet" onPress={() => open('/login')} />
              )}
              <PublicButton label="Registrieren" onPress={() => open('/register')} />
            </>
          )}
        </View>
      </View>

      <View style={[styles.hero, compact && styles.heroCompact, small && styles.heroSmall]}>
        <View style={styles.heroCopy}>
          <Pill tone="sun" icon="trophy">
            Den Islam kindgerecht entdecken und verstehen.
          </Pill>
          <AppText
            variant="display"
            style={[
              styles.heroTitle,
              small && styles.heroTitleSmall,
              verySmall && styles.heroTitleVerySmall,
            ]}>
            Wissen, Gemeinschaft und Freude am Glauben.
          </AppText>
          <AppText color={Palette.inkSoft} style={styles.heroDescription}>
           Eine digitale Akademie, die den Live-Unterricht für Kinder durch eine strukturierte Übersicht und ergänzende Lernmaterialien unterstützt.
          </AppText>
          <View style={[styles.heroActions, small && styles.heroActionsSmall]}>
            <PublicButton
              label={isAuthenticated ? 'Zur Akademie' : 'Konto erstellen'}
              icon="arrow"
              onPress={() => open(isAuthenticated ? '/dashboard' : '/register')}
              large
            />
            {!isAuthenticated && (
              <PublicButton
                label="Ich habe ein Konto"
                variant="secondary"
                onPress={() => open('/login')}
                large
              />
            )}
          </View>
          <View style={[styles.trustRow, small && styles.trustRowSmall]}>
            <TrustItem icon="video" label="Live per Zoom" />
            <TrustItem icon="children" label="Für Familien" />
          </View>
        </View>

        <View
          style={[
            styles.previewWrap,
            compact && styles.previewWrapCompact,
            small && styles.previewWrapSmall,
          ]}>
          <View style={styles.previewGlow} />
          <View style={[styles.previewCard, small && styles.previewCardSmall]}>
            <View style={styles.previewTop}>
              <View style={styles.previewDots}>
                <View style={[styles.dot, { backgroundColor: Palette.coral }]} />
                <View style={[styles.dot, { backgroundColor: Palette.sun }]} />
                <View style={[styles.dot, { backgroundColor: Palette.mintStrong }]} />
              </View>
              <View style={styles.previewStatus}>
                <View style={styles.statusDot} />
                <AppText variant="small" color={Palette.forest}>
                  Akademiebereich
                </AppText>
              </View>
            </View>
            <View style={styles.previewWelcome}>
              <View style={styles.previewIcon}>
                <AppIcon name="journeys" size={28} color={Palette.forest} />
              </View>
              <View style={styles.previewWelcomeCopy}>
                <View style={[styles.placeholderLine, { width: '48%' }]} />
                <View style={[styles.placeholderLineLight, { width: '72%' }]} />
              </View>
            </View>
            <View style={styles.previewGrid}>
              <PreviewTile tone="sun" icon="video" />
              <PreviewTile tone="mint" icon="calendar" />
            </View>
            <View style={styles.previewLesson}>
              <View style={styles.lessonThumb}>
                <AppIcon name="play" size={24} color={Palette.white} />
              </View>
              <View style={styles.previewWelcomeCopy}>
                <View style={[styles.placeholderLine, { width: '56%' }]} />
                <View style={[styles.placeholderLineLight, { width: '84%' }]} />
                <View style={styles.progressTrack}>
                  <View style={styles.progressValue} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.benefitSection, small && styles.benefitSectionSmall]}>
        <View style={styles.sectionHeading}>
          <AppText variant="label" color={Palette.forest}>
            ALLES AN EINEM ORT
          </AppText>
          <AppText variant={small ? 'title' : 'display'} style={styles.sectionTitle}>
            Lernen mit einem klaren Rhythmus
          </AppText>
          <AppText color={Palette.inkSoft} style={styles.sectionDescription}>
            Die Akademie verbindet persönliche Live-Momente mit digitalen Lernwegen für zu
            Hause.
          </AppText>
        </View>
        <View style={[styles.benefitGrid, compact && styles.benefitGridCompact]}>
          {benefits.map((benefit, index) => (
            <View key={benefit.title} style={[styles.benefitCard, small && styles.benefitCardSmall]}>
              <View
                style={[
                  styles.benefitIcon,
                  index === 1 && { backgroundColor: Palette.sunSoft },
                  index === 2 && { backgroundColor: Palette.skySoft },
                ]}>
                <AppIcon name={benefit.icon} size={25} color={Palette.forest} />
              </View>
              <AppText variant="heading">{benefit.title}</AppText>
              <AppText color={Palette.inkSoft}>{benefit.description}</AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cta, small && styles.ctaSmall]}>
        <View style={styles.ctaPatternOne} />
        <View style={styles.ctaPatternTwo} />
        <View style={styles.ctaCopy}>
          <AppText variant="label" color={Palette.sun}>
            BEREIT FÜR DEN GESCHÜTZTEN BEREICH?
          </AppText>
          <AppText variant={small ? 'title' : 'display'} color={Palette.white}>
            Der Einstieg beginnt mit einem eigenen Konto.
          </AppText>
        </View>
        <PublicButton
          label={isAuthenticated ? 'Akademie öffnen' : 'Jetzt registrieren'}
          variant="light"
          icon="arrow"
          onPress={() => open(isAuthenticated ? '/dashboard' : '/register')}
          large
        />
      </View>

      <View style={[styles.footer, small && styles.footerSmall]}>
        <AppText variant="small" color={Palette.muted}>
          © {new Date().getFullYear()} BufiB-Kinderakademie
        </AppText>
        <View style={styles.footerLinks}>
          <Pressable
            accessibilityRole="link"
            onPress={() => open('/impressum')}
            style={({ pressed }) => pressed && styles.pressed}>
            <AppText variant="small" color={Palette.forest} style={styles.footerLinkText}>
              Impressum
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => open('/datenschutz')}
            style={({ pressed }) => pressed && styles.pressed}>
            <AppText variant="small" color={Palette.forest} style={styles.footerLinkText}>
              Datenschutz
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function PublicButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  large = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'secondary' | 'light';
  icon?: AppIconName;
  large?: boolean;
}) {
  const colors = {
    primary: { background: Palette.forest, text: Palette.white, border: Palette.forest },
    quiet: { background: 'transparent', text: Palette.forest, border: 'transparent' },
    secondary: { background: Palette.paper, text: Palette.ink, border: Palette.line },
    light: { background: Palette.sun, text: Palette.ink, border: Palette.sun },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.publicButton,
        large && styles.publicButtonLarge,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <AppText variant="bodyStrong" color={colors.text}>
        {label}
      </AppText>
      {icon && <AppIcon name={icon} size={18} color={colors.text} />}
    </Pressable>
  );
}

function TrustItem({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <View style={styles.trustItem}>
      <AppIcon name={icon} size={16} color={Palette.forest} />
      <AppText variant="small" color={Palette.inkSoft}>
        {label}
      </AppText>
    </View>
  );
}

function PreviewTile({ tone, icon }: { tone: 'sun' | 'mint'; icon: AppIconName }) {
  return (
    <View style={[styles.previewTile, tone === 'sun' ? styles.previewTileSun : styles.previewTileMint]}>
      <AppIcon name={icon} size={22} color={Palette.forest} />
      <View style={[styles.placeholderLine, { width: '55%' }]} />
      <View style={[styles.placeholderLineLight, { width: '78%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.cream },
  pageContent: { alignItems: 'center' },
  header: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1240,
    minHeight: 82,
    paddingHorizontal: Space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSmall: { minHeight: 72, paddingHorizontal: Space.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  hero: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1240,
    minHeight: 640,
    paddingHorizontal: Space.xxl,
    paddingVertical: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 70,
  },
  heroCompact: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 44, gap: 48 },
  heroSmall: { minHeight: 0, paddingHorizontal: Space.lg, paddingTop: Space.xl, paddingBottom: 48, gap: Space.xxl },
  heroCopy: { flex: 1, width: '100%', minWidth: 0, maxWidth: 610, alignItems: 'flex-start' },
  heroTitle: { fontSize: 58, lineHeight: 64, letterSpacing: -2.3, marginTop: Space.xl },
  heroTitleSmall: { fontSize: 36, lineHeight: 42, letterSpacing: -1.25 },
  heroTitleVerySmall: { fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  heroDescription: { fontSize: 18, lineHeight: 27, maxWidth: 570, marginTop: Space.lg },
  heroActions: { flexDirection: 'row', gap: Space.md, marginTop: Space.xxl },
  heroActionsSmall: { width: '100%', flexDirection: 'column' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xl, marginTop: Space.xxl },
  trustRowSmall: { width: '100%', gap: Space.md },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  publicButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  publicButtonLarge: { minHeight: 54, paddingHorizontal: 24 },
  previewWrap: { flex: 0.9, minWidth: 390, maxWidth: 500, width: '100%', position: 'relative' },
  previewWrapCompact: { minWidth: 0, marginTop: Space.xl },
  previewWrapSmall: { marginTop: Space.huge + Space.lg },
  previewGlow: {
    position: 'absolute',
    left: -32,
    right: 28,
    top: -34,
    bottom: 46,
    borderRadius: 60,
    backgroundColor: Palette.mint,
    transform: [{ rotate: '-5deg' }],
  },
  previewCard: {
    padding: Space.xl,
    borderRadius: 30,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    boxShadow: '0 16px 30px rgba(23, 61, 58, 0.13)',
    gap: Space.lg,
  },
  previewCardSmall: { padding: Space.lg, borderRadius: Radius.large },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  previewStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.mint,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.forest },
  previewWelcome: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: 4 },
  previewIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sunSoft,
  },
  previewWelcomeCopy: { flex: 1, gap: 9 },
  placeholderLine: { height: 9, borderRadius: 5, backgroundColor: Palette.ink },
  placeholderLineLight: { height: 7, borderRadius: 4, backgroundColor: Palette.line },
  previewGrid: { flexDirection: 'row', gap: Space.md },
  previewTile: { flex: 1, minHeight: 112, borderRadius: Radius.large, padding: Space.lg, gap: 11 },
  previewTileSun: { backgroundColor: Palette.sunSoft },
  previewTileMint: { backgroundColor: Palette.mint },
  previewLesson: {
    flexDirection: 'row',
    gap: Space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.large,
    padding: Space.md,
  },
  lessonThumb: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.forest,
  },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: Palette.line },
  progressValue: { width: '42%', height: '100%', borderRadius: 3, backgroundColor: Palette.coral },
  benefitSection: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: Palette.paper,
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingVertical: 86,
  },
  benefitSectionSmall: { paddingHorizontal: Space.lg, paddingVertical: 56 },
  sectionHeading: { width: '100%', maxWidth: 650, alignItems: 'center' },
  sectionTitle: { textAlign: 'center', marginTop: Space.md },
  sectionDescription: { textAlign: 'center', maxWidth: 570, marginTop: Space.md },
  benefitGrid: {
    width: '100%',
    maxWidth: 1176,
    flexDirection: 'row',
    gap: Space.lg,
    marginTop: 44,
  },
  benefitGridCompact: { flexDirection: 'column' },
  benefitCard: {
    flex: 1,
    minHeight: 230,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: Space.xl,
    gap: Space.md,
    backgroundColor: Palette.white,
  },
  benefitCardSmall: { minHeight: 0, padding: Space.lg },
  benefitIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mint,
    marginBottom: Space.sm,
  },
  cta: {
    width: '92%',
    maxWidth: 1176,
    overflow: 'hidden',
    marginVertical: 72,
    borderRadius: 32,
    padding: 48,
    minHeight: 230,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.xxl,
    backgroundColor: Palette.forestDark,
  },
  ctaSmall: {
    width: '92%',
    minHeight: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    marginVertical: 48,
    borderRadius: Radius.large,
    padding: Space.lg,
  },
  ctaPatternOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 44,
    borderColor: 'rgba(167,213,190,0.07)',
    right: 180,
    top: -100,
  },
  ctaPatternTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: 'rgba(242,201,109,0.06)',
    left: -60,
    bottom: -70,
    transform: [{ rotate: '24deg' }],
  },
  ctaCopy: { flex: 1, maxWidth: 620, gap: Space.md },
  footer: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1240,
    minHeight: 100,
    paddingHorizontal: Space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  footerSmall: {
    minHeight: 120,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.lg,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Space.md,
  },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xl },
  footerLinkText: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.72 },
});
