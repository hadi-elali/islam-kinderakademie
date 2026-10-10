import { TeachingContacts } from '@/components/teaching-contacts';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DataLoading, ErrorBanner } from '@/components/ui/data-ui';
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  PageScaffold,
  Pill,
  ProgressBar,
  SectionHeader,
  StatCard,
} from '@/components/ui/primitives';
import { Layout, Palette, Radius, Space } from '@/constants/design';
import { useAcademy } from '@/context/academy-context';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { formatDateTime } from '@/utils/format';
import { findActiveTimeGroupForChild } from '@/utils/time-group-access';

export function ParentDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [openedAt] = useState(() => Date.now());
  const stacked = width < Layout.contentStackBreakpoint;
  const { enterChildArea } = useAcademy();
  const { profile } = useAuth();
  const { data, isLoading, error, refresh } = useAcademyData();
  const ownChildren = data.children.filter(
    (child) => child.parent_profile_id === profile?.id
  );
  const ownChildIds = new Set(ownChildren.map((child) => child.id));
  const approvedTimeGroups = ownChildren
    .map((child) => findActiveTimeGroupForChild(data, child.id, 'approved'))
    .filter((group): group is NonNullable<typeof group> => Boolean(group));
  const approvedGroupIds = new Set(approvedTimeGroups.map((group) => group.id));
  const approvedAgeYearKeys = new Set(
    approvedTimeGroups.map(
      (group) => `${group.age_group_id}:${group.academy_year_id}`
    )
  );
  const accessibleJourneyIds = new Set(
    data.journeys
      .filter(
        (journey) =>
          journey.is_published &&
          approvedAgeYearKeys.has(
            `${journey.age_group_id}:${journey.academy_year_id}`
          )
      )
      .map((journey) => journey.id)
  );
  const accessibleLessonIds = new Set(
    data.lessons
      .filter(
        (lesson) =>
          lesson.status === 'published' &&
          accessibleJourneyIds.has(lesson.learning_journey_id)
      )
      .map((lesson) => lesson.id)
  );
  const upcomingSessions = data.liveSessions
    .filter(
      (session) =>
        new Date(session.ends_at).getTime() >= openedAt &&
        session.status !== 'cancelled' &&
        accessibleLessonIds.has(session.lesson_id) &&
        (session.group_id === null || approvedGroupIds.has(session.group_id))
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const nextSession = upcomingSessions[0];
  const openQuizzes = ownChildren.reduce((count, child) => {
    const approvedTimeGroup = findActiveTimeGroupForChild(
      data,
      child.id,
      'approved'
    );

    if (!approvedTimeGroup) return count;

    const journeyIds = data.journeys
      .filter(
        (journey) =>
          journey.age_group_id === child.age_group_id &&
          journey.academy_year_id === approvedTimeGroup.academy_year_id &&
          journey.is_published
      )
      .map((journey) => journey.id);
    const lessonIds = data.lessons
      .filter((lesson) => journeyIds.includes(lesson.learning_journey_id) && lesson.status === 'published')
      .map((lesson) => lesson.id);
    const childQuizzes = data.quizzes.filter(
      (quiz) => quiz.is_published && lessonIds.includes(quiz.lesson_id)
    );
    return count + childQuizzes.filter(
      (quiz) => !data.quizAttempts.some(
        (attempt) => attempt.child_id === child.id && attempt.quiz_id === quiz.id && attempt.passed
      )
    ).length;
  }, 0);
  const recentAttempts = data.quizAttempts
    .filter((attempt) => ownChildIds.has(attempt.child_id))
    .slice(0, 5);

  function openChild(childId: number) {
    enterChildArea(childId);
    router.push('/dashboard');
  }

  return (
    <PageScaffold
      eyebrow="Elternbereich"
      title="Lernwege gemeinsam begleiten"
      description="Termine, Aufgaben und der persönliche Fortschritt deiner Kinder."
      action={<ActionButton label="Kind hinzufügen" icon="add" onPress={() => router.push('/kinder')} />}>
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      <TeachingContacts ageGroupIds={[...new Set(ownChildren.map((child) => child.age_group_id))]} />
      <View style={styles.statsGrid}>
        <StatCard icon="children" value={String(ownChildren.length)} label="Kinderprofile" tone="mint" />
        <StatCard icon="calendar" value={String(upcomingSessions.length)} label="Anstehende Termine" tone="sky" />
        <StatCard icon="check" value={String(openQuizzes)} label="Offene Quizze" tone="sun" />
      </View>

      <View style={[styles.mainGrid, stacked && styles.column]}>
        <Card style={[styles.childrenCard, stacked && styles.fullWidth]}>
          <SectionHeader title="Meine Kinder" description="Profile und Lernstände" action={<ActionButton label="Alle ansehen" variant="quiet" compact onPress={() => router.push('/kinder')} />} />
          {isLoading && ownChildren.length === 0 ? (
            <DataLoading />
          ) : ownChildren.length === 0 ? (
            <EmptyState compact icon="children" title="Noch kein Kinderprofil" description="Lege ein Profil an, um Lernweg und Fortschritt zu begleiten." actionLabel="Profil anlegen" onAction={() => router.push('/kinder')} />
          ) : (
            <View style={styles.childList}>
              {ownChildren.slice(0, 4).map((child) => {
                const rows = data.lessonProgress.filter((progress) => progress.child_id === child.id);
                const percent = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress_percent, 0) / rows.length) : 0;
                const membership = data.groupMembers
                  .filter(
                    (entry) =>
                      entry.child_id === child.id &&
                      (entry.membership_status === 'approved' ||
                        entry.membership_status === 'pending')
                  )
                  .sort((a, b) => b.requested_at.localeCompare(a.requested_at))[0];
                const timeGroup = data.groups.find(
                  (group) => group.id === membership?.group_id
                );
                return (
                  <View key={child.id} style={styles.childRow}>
                    <View style={styles.childAvatar}><AppText variant="bodyStrong">{child.display_name.charAt(0).toUpperCase()}</AppText></View>
                    <View style={styles.childCopy}>
                      <View style={styles.titleLine}>
                        <AppText variant="bodyStrong">{child.display_name}</AppText>
                        <Pill>
                          {data.ageGroups.find((group) => group.id === child.age_group_id)?.title ?? 'Ohne Altersgruppe'}
                        </Pill>
                        {membership && timeGroup && (
                          <Pill tone={membership.membership_status === 'approved' ? 'mint' : 'sun'}>
                            {timeGroup.name} · {membership.membership_status === 'approved' ? 'freigeschaltet' : 'angefragt'}
                          </Pill>
                        )}
                      </View>
                      <ProgressBar value={percent} />
                      <AppText variant="small" color={Palette.muted}>{percent}% Fortschritt</AppText>
                    </View>
                    <ActionButton label="Öffnen" icon="arrow" compact variant="secondary" onPress={() => openChild(child.id)} />
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Card tone="dark" style={[styles.nextCard, stacked && styles.fullWidth]}>
          <View style={styles.nextTop}>
            <View style={styles.darkIcon}><AppIcon name="calendar" size={23} color={Palette.sun} /></View>
            <Pill tone="sun">Nächster Termin</Pill>
          </View>
          <View style={styles.nextCopy}>
            <AppText variant="heading" color={Palette.white}>{nextSession?.title || (nextSession ? data.lessons.find((lesson) => lesson.id === nextSession.lesson_id)?.title : 'Noch kein Unterricht geplant')}</AppText>
            <AppText color="#CDE0D7">{nextSession ? formatDateTime(nextSession.starts_at) : 'Sobald eine Zeitgruppe einen Termin erhält, stehen hier Zeit und Zugang bereit.'}</AppText>
          </View>
          {nextSession?.meeting_url ? (
            <ActionButton label="Zoom öffnen" icon="external" variant="secondary" onPress={() => void Linking.openURL(nextSession.meeting_url!)} />
          ) : (
            <ActionButton label="Kalender öffnen" variant="secondary" onPress={() => router.push('/kalender')} />
          )}
        </Card>
      </View>

      <Card>
        <SectionHeader title="Aktuelle Quiz-Ergebnisse" description="Die letzten abgeschlossenen Lernkontrollen" />
        {recentAttempts.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <View style={styles.inlineIcon}><AppIcon name="check" size={24} color={Palette.forest} /></View>
            <View style={styles.inlineCopy}><AppText variant="bodyStrong">Noch keine Ergebnisse</AppText><AppText color={Palette.inkSoft}>Abgeschlossene Multiple-Choice-Quizze erscheinen hier.</AppText></View>
          </View>
        ) : (
          <View style={styles.challengeList}>
            {recentAttempts.map((attempt) => {
              const child = ownChildren.find((entry) => entry.id === attempt.child_id);
              const quiz = data.quizzes.find((entry) => entry.id === attempt.quiz_id);
              return (
                <View key={attempt.id} style={styles.challengeRow}>
                  <AppIcon name={attempt.passed ? 'trophy' : 'refresh'} size={20} color={attempt.passed ? '#934E39' : Palette.forest} />
                  <View style={styles.inlineCopy}>
                    <AppText variant="bodyStrong">{child?.display_name ?? 'Kinderprofil'} · {attempt.score_percent} %</AppText>
                    <AppText variant="small" color={Palette.muted}>{quiz?.title ?? 'Multiple-Choice-Quiz'}</AppText>
                  </View>
                  <Pill tone={attempt.passed ? 'mint' : 'sun'}>{attempt.passed ? 'Bestanden' : 'Weiter üben'}</Pill>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', gap: Space.lg, flexWrap: 'wrap' },
  mainGrid: { flexDirection: 'row', gap: Space.lg, alignItems: 'stretch' },
  column: { flexDirection: 'column' },
  fullWidth: { width: '100%', minWidth: 0, maxWidth: '100%', flexBasis: 'auto' },
  childrenCard: { flex: 1.6, minWidth: 0 },
  nextCard: { flex: 0.8, minWidth: 280, minHeight: 330, justifyContent: 'space-between' },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  darkIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  nextCopy: { gap: Space.sm, paddingVertical: Space.xl },
  childList: { gap: Space.sm, marginTop: Space.lg },
  childRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.line, paddingVertical: Space.md },
  childAvatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: Palette.sun, alignItems: 'center', justifyContent: 'center' },
  childCopy: { flex: 1, minWidth: 190, gap: 5 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  inlineEmpty: { marginTop: Space.xl, minHeight: 112, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.line, borderRadius: 18, backgroundColor: '#F9FAF7', padding: Space.lg, flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  inlineIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  inlineCopy: { flex: 1, gap: 3 },
  challengeList: { gap: Space.sm, marginTop: Space.lg },
  challengeRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, padding: Space.md },
});
