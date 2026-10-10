import { Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { DataLoading, ErrorBanner } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, PageScaffold, Pill, SectionHeader, StatCard } from '@/components/ui/primitives';
import { Layout, Palette, Space } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { useAcademyData } from '@/context/academy-data-context';
import { formatDateTime } from '@/utils/format';

const quickActions: { label: string; description: string; icon: AppIconName; href: string }[] = [
  { label: 'Curriculum', description: 'Lernreisen strukturieren', icon: 'curriculum', href: '/curriculum' },
  { label: 'Lektionen', description: 'Inhalte und Schritte', icon: 'lessons', href: '/lektionen' },
  { label: 'Kalender', description: 'Live-Unterricht planen', icon: 'calendar', href: '/kalender' },
  { label: 'Zeitgruppen', description: 'Unterrichtszeiten und Freigaben', icon: 'groups', href: '/gruppen' },
  { label: 'Mitteilungen', description: 'Familien informieren', icon: 'messages', href: '/mitteilungen' },
  { label: 'Medien', description: 'Dateien bereitstellen', icon: 'media', href: '/medien' },
  { label: 'Abzeichen', description: 'Lernziele verleihen', icon: 'trophy', href: '/abzeichen' },
  { label: 'Abgaben', description: 'Antworten einsehen', icon: 'check', href: '/abgaben' },
];

export function TeamDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const stacked = width < Layout.contentStackBreakpoint;
  const { data, isLoading, error, refresh } = useAcademyData();
  const setup = [
    { label: 'Zeitgruppen einrichten', done: data.groups.length > 0, href: '/gruppen' },
    { label: 'Lernreisen erstellen', done: data.journeys.length > 0, href: '/curriculum' },
    { label: 'Erste Lektion veröffentlichen', done: data.lessons.some((lesson) => lesson.status === 'published'), href: '/lektion-neu' },
  ];
  const latestLesson = [...data.lessons].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const latestMessage = [...data.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const latestActivity = [
    latestLesson && { title: `Lektion: ${latestLesson.title}`, date: latestLesson.created_at, icon: 'lessons' as AppIconName },
    latestMessage && { title: `Mitteilung: ${latestMessage.subject}`, date: latestMessage.created_at, icon: 'messages' as AppIconName },
  ].filter((item): item is { title: string; date: string; icon: AppIconName } => Boolean(item)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title={data.ageGroups[0]?.title ? `Unterricht: ${data.ageGroups[0].title}` : "Mein Unterricht"}
      description="Verwalte Unterricht und Lernfortschritt deiner zugewiesenen Altersgruppe."
      action={<ActionButton label="Neue Lektion" icon="add" disabled={data.ageGroups.length === 0} onPress={() => router.push('/lektion-neu')} />}>
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      {!isLoading && profile?.role === 'teacher' && data.ageGroups.length === 0 && (
        <Card tone="sun"><AppText variant="bodyStrong">Noch keiner Altersgruppe zugeordnet</AppText><AppText>Bitte kontaktiere die Administration. Sobald deine Altersgruppe zugewiesen ist, kannst du ihre Inhalte bearbeiten.</AppText></Card>
      )}
      <View style={styles.statsGrid}>
        <StatCard icon="groups" value={String(data.groups.length)} label="Zeitgruppen" tone="mint" />
        <StatCard icon="lessons" value={String(data.lessons.length)} label="Lektionen" tone="sky" />
        <StatCard icon="children" value={String(data.children.length)} label="Kinderprofile" tone="sun" />
        <StatCard icon="check" value={String(data.submissions.length)} label="Abgaben" tone="coral" />
      </View>

      <SectionHeader title="Schnellzugriff" description="Alle verbundenen Arbeitsbereiche" />
      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <Pressable key={item.href} onPress={() => router.push(item.href as Href)} style={({ pressed }) => [styles.quickPressable, pressed && styles.pressed]}>
            <Card style={styles.quickCard}>
              <View style={styles.quickIcon}><AppIcon name={item.icon} size={23} color={Palette.forest} /></View>
              <View style={styles.quickCopy}><AppText variant="bodyStrong">{item.label}</AppText><AppText variant="small" color={Palette.inkSoft}>{item.description}</AppText></View>
              <AppIcon name="arrow" size={18} color={Palette.muted} />
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={[styles.lowerGrid, stacked && styles.column]}>
        <Card style={[styles.setupCard, stacked && styles.fullWidth]}>
          <SectionHeader title="Einrichtung" description={`${setup.filter((item) => item.done).length} von ${setup.length} erledigt`} />
          <View style={styles.setupList}>
            {setup.map((item, index) => (
              <Pressable key={item.label} onPress={() => router.push(item.href as Href)} style={({ pressed }) => [styles.setupRow, pressed && styles.pressed]}>
                <View style={[styles.setupNumber, item.done && styles.setupDone]}>{item.done ? <AppIcon name="check" size={18} color={Palette.white} /> : <AppText variant="small" color={Palette.forest}>{index + 1}</AppText>}</View>
                <AppText variant="bodyStrong" style={styles.setupLabel}>{item.label}</AppText>
                <Pill tone={item.done ? 'mint' : 'neutral'}>{item.done ? 'Erledigt' : 'Offen'}</Pill>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={[styles.activityCard, stacked && styles.fullWidth]}>
          <SectionHeader title="Letzte Aktivität" />
          {isLoading && latestActivity.length === 0 ? (
            <DataLoading />
          ) : latestActivity.length === 0 ? (
            <EmptyState compact icon="clock" title="Noch keine Aktivität" description="Änderungen und Veröffentlichungen erscheinen hier." />
          ) : (
            <View style={styles.activityList}>
              {latestActivity.map((activity) => (
                <View key={activity.title} style={styles.activityRow}>
                  <View style={styles.activityIcon}><AppIcon name={activity.icon} size={18} color={Palette.forest} /></View>
                  <View style={styles.quickCopy}><AppText variant="bodyStrong">{activity.title}</AppText><AppText variant="small" color={Palette.muted}>{formatDateTime(activity.date)}</AppText></View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', gap: Space.lg, flexWrap: 'wrap' },
  quickGrid: { flexDirection: 'row', gap: Space.md, flexWrap: 'wrap' },
  quickPressable: { flex: 1, minWidth: 220 },
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.lg, minHeight: 94 },
  quickIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  quickCopy: { flex: 1 },
  lowerGrid: { flexDirection: 'row', gap: Space.lg },
  column: { flexDirection: 'column' },
  fullWidth: { width: '100%', minWidth: 0, maxWidth: '100%', flexBasis: 'auto' },
  setupCard: { flex: 1.25, minWidth: 0 },
  activityCard: { flex: 0.8, minWidth: 270 },
  setupList: { marginTop: Space.xl, gap: Space.sm },
  setupRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.line, paddingVertical: Space.sm },
  setupNumber: { width: 32, height: 32, borderRadius: 11, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  setupDone: { backgroundColor: Palette.forest },
  setupLabel: { flex: 1 },
  activityList: { gap: Space.md, marginTop: Space.lg },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  activityIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.skySoft, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
