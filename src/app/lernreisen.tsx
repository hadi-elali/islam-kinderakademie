import { TeachingContacts } from '@/components/teaching-contacts';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DataLoading, ErrorBanner } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, PageScaffold, Pill, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Palette, Radius, Space } from '@/constants/design';
import { useAcademy } from '@/context/academy-context';
import { useAcademyData } from '@/context/academy-data-context';
import { findActiveTimeGroupForChild } from '@/utils/time-group-access';

export default function LearningJourneysScreen() {
  const router = useRouter();
  const { selectedChildId } = useAcademy();
  const { data, isLoading, error, refresh } = useAcademyData();
  const child = data.children.find((entry) => entry.id === selectedChildId);

  if (isLoading && !child) return <DataLoading label="Lernreisen werden geladen …" />;

  if (!child) {
    return (
      <PageScaffold eyebrow="Mein Lernweg" title="Lernreisen">
        <Card><EmptyState icon="children" title="Kein Kinderprofil ausgewählt" description="Öffne den Kinderbereich über „Meine Kinder“." actionLabel="Kinder auswählen" onAction={() => router.replace('/kinder')} /></Card>
      </PageScaffold>
    );
  }

  const activeYears = data.academyYears.filter((year) => year.is_active);
  const yearIds = activeYears.map((year) => year.id);
  const approvedTimeGroup = findActiveTimeGroupForChild(data, child.id, 'approved');
  const pendingTimeGroup = findActiveTimeGroupForChild(data, child.id, 'pending');
  const contentUnlocked = Boolean(approvedTimeGroup);
  const journeys = data.journeys
    .filter((journey) => journey.is_published && journey.age_group_id === child.age_group_id && yearIds.includes(journey.academy_year_id))
    .sort((a, b) => a.position - b.position);
  const journeyIds = journeys.map((journey) => journey.id);
  const allLessons = contentUnlocked
    ? data.lessons.filter(
        (lesson) => journeyIds.includes(lesson.learning_journey_id) && lesson.status === 'published'
      )
    : [];
  const progressRows = data.lessonProgress.filter((row) => row.child_id === child.id);
  const completed = allLessons.filter(
    (lesson) => progressRows.find((row) => row.lesson_id === lesson.id)?.status === 'completed'
  ).length;
  const overall = allLessons.length ? Math.round((completed / allLessons.length) * 100) : 0;

  return (
    <PageScaffold
      eyebrow={`Lernweg von ${child.display_name}`}
      title="Lernreisen"
      description="Die Lernreisen deiner Altersgruppe sind sichtbar. Ihre Inhalte öffnen sich nach der Zeitgruppenfreigabe.">
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      <TeachingContacts ageGroupIds={[child.age_group_id]} />
      {!contentUnlocked && (
        <Card tone="sun" style={styles.accessCard}>
          <View style={styles.accessIcon}>
            <AppIcon name="lock" size={23} color={Palette.forest} />
          </View>
          <View style={styles.accessCopy}>
            <AppText variant="heading">Inhalte noch gesperrt</AppText>
            <AppText color={Palette.inkSoft}>
              {pendingTimeGroup
                ? `${pendingTimeGroup.name} · ${pendingTimeGroup.schedule_label} wurde angefragt. Ein Admin muss die Zeitgruppe noch freischalten.`
                : 'Für dieses Kind muss zuerst eine Zeitgruppe angefragt und durch einen Admin freigeschaltet werden.'}
            </AppText>
          </View>
          <ActionButton
            label="Status aktualisieren"
            icon="refresh"
            compact
            variant="secondary"
            onPress={() => void refresh()}
          />
        </Card>
      )}
      <Card tone="dark" style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewCopy}>
            <Pill tone="sun">{activeYears[0]?.title ?? 'Akademiejahr'}</Pill>
            <AppText variant="title" color={Palette.white}>
              {journeys.length ? `${journeys.length} Lernreisen warten auf dich` : 'Noch keine Lernreise veröffentlicht'}
            </AppText>
          </View>
          <View style={styles.overviewIcon}><AppIcon name="journeys" size={28} color={Palette.sun} /></View>
        </View>
        <ProgressBar value={overall} color={Palette.sun} trackColor="rgba(255,255,255,0.13)" />
        <View style={styles.overviewMeta}>
          <AppText variant="small" color="#CDE0D7">
            {contentUnlocked
              ? `${completed} von ${allLessons.length} Lektionen abgeschlossen`
              : 'Lektionsinhalte warten auf die Admin-Freigabe'}
          </AppText>
          <AppText variant="small" color="#CDE0D7">{contentUnlocked ? `${overall} %` : 'Gesperrt'}</AppText>
        </View>
      </Card>

      <SectionHeader title="Deine Reise" description="Arbeite dich in deinem eigenen Tempo durch die Lektionen." />
      {journeys.length === 0 ? (
        <Card><EmptyState icon="journeys" title="Noch keine Lernreise" description="Veröffentlichte Lernreisen erscheinen automatisch hier." /></Card>
      ) : (
        <View style={styles.journeyList}>
          {journeys.map((journey, index) => {
            const lessons = allLessons
              .filter((lesson) => lesson.learning_journey_id === journey.id)
              .sort((a, b) => a.position - b.position);
            const journeyCompleted = lessons.filter(
              (lesson) => progressRows.find((row) => row.lesson_id === lesson.id)?.status === 'completed'
            ).length;
            const percent = lessons.length ? Math.round((journeyCompleted / lessons.length) * 100) : 0;
            return (
              <Card key={journey.id} style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <View style={styles.journeyNumber}><AppText variant="heading" color={Palette.forest}>{index + 1}</AppText></View>
                  <View style={styles.journeyCopy}>
                    <View style={styles.titleLine}>
                      <AppText variant="heading">{journey.title}</AppText>
                      <Pill tone={!contentUnlocked ? 'sun' : percent === 100 ? 'mint' : 'neutral'}>
                        {contentUnlocked ? `${journeyCompleted}/${lessons.length} geschafft` : 'Inhalte gesperrt'}
                      </Pill>
                    </View>
                    {journey.description && <AppText color={Palette.inkSoft}>{journey.description}</AppText>}
                    {contentUnlocked && <ProgressBar value={percent} />}
                  </View>
                </View>
                {!contentUnlocked ? (
                  <View style={styles.lockedLessons}>
                    <AppIcon name="lock" size={19} color={Palette.forest} />
                    <AppText color={Palette.inkSoft}>
                      Die Lektionen dieser Lernreise werden nach der Freigabe sichtbar.
                    </AppText>
                  </View>
                ) : lessons.length === 0 ? (
                  <AppText color={Palette.muted}>Noch keine Lektion veröffentlicht.</AppText>
                ) : (
                  <View style={styles.lessonList}>
                    {lessons.map((lesson) => {
                      const progress = progressRows.find((row) => row.lesson_id === lesson.id);
                      return (
                        <Pressable
                          key={lesson.id}
                          accessibilityRole="button"
                          onPress={() => router.push(`/lektion/${lesson.id}`)}
                          style={({ pressed }) => [styles.lessonRow, pressed && styles.pressed]}>
                          <View style={[styles.lessonStatus, progress?.status === 'completed' && styles.lessonStatusDone]}>
                            <AppIcon name={progress?.status === 'completed' ? 'check' : 'play'} size={17} color={progress?.status === 'completed' ? Palette.white : Palette.forest} />
                          </View>
                          <View style={styles.lessonCopy}>
                            <AppText variant="bodyStrong">{lesson.title}</AppText>
                            <AppText variant="small" color={Palette.muted}>
                              {progress?.status === 'completed' ? 'Abgeschlossen' : progress?.progress_percent ? `${progress.progress_percent}% bearbeitet` : 'Noch nicht begonnen'}
                            </AppText>
                          </View>
                          <AppIcon name="arrow" size={18} color={Palette.forest} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  accessCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg },
  accessIcon: { width: 48, height: 48, borderRadius: Radius.medium, backgroundColor: Palette.sunSoft, alignItems: 'center', justifyContent: 'center' },
  accessCopy: { flex: 1, flexBasis: 260, minWidth: 0, gap: Space.xs },
  overviewCard: { minHeight: 220, justifyContent: 'space-between' },
  overviewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Space.lg },
  overviewCopy: { flex: 1, alignItems: 'flex-start', gap: Space.lg },
  overviewIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  overviewMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm },
  journeyList: { gap: Space.lg },
  journeyCard: { gap: Space.xl },
  journeyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.lg },
  journeyNumber: { width: 48, height: 48, borderRadius: 17, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  journeyCopy: { flex: 1, minWidth: 0, gap: Space.sm },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  lessonList: { gap: Space.sm },
  lessonRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, padding: Space.md, backgroundColor: '#FBFCFA' },
  lessonStatus: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.mint },
  lessonStatusDone: { backgroundColor: Palette.forest },
  lessonCopy: { flex: 1, minWidth: 0, gap: 2 },
  lockedLessons: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, padding: Space.md, backgroundColor: Palette.sunSoft },
  pressed: { opacity: 0.75 },
});
