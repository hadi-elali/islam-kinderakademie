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
import { Layout, Palette, Space } from '@/constants/design';
import { useAcademy } from '@/context/academy-context';
import { useAcademyData } from '@/context/academy-data-context';
import { formatDateTime } from '@/utils/format';
import { findActiveTimeGroupForChild } from '@/utils/time-group-access';

export function ChildDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [openedAt] = useState(() => Date.now());
  const compact = width < Layout.compactBreakpoint;
  const stacked = width < Layout.contentStackBreakpoint;
  const { selectedChildId, exitChildArea } = useAcademy();
  const { data, isLoading, error, refresh } = useAcademyData();
  const child = data.children.find((entry) => entry.id === selectedChildId);

  if (isLoading && !child) return <DataLoading label="Kinderbereich wird geladen …" />;

  if (!child) {
    return (
      <PageScaffold eyebrow="Kinderansicht" title="Kein Kinderprofil ausgewählt">
        <Card>
          <EmptyState
            icon="children"
            title="Kinderbereich auswählen"
            description="Öffne zuerst ein Kinderprofil aus dem Elternbereich."
            actionLabel="Zum Elternbereich"
            onAction={() => {
              exitChildArea();
              router.replace('/kinder');
            }}
          />
        </Card>
      </PageScaffold>
    );
  }

  const activeYearIds = data.academyYears.filter((year) => year.is_active).map((year) => year.id);
  const approvedTimeGroup = findActiveTimeGroupForChild(data, child.id, 'approved');
  const pendingTimeGroup = findActiveTimeGroupForChild(data, child.id, 'pending');
  const contentUnlocked = Boolean(approvedTimeGroup);
  const journeys = data.journeys
    .filter(
      (journey) =>
        journey.age_group_id === child.age_group_id &&
        journey.is_published &&
        activeYearIds.includes(journey.academy_year_id)
    )
    .sort((a, b) => a.position - b.position);
  const journeyIds = journeys.map((journey) => journey.id);
  const lessons = contentUnlocked
    ? data.lessons
        .filter((lesson) => journeyIds.includes(lesson.learning_journey_id) && lesson.status === 'published')
        .sort((a, b) => {
          const journeyA = journeys.find((journey) => journey.id === a.learning_journey_id)?.position ?? 0;
          const journeyB = journeys.find((journey) => journey.id === b.learning_journey_id)?.position ?? 0;
          return journeyA - journeyB || a.position - b.position;
        })
    : [];
  const progressRows = data.lessonProgress.filter((row) => row.child_id === child.id);
  const completedLessons = progressRows.filter((row) => row.status === 'completed').length;
  const nextLesson =
    lessons.find(
      (lesson) => progressRows.find((row) => row.lesson_id === lesson.id)?.status !== 'completed'
    ) ?? lessons.at(-1);
  const nextProgress = progressRows.find((row) => row.lesson_id === nextLesson?.id)?.progress_percent ?? 0;
  const nextQuiz = data.quizzes.find(
    (quiz) => quiz.lesson_id === nextLesson?.id && quiz.is_published
  );
  const nextQuizQuestionCount = nextQuiz
    ? data.quizQuestions.filter((question) => question.quiz_id === nextQuiz.id).length
    : 0;
  const latestQuizAttempt = nextQuiz
    ? data.quizAttempts.find(
        (attempt) => attempt.child_id === child.id && attempt.quiz_id === nextQuiz.id
      )
    : null;
  const childGroupIds = approvedTimeGroup ? [approvedTimeGroup.id] : [];
  const nextSession = data.liveSessions
    .filter(
      (session) =>
        session.status !== 'cancelled' &&
        new Date(session.ends_at).getTime() >= openedAt &&
        (session.group_id === null || childGroupIds.includes(session.group_id))
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  return (
    <PageScaffold eyebrow="Mein Bereich" title={`Salam, ${child.display_name}!`}>
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      <TeachingContacts ageGroupIds={[child.age_group_id]} />
      {!contentUnlocked && (
        <Card tone="sun" style={styles.accessCard}>
          <View style={styles.accessIcon}>
            <AppIcon name="lock" size={23} color={Palette.forest} />
          </View>
          <View style={styles.accessCopy}>
            <AppText variant="heading">Freigabe der Zeitgruppe ausstehend</AppText>
            <AppText color={Palette.inkSoft}>
              {pendingTimeGroup
                ? `${pendingTimeGroup.name} · ${pendingTimeGroup.schedule_label} wurde angefragt.`
                : 'Bitte wähle im Elternbereich eine Zeitgruppe aus.'}{' '}
              Die Lernreisen sind schon sichtbar, ihre Lektionen öffnen sich aber erst nach der Admin-Freigabe.
            </AppText>
          </View>
          <ActionButton
            label="Lernreisen ansehen"
            icon="journeys"
            variant="secondary"
            onPress={() => router.push('/lernreisen')}
          />
        </Card>
      )}
      <View style={[styles.heroGrid, stacked && styles.column]}>
        <Card tone="dark" style={[styles.heroCard, stacked && styles.fullWidth, compact && styles.heroCardCompact]}>
          <View style={styles.heroCopy}>
            <Pill tone="sun" icon="journeys">Deine Lernwoche</Pill>
            <View style={styles.heroText}>
              <AppText variant={compact ? 'title' : 'display'} color={Palette.white}>
                {contentUnlocked
                  ? nextLesson?.title ?? 'Deine nächste Entdeckung wartet hier.'
                  : `${journeys.length} Lernreisen warten auf dich`}
              </AppText>
              <AppText color="#CDE0D7" style={styles.heroDescription}>
                {contentUnlocked
                  ? nextLesson?.description ?? 'Sobald eine Lektion veröffentlicht ist, kannst du hier starten.'
                  : 'Du kannst die Lernreisen bereits ansehen. Die Inhalte werden nach der Zeitgruppenfreigabe geöffnet.'}
              </AppText>
            </View>
            <View style={[styles.heroActions, compact && styles.actionsColumn]}>
              <ActionButton
                label={!contentUnlocked ? 'Inhalte gesperrt' : nextProgress > 0 ? 'Weiterlernen' : 'Lektion starten'}
                icon={contentUnlocked && nextLesson ? 'play' : 'lock'}
                disabled={!contentUnlocked || !nextLesson}
                onPress={() => nextLesson && router.push(`/lektion/${nextLesson.id}`)}
                style={styles.heroButton}
              />
              <ActionButton
                label="Lernreisen ansehen"
                icon="arrow"
                variant="secondary"
                onPress={() => router.push('/lernreisen')}
                style={styles.heroButton}
              />
            </View>
          </View>
          {!compact && <JourneyOrnament />}
        </Card>

        <Card style={[styles.weekCard, stacked && styles.fullWidth]}>
          <View style={styles.weekCardHeader}>
            <View style={styles.roundIconMint}>
              <AppIcon name="check" size={23} color={Palette.forest} />
            </View>
            <Pill tone={contentUnlocked ? 'neutral' : 'sun'}>{contentUnlocked ? '3 Phasen' : 'Gesperrt'}</Pill>
          </View>
          <View style={styles.weekCopy}>
            <AppText variant="heading">Mein Wochenweg</AppText>
            <AppText color={Palette.inkSoft}>
              {contentUnlocked
                ? nextLesson
                  ? `${nextProgress}% dieser Lektion geschafft.`
                  : 'Noch keine Lektion veröffentlicht.'
                : 'Die Inhalte öffnen sich nach der Admin-Freigabe.'}
            </AppText>
          </View>
          <ProgressBar value={nextProgress} />
          <View style={styles.stepDots}>
            <View style={styles.stepDot}><AppIcon name="play" size={16} color={Palette.forest} /></View>
            <View style={styles.stepDot}><AppIcon name="video" size={16} color={Palette.forest} /></View>
            <View style={[styles.stepDot, nextProgress === 100 && styles.stepDotDone]}>
              <AppIcon name="check" size={16} color={nextProgress === 100 ? Palette.white : Palette.forest} />
            </View>
          </View>
        </Card>
      </View>

      <SectionHeader title="Diese Woche" description="Alles Wichtige auf einen Blick." />
      <View style={[styles.weekGrid, compact && styles.column]}>
        <Card style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View style={[styles.infoIcon, { backgroundColor: Palette.skySoft }]}>
              <AppIcon name="video" size={23} color="#2E6474" />
            </View>
            <Pill tone="sky">Live-Unterricht</Pill>
          </View>
          <View style={styles.infoCardCopy}>
            <AppText variant="heading">{nextSession?.title ?? 'Noch kein Termin'}</AppText>
            <AppText color={Palette.inkSoft}>
              {nextSession ? formatDateTime(nextSession.starts_at) : 'Der nächste Termin wird hier angezeigt.'}
            </AppText>
          </View>
          <ActionButton
            label={nextSession?.meeting_url ? 'Zoom öffnen' : 'Kalender ansehen'}
            icon={nextSession?.meeting_url ? 'external' : 'calendar'}
            variant="secondary"
            onPress={() =>
              nextSession?.meeting_url
                ? void Linking.openURL(nextSession.meeting_url)
                : router.push('/kalender')
            }
          />
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View style={[styles.infoIcon, { backgroundColor: Palette.mint }]}>
              <AppIcon name="check" size={23} color={Palette.forest} />
            </View>
            <Pill tone="mint">Abschluss-Quiz</Pill>
          </View>
          <View style={styles.infoCardCopy}>
            <AppText variant="heading">{nextQuiz?.title ?? 'Quiz wird vorbereitet'}</AppText>
            <AppText color={Palette.inkSoft}>
              {latestQuizAttempt
                ? `${latestQuizAttempt.score_percent} % erreicht${latestQuizAttempt.passed ? ' – bestanden!' : '. Du kannst es erneut versuchen.'}`
                : nextQuiz
                  ? `${nextQuizQuestionCount} Fragen warten auf dich.`
                  : 'Das Quiz erscheint nach der Veröffentlichung.'}
            </AppText>
          </View>
          <ActionButton
            label={nextQuiz ? 'Zur Lektion und zum Quiz' : 'Zur Lektion'}
            icon={nextLesson ? 'arrow' : 'clock'}
            variant="secondary"
            disabled={!nextLesson}
            onPress={() => nextLesson && router.push(`/lektion/${nextLesson.id}`)}
          />
        </Card>
      </View>

      <SectionHeader title="Mein Fortschritt" description="Nur dein eigener Lernweg zählt." />
      <View style={styles.statsGrid}>
        <StatCard icon="lessons" value={String(completedLessons)} label="Lektionen" tone="mint" />
        <StatCard icon="pass" value={String(data.childBadges.filter((row) => row.child_id === child.id).length)} label="Abzeichen" tone="sun" />
        <StatCard icon="trophy" value={String(data.quizAttempts.filter((row) => row.child_id === child.id).length)} label="Quizversuche" tone="coral" />
      </View>
    </PageScaffold>
  );
}

