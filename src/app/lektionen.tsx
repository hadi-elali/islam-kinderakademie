import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { ChoiceChips, DataLoading, ErrorBanner, IconAction, RowActions } from '@/components/ui/data-ui';
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  Field,
  PageScaffold,
  Pill,
} from '@/components/ui/primitives';
import { Layout, Palette, Radius, Space } from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { deleteRecord, setLessonRelease, setQuizRelease } from '@/lib/academy-api';
import { LearningJourneyRow, LessonRow, LessonStatus } from '@/types/database';
import { confirmAction } from '@/utils/feedback';
import { apiErrorMessage, formatDate } from '@/utils/format';

type LessonFilter = 'all' | LessonStatus;

export default function LessonsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;
  const { profile } = useAuth();
  const { data, isLoading, error, refresh, execute } = useAcademyData();
  const [filter, setFilter] = useState<LessonFilter>('all');
  const [yearFilterId, setYearFilterId] = useState<number | null>(null);
  const [ageGroupFilterId, setAgeGroupFilterId] = useState<number | null>(null);
  const [journeyFilterId, setJourneyFilterId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [expandedJourneyIds, setExpandedJourneyIds] = useState<number[]>([]);
  const [expandedLessonIds, setExpandedLessonIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [releaseAction, setReleaseAction] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  const sortedJourneys = useMemo(
    () =>
      [...data.journeys].sort((a, b) => {
        const aYear = data.academyYears.find((year) => year.id === a.academy_year_id);
        const bYear = data.academyYears.find((year) => year.id === b.academy_year_id);
        const aAgeGroup = data.ageGroups.find((group) => group.id === a.age_group_id);
        const bAgeGroup = data.ageGroups.find((group) => group.id === b.age_group_id);
        return (
          (bYear?.starts_on ?? '').localeCompare(aYear?.starts_on ?? '') ||
          (aAgeGroup?.position ?? 0) - (bAgeGroup?.position ?? 0) ||
          a.position - b.position ||
          a.title.localeCompare(b.title, 'de-DE')
        );
      }),
    [data.academyYears, data.ageGroups, data.journeys]
  );

  const availableJourneys = useMemo(
    () =>
      sortedJourneys.filter(
        (journey) =>
          (!yearFilterId || journey.academy_year_id === yearFilterId) &&
          (!ageGroupFilterId || journey.age_group_id === ageGroupFilterId)
      ),
    [ageGroupFilterId, sortedJourneys, yearFilterId]
  );
  const effectiveJourneyFilterId = availableJourneys.some((journey) => journey.id === journeyFilterId)
    ? journeyFilterId
    : null;

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de-DE');
    return data.lessons.filter((lesson) => {
      const journey = data.journeys.find((entry) => entry.id === lesson.learning_journey_id);
      const matchesFilter = filter === 'all' || lesson.status === filter;
      const matchesYear = !yearFilterId || journey?.academy_year_id === yearFilterId;
      const matchesAgeGroup = !ageGroupFilterId || journey?.age_group_id === ageGroupFilterId;
      const matchesJourney = !effectiveJourneyFilterId || journey?.id === effectiveJourneyFilterId;
      const matchesSearch =
        !query ||
        lesson.title.toLocaleLowerCase('de-DE').includes(query) ||
        lesson.description?.toLocaleLowerCase('de-DE').includes(query) ||
        lesson.intro_text.toLocaleLowerCase('de-DE').includes(query) ||
        journey?.title.toLocaleLowerCase('de-DE').includes(query);
      return matchesFilter && matchesYear && matchesAgeGroup && matchesJourney && matchesSearch;
    });
  }, [ageGroupFilterId, data.journeys, data.lessons, effectiveJourneyFilterId, filter, search, yearFilterId]);

  const lessonGroups = useMemo(
    () =>
      sortedJourneys
        .map((journey) => ({
          journey,
          lessons: filteredLessons
            .filter((lesson) => lesson.learning_journey_id === journey.id)
            .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, 'de-DE')),
        }))
        .filter((group) => group.lessons.length > 0),
    [filteredLessons, sortedJourneys]
  );

  const lessonYearGroups = useMemo(
    () =>
      [...data.academyYears]
        .sort((a, b) => b.starts_on.localeCompare(a.starts_on))
        .map((year) => ({
          year,
          journeyGroups: lessonGroups.filter(
            ({ journey }) => journey.academy_year_id === year.id
          ),
        }))
        .filter(({ journeyGroups }) => journeyGroups.length > 0),
    [data.academyYears, lessonGroups]
  );

  const releasableFilteredLessons = filteredLessons.filter(
    (lesson) => lesson.status === 'published' && !lesson.is_released
  );

  function editLesson(lesson: LessonRow) {
    router.push(`/lektion-neu?lessonId=${lesson.id}` as Href);
  }

  function editQuiz(lesson: LessonRow) {
    router.push(`/quiz-bearbeiten?lessonId=${lesson.id}` as Href);
  }

  function toggleLessonDetails(lessonId: number) {
    setExpandedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId]
    );
  }

  function toggleJourneyLessons(journeyId: number) {
    setExpandedJourneyIds((current) =>
      current.includes(journeyId)
        ? current.filter((id) => id !== journeyId)
        : [...current, journeyId]
    );
  }

  async function removeLesson(lesson: LessonRow) {
    const confirmed = await confirmAction(
      'Lektion löschen?',
      `„${lesson.title}“ sowie Schritte, Termine und Fortschrittsdaten werden gelöscht.`
    );
    if (!confirmed) return;
    try {
      await execute(() => deleteRecord('lessons', lesson.id));
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  async function toggleLessonRelease(lesson: LessonRow) {
    if (lesson.is_released) {
      const confirmed = await confirmAction(
        'Lektion sperren?',
        'Die Lektion und das zugehörige Quiz sind danach für Familien nicht mehr sichtbar.'
      );
      if (!confirmed) return;
    }

    const actionKey = `lesson-${lesson.id}`;
    setReleaseAction(actionKey);
    setActionError(null);
    try {
      await execute(() => setLessonRelease(lesson.id, !lesson.is_released), ['lessons', 'quizzes']);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setReleaseAction(null);
    }
  }

  async function toggleQuizRelease(quizId: number, quizTitle: string, isReleased: boolean) {
    if (isReleased) {
      const confirmed = await confirmAction(
        'Quiz sperren?',
        `„${quizTitle}“ ist danach für Familien nicht mehr sichtbar.`
      );
      if (!confirmed) return;
    }

    const actionKey = `quiz-${quizId}`;
    setReleaseAction(actionKey);
    setActionError(null);
    try {
      await execute(() => setQuizRelease(quizId, !isReleased), ['quizzes']);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setReleaseAction(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setFilter('all');
    setYearFilterId(null);
    setAgeGroupFilterId(null);
    setJourneyFilterId(null);
  }

  async function releaseAll(lessons: LessonRow[], journey: LearningJourneyRow | null = null) {
    const releasableLessons = lessons.filter(
      (lesson) => lesson.status === 'published' && !lesson.is_released
    );
    if (!isAdmin || releasableLessons.length === 0) return;

    const confirmed = await confirmAction(
      'Alle Lektionen freigeben?',
      journey
        ? `${releasableLessons.length} veröffentlichte Lektionen aus „${journey.title}“ werden für Familien sichtbar.`
        : `${releasableLessons.length} veröffentlichte Lektionen aus der aktuellen Filterauswahl werden für Familien sichtbar.`
    );
    if (!confirmed) return;

    const actionKey = journey ? `journey-${journey.id}` : 'all-filtered';
    setReleaseAction(actionKey);
    setActionError(null);
    try {
      await execute(() =>
        Promise.all(releasableLessons.map((lesson) => setLessonRelease(lesson.id, true))), ['lessons', 'quizzes']
      );
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setReleaseAction(null);
    }
  }

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title="Lektionen"
      description="Nach Lernreisen sortieren, gezielt filtern und für Familien freigeben."
      action={
        <View style={styles.headerActions}>
          {isAdmin && (
            <ActionButton
              label={
                releaseAction === 'all-filtered'
                  ? 'Freigabe läuft …'
                  : `Alle gefilterten freigeben (${releasableFilteredLessons.length})`
              }
              icon="check"
              variant="secondary"
              disabled={releaseAction !== null || releasableFilteredLessons.length === 0}
              onPress={() => void releaseAll(filteredLessons)}
            />
          )}
          <ActionButton label="Neue Lektion" icon="add" onPress={() => router.push('/lektion-neu')} />
        </View>
      }>
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      {actionError && <ErrorBanner message={actionError} />}
      <Card style={styles.toolbar}>
        <View style={styles.filterGrid}>
          <View style={[styles.searchField, compact && styles.filterCompact]}>
            <Field label="Suche" placeholder="Lektionen durchsuchen" value={search} onChangeText={setSearch} />
          </View>
          <View style={[styles.filterBlock, compact && styles.filterCompact]}>
            <ChoiceChips
              label="Status"
              value={filter}
              onChange={(value) => value && setFilter(value)}
              options={[
                { value: 'all', label: 'Alle' },
                { value: 'draft', label: 'Entwurf' },
                { value: 'scheduled', label: 'Geplant' },
                { value: 'published', label: 'Veröffentlicht' },
                { value: 'archived', label: 'Archiviert' },
              ]}
            />
          </View>
          <View style={[styles.filterBlock, compact && styles.filterCompact]}>
            <ChoiceChips
              label="Akademiejahr"
              value={yearFilterId}
              allowEmpty
              emptyLabel="Alle"
              onChange={setYearFilterId}
              options={data.academyYears.map((year) => ({ value: year.id, label: year.title }))}
            />
          </View>
          <View style={[styles.filterBlock, compact && styles.filterCompact]}>
            <ChoiceChips
              label="Altersgruppe"
              value={ageGroupFilterId}
              allowEmpty
              emptyLabel="Alle"
              onChange={setAgeGroupFilterId}
              options={data.ageGroups.map((group) => ({ value: group.id, label: group.title }))}
            />
          </View>
          <View style={styles.filterWide}>
            <ChoiceChips
              label="Lernreise"
              value={effectiveJourneyFilterId}
              allowEmpty
              emptyLabel="Alle"
              onChange={setJourneyFilterId}
              options={availableJourneys.map((journey) => ({ value: journey.id, label: journey.title }))}
            />
          </View>
        </View>
        <View style={styles.resultRow}>
          <Pill>{filteredLessons.length} Lektionen in {lessonGroups.length} Lernreisen</Pill>
          {isAdmin && <Pill tone="mint">{releasableFilteredLessons.length} freigabebereit</Pill>}
          <ActionButton
            label="Filter zurücksetzen"
            icon="close"
            compact
            variant="quiet"
            disabled={
              !search &&
              filter === 'all' &&
              !yearFilterId &&
              !ageGroupFilterId &&
              !effectiveJourneyFilterId
            }
            onPress={clearFilters}
          />
        </View>
      </Card>

      {isLoading && data.lessons.length === 0 ? (
        <Card style={styles.listCard}><DataLoading /></Card>
      ) : filteredLessons.length === 0 ? (
        <Card style={styles.listCard}>
          <EmptyState
            icon="lessons"
            title={data.lessons.length === 0 ? 'Noch keine Lektionen' : 'Keine Treffer'}
            description={
              data.lessons.length === 0
                ? 'Lege zuerst ein Akademiejahr und eine Lernreise an, anschließend kann die erste Lektion entstehen.'
                : 'Passe Suche oder Filter an.'
            }
            actionLabel={data.lessons.length === 0 ? 'Erste Lektion anlegen' : undefined}
            onAction={data.lessons.length === 0 ? () => router.push('/lektion-neu') : undefined}
          />
        </Card>
      ) : (
        <View style={styles.yearGroupList}>
          {lessonYearGroups.map(({ year, journeyGroups }) => (
            <View key={year.id} style={styles.yearSection}>
              <Card tone="dark" style={styles.yearHeader}>
                <View style={styles.yearIcon}>
                  <AppIcon name="calendar" size={22} color={Palette.forest} />
                </View>
                <View style={[styles.yearCopy, compact && styles.copyCompact]}>
                  <AppText variant="heading" color={Palette.white}>{year.title}</AppText>
                  <AppText variant="small" color={Palette.mintStrong}>
                    {journeyGroups.length} Lernreisen · {journeyGroups.reduce((sum, group) => sum + group.lessons.length, 0)} Lektionen
                  </AppText>
                </View>
                <Pill tone={year.is_active ? 'mint' : 'neutral'}>{year.is_active ? 'Aktiv' : 'Inaktiv'}</Pill>
              </Card>
              <View style={styles.groupList}>
                {journeyGroups.map(({ journey, lessons }) => {
                  const isJourneyExpanded = expandedJourneyIds.includes(journey.id);
                  const ageGroup = data.ageGroups.find((entry) => entry.id === journey.age_group_id);
                  const releasableCount = lessons.filter(
                    (lesson) => lesson.status === 'published' && !lesson.is_released
                  ).length;
                  return (
                    <Card key={journey.id} style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <View style={styles.journeyIcon}>
                    <AppIcon name="journeys" size={22} color={Palette.forest} />
                  </View>
                  <View style={[styles.journeyCopy, compact && styles.copyCompact]}>
                    <View style={styles.titleLine}>
                      <AppText variant="heading">{journey.title}</AppText>
                      <Pill tone={journey.is_published ? 'mint' : 'sun'}>
                        {journey.is_published ? 'Lernreise veröffentlicht' : 'Lernreise Entwurf'}
                      </Pill>
                    </View>
                    <AppText variant="small" color={Palette.inkSoft}>
                      Zugeordnet zu {year.title} · {ageGroup?.title ?? 'Ohne Altersgruppe'} · {lessons.length} Lektionen
                    </AppText>
                  </View>
                  <View style={styles.journeyActions}>
                    {isAdmin && (
                      <ActionButton
                        label={
                          releaseAction === `journey-${journey.id}`
                            ? 'Freigabe läuft …'
                            : `Alle freigeben (${releasableCount})`
                        }
                        icon="check"
                        compact
                        variant="secondary"
                        disabled={releaseAction !== null || releasableCount === 0}
                        onPress={() => void releaseAll(lessons, journey)}
                      />
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${lessons.length} Lektionen ${isJourneyExpanded ? 'einklappen' : 'ausklappen'}`}
                      accessibilityState={{ expanded: isJourneyExpanded }}
                      onPress={() => toggleJourneyLessons(journey.id)}
                      style={({ pressed }) => [
                        styles.journeyToggle,
                        pressed && styles.lessonTogglePressed,
                      ]}>
                      <AppIcon
                        name="chevron"
                        size={21}
                        color={Palette.forest}
                        style={isJourneyExpanded ? styles.chevronExpanded : undefined}
                      />
                    </Pressable>
                  </View>
                </View>

                {isJourneyExpanded && <View style={styles.lessonList}>
                  {lessons.map((lesson) => {
                    const isExpanded = expandedLessonIds.includes(lesson.id);
                    const session = data.liveSessions.find((entry) => entry.lesson_id === lesson.id);
                    const quiz = data.quizzes.find((entry) => entry.lesson_id === lesson.id);
                    const questionCount = quiz
                      ? data.quizQuestions.filter((question) => question.quiz_id === quiz.id).length
                      : 0;
                    return (
                      <View key={lesson.id} style={styles.lessonRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${lesson.title} ${isExpanded ? 'einklappen' : 'ausklappen'}`}
                          accessibilityState={{ expanded: isExpanded }}
                          onPress={() => toggleLessonDetails(lesson.id)}
                          style={({ pressed }) => [
                            styles.lessonToggle,
                            pressed && styles.lessonTogglePressed,
                          ]}>
                          <View style={styles.lessonIcon}>
                            <AppIcon name={lesson.status === 'published' ? 'check' : 'lessons'} size={22} color={Palette.forest} />
                          </View>
                          <View style={styles.lessonSummary}>
                            <View style={styles.titleLine}>
                              <AppText variant="bodyStrong">{lesson.title}</AppText>
                              <Pill tone={lesson.status === 'published' ? 'mint' : lesson.status === 'scheduled' ? 'sky' : 'sun'}>
                                {lesson.status === 'published'
                                  ? 'Veröffentlicht'
                                  : lesson.status === 'scheduled'
                                    ? 'Geplant'
                                    : lesson.status === 'archived'
                                      ? 'Archiviert'
                                      : 'Entwurf'}
                              </Pill>
                              <Pill tone={lesson.is_released ? 'mint' : 'neutral'}>
                                {lesson.is_released ? 'Freigegeben' : 'Gesperrt'}
                              </Pill>
                              {quiz && (
                                <Pill tone={quiz.is_published ? 'mint' : 'sun'}>
                                  {quiz.is_published ? 'Quiz frei' : 'Quiz gesperrt'}
                                </Pill>
                              )}
                            </View>
                            <AppText variant="small" color={Palette.inkSoft}>
                              Lektion {lesson.position + 1}
                              {session ? ` · Live am ${formatDate(session.starts_at)}` : ' · Live-Termin offen'}
                              {quiz ? ` · ${questionCount} Quizfragen` : ' · Quiz offen'}
                            </AppText>
                          </View>
                          <View style={styles.chevronButton}>
                            <AppIcon
                              name="chevron"
                              size={21}
                              color={Palette.forest}
                              style={isExpanded ? styles.chevronExpanded : undefined}
                            />
                          </View>
                        </Pressable>

                        {isExpanded && (
                          <View style={[styles.lessonDetails, compact && styles.lessonDetailsCompact]}>
                            {lesson.description && (
                              <AppText color={Palette.inkSoft}>{lesson.description}</AppText>
                            )}
                            {isAdmin && (
                              <View style={styles.releaseActions}>
                                <ActionButton
                                  label={
                                    releaseAction === `lesson-${lesson.id}`
                                      ? 'Wird geändert …'
                                      : lesson.is_released
                                        ? 'Lektion sperren'
                                        : 'Lektion freigeben'
                                  }
                                  icon={lesson.is_released ? 'close' : 'check'}
                                  compact
                                  variant="secondary"
                                  disabled={
                                    releaseAction !== null ||
                                    (!lesson.is_released && lesson.status !== 'published')
                                  }
                                  onPress={() => void toggleLessonRelease(lesson)}
                                />
                                {quiz && (
                                  <ActionButton
                                    label={
                                      releaseAction === `quiz-${quiz.id}`
                                        ? 'Wird geändert …'
                                        : quiz.is_published
                                          ? 'Quiz sperren'
                                          : 'Quiz freigeben'
                                    }
                                    icon={quiz.is_published ? 'close' : 'check'}
                                    compact
                                    variant="secondary"
                                    disabled={
                                      releaseAction !== null ||
                                      (!quiz.is_published && !lesson.is_released)
                                    }
                                    onPress={() => void toggleQuizRelease(quiz.id, quiz.title, quiz.is_published)}
                                  />
                                )}
                                {!lesson.is_released && lesson.status !== 'published' && (
                                  <AppText variant="small" color={Palette.muted}>
                                    Vor der Freigabe muss der Status „Veröffentlicht“ sein.
                                  </AppText>
                                )}
                                {quiz && !quiz.is_published && !lesson.is_released && (
                                  <AppText variant="small" color={Palette.muted}>
                                    Gib zuerst die veröffentlichte Lektion frei.
                                  </AppText>
                                )}
                              </View>
                            )}
                            <View style={styles.lessonEditActions}>
                              <AppText variant="small" color={Palette.muted}>
                                Lektion und Quiz verwalten
                              </AppText>
                              <RowActions
                                extra={<IconAction icon="check" label="Quiz bearbeiten" onPress={() => editQuiz(lesson)} />}
                                onEdit={() => editLesson(lesson)}
                                onDelete={() => void removeLesson(lesson)}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>}
                    </Card>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  toolbar: { padding: Space.lg, gap: Space.lg },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Space.lg },
  searchField: { flex: 1, minWidth: 240 },
  filterBlock: { flex: 1, minWidth: 260 },
  filterCompact: { width: '100%', minWidth: 0, maxWidth: '100%', flexBasis: '100%' },
  filterWide: { width: '100%' },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  listCard: { minHeight: 480 },
  yearGroupList: { gap: Space.xxl },
  yearSection: { gap: Space.lg },
  yearHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md, padding: Space.lg },
  yearIcon: { width: 46, height: 46, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.mint },
  yearCopy: { flex: 1, minWidth: 220, gap: 3 },
  groupList: { gap: Space.xl },
  journeyCard: { gap: Space.lg },
  journeyHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md },
  journeyIcon: { width: 48, height: 48, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.skySoft },
  journeyCopy: { flex: 1, minWidth: 240, gap: 4 },
  copyCompact: { minWidth: 0 },
  journeyActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  journeyToggle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.mintStrong,
    borderRadius: Radius.medium,
    backgroundColor: Palette.mint,
  },
  lessonList: { gap: Space.sm },
  lessonRow: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  lessonToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderRadius: Radius.medium,
  },
  lessonTogglePressed: { backgroundColor: Palette.cream },
  lessonIcon: { width: 46, height: 46, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.mint },
  lessonSummary: { flex: 1, minWidth: 0, gap: 4 },
  chevronButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Palette.mint,
  },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  lessonDetails: {
    gap: Space.md,
    marginLeft: 46 + Space.md,
    paddingBottom: Space.lg,
    paddingRight: Space.sm,
  },
  lessonDetailsCompact: { marginLeft: 0, paddingHorizontal: Space.sm },
  lessonEditActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
  },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  releaseActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm, marginTop: Space.sm },
});