function JourneyOrnament() {
  return (
    <View style={styles.ornament}>
      <View style={styles.orbitOuter} />
      <View style={styles.orbitInner} />
      <View style={[styles.orbitNode, styles.nodeOne]} />
      <View style={[styles.orbitNode, styles.nodeTwo]} />
      <View style={styles.ornamentCenter}><AppIcon name="journeys" size={37} color={Palette.ink} /></View>
      <AppText color={Palette.sun} style={styles.sparkleOne}>✦</AppText>
      <AppText color={Palette.mintStrong} style={styles.sparkleTwo}>✦</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  accessCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg },
  accessIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: Palette.sunSoft, alignItems: 'center', justifyContent: 'center' },
  accessCopy: { flex: 1, flexBasis: 280, minWidth: 0, gap: Space.xs },
  heroGrid: { width: '100%', minWidth: 0, flexDirection: 'row', gap: Space.lg, alignItems: 'stretch' },
  column: { flexDirection: 'column' },
  fullWidth: { width: '100%', minWidth: 0, maxWidth: '100%', flexBasis: 'auto' },
  heroCard: { minHeight: 330, flex: 1.72, flexDirection: 'row', position: 'relative', padding: Space.xxl },
  heroCardCompact: { minHeight: 0, padding: Space.lg },
  heroCopy: { flex: 1, minWidth: 0, maxWidth: 610, zIndex: 1 },
  heroText: { gap: Space.md, marginTop: Space.xl, marginBottom: Space.xl },
  heroDescription: { maxWidth: 490 },
  heroActions: { flexDirection: 'row', gap: Space.sm, alignItems: 'center' },
  actionsColumn: { alignItems: 'stretch', flexDirection: 'column' },
  heroButton: { minWidth: 178 },
  ornament: { width: 230, height: 230, alignSelf: 'center', marginRight: -22, pointerEvents: 'none' },
  orbitOuter: { position: 'absolute', width: 218, height: 218, borderRadius: 109, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(167,213,190,0.5)' },
  orbitInner: { position: 'absolute', left: 38, top: 38, width: 142, height: 142, borderRadius: 71, borderWidth: 1, borderColor: 'rgba(242,201,109,0.42)' },
  ornamentCenter: { position: 'absolute', left: 75, top: 75, width: 72, height: 72, borderRadius: 25, backgroundColor: Palette.sun, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  orbitNode: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: Palette.coral, borderWidth: 4, borderColor: Palette.forestDark },
  nodeOne: { right: 14, top: 60 },
  nodeTwo: { left: 25, bottom: 35, backgroundColor: Palette.sky },
  sparkleOne: { position: 'absolute', right: 31, bottom: 25, fontSize: 21 },
  sparkleTwo: { position: 'absolute', left: 36, top: 23, fontSize: 15 },
  weekCard: { flex: 0.85, minWidth: 280, minHeight: 330, justifyContent: 'space-between' },
  weekCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundIconMint: { width: 48, height: 48, borderRadius: 17, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  weekCopy: { gap: 6, marginVertical: Space.lg },
  stepDots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Space.lg },
  stepDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Palette.line, backgroundColor: '#F2F4F2', alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: Palette.forest, borderColor: Palette.forest },
  weekGrid: { flexDirection: 'row', gap: Space.lg },
  infoCard: { flex: 1, minWidth: 270, minHeight: 270 },
  infoCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  infoIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  infoCardCopy: { flex: 1, justifyContent: 'center', gap: Space.sm, paddingVertical: Space.xl },
  statsGrid: { flexDirection: 'row', gap: Space.lg, flexWrap: 'wrap' },
});
