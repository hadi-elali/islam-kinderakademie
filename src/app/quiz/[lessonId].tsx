import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DataLoading, ErrorBanner } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, PageScaffold, Pill, ProgressBar } from '@/components/ui/primitives';
import { Palette, Radius, Space } from '@/constants/design';
import { useAcademy } from '@/context/academy-context';
import { useAcademyData } from '@/context/academy-data-context';
import { submitMultipleChoiceQuiz } from '@/lib/academy-api';
import { QuizSubmissionResult } from '@/types/database';
import { apiErrorMessage } from '@/utils/format';
import { findActiveTimeGroupForChild } from '@/utils/time-group-access';

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);
  const { selectedChildId } = useAcademy();
  const { data, isLoading, isReady, error: loadError, refresh, execute } = useAcademyData(['quizOptions']);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const child = data.children.find((entry) => entry.id === selectedChildId) ?? null;
  const approvedTimeGroup = child
    ? findActiveTimeGroupForChild(data, child.id, 'approved')
    : null;
  const pendingTimeGroup = child
    ? findActiveTimeGroupForChild(data, child.id, 'pending')
    : null;
  const lesson = data.lessons.find((entry) => entry.id === lessonId && entry.status === 'published') ?? null;
  const journey = data.journeys.find((entry) => entry.id === lesson?.learning_journey_id) ?? null;
  const journeyMatchesChild = Boolean(
    child &&
      journey &&
      journey.age_group_id === child.age_group_id &&
      data.academyYears.some(
        (year) => year.id === journey.academy_year_id && year.is_active
      )
  );
  const quiz = data.quizzes.find((entry) => entry.lesson_id === lessonId && entry.is_published) ?? null;
  const questions = useMemo(
    () =>
      quiz
        ? data.quizQuestions
            .filter((question) => question.quiz_id === quiz.id)
            .sort((a, b) => a.position - b.position)
        : [],
    [data.quizQuestions, quiz]
  );
  const previousAttempts = quiz && child
    ? data.quizAttempts.filter((attempt) => attempt.quiz_id === quiz.id && attempt.child_id === child.id)
    : [];
  const bestScore = previousAttempts.reduce((best, attempt) => Math.max(best, attempt.score_percent), 0);

  if (isLoading) return <DataLoading label="Quiz wird geladen …" />;

  if (!isReady && loadError) {
    return (
      <PageScaffold eyebrow="Quiz" title={quiz?.title ?? 'Quiz'}>
        <ErrorBanner message={loadError} onRetry={() => void refresh().catch(() => {})} />
      </PageScaffold>
    );
  }

  if (!child || !Number.isFinite(lessonId)) {
    return (
      <PageScaffold eyebrow="Quiz" title="Quiz nicht verfügbar">
        <Card>
          <EmptyState
            icon="lock"
            title="Kein Zugriff auf dieses Quiz"
            description="Öffne die veröffentlichte Lektion über ein Kinderprofil."
            actionLabel="Zu den Lernreisen"
            onAction={() => router.replace('/lernreisen')}
          />
        </Card>
      </PageScaffold>
    );
  }

  if (!approvedTimeGroup) {
    return (
      <PageScaffold eyebrow="Quiz" title="Quiz noch gesperrt">
        <Card>
          <EmptyState
            icon="lock"
            title="Freigabe der Zeitgruppe ausstehend"
            description={
              pendingTimeGroup
                ? `${pendingTimeGroup.name} · ${pendingTimeGroup.schedule_label} wurde angefragt. Das Quiz öffnet sich nach der Admin-Freigabe.`
                : 'Bitte frage im Elternbereich zuerst eine Zeitgruppe an.'
            }
            actionLabel="Zu den Lernreisen"
            onAction={() => router.replace('/lernreisen')}
          />
        </Card>
      </PageScaffold>
    );
  }

  if (!lesson || !journeyMatchesChild) {
    return (
      <PageScaffold eyebrow="Quiz" title="Quiz nicht verfügbar">
        <Card>
          <EmptyState
            icon="lock"
            title="Kein Zugriff auf dieses Quiz"
            description="Öffne das Quiz über eine freigegebene Lektion der ausgewählten Altersgruppe."
            actionLabel="Zu den Lernreisen"
            onAction={() => router.replace('/lernreisen')}
          />
        </Card>
      </PageScaffold>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <PageScaffold
        eyebrow={lesson.title}
        title="Quiz wird vorbereitet">
        <Card>
          <EmptyState
            icon="clock"
            title="Noch keine Quizfragen"
            description="Das Akademie-Team veröffentlicht die Fragen nach dem Live-Unterricht."
          />
        </Card>
      </PageScaffold>
    );
  }

  async function submitQuiz() {
    if (!child || !quiz) return;
    if (questions.some((question) => !answers[question.id])) {
      setActionError('Beantworte bitte jede Frage, bevor du das Quiz abgibst.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const submissionResult = await execute(() =>
        submitMultipleChoiceQuiz(
          child.id,
          quiz.id,
          questions.map((question) => ({
            questionId: question.id,
            optionId: answers[question.id],
          }))
        ), ['quizAttempts', 'lessonProgress']
      );
      setResult(submissionResult);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      eyebrow={lesson.title}
      title={quiz.title}
      description={quiz.description ?? `Beantworte alle ${questions.length} Fragen und schließe die Lektion ab.`}>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void refresh()} />}
      {actionError && <ErrorBanner message={actionError} />}

      <Card tone="dark" style={styles.summaryCard}>
        <View style={styles.summaryCopy}>
          <Pill tone="sun">Bestehensgrenze {quiz.passing_percent} %</Pill>
          <AppText variant="heading" color={Palette.white}>{questions.length} Multiple-Choice-Fragen</AppText>
          <AppText color="#CDE0D7">Pro Frage gibt es genau eine richtige Antwort.</AppText>
        </View>
        {previousAttempts.length > 0 && (
          <View style={styles.bestScore}>
            <AppText variant="small" color="#CDE0D7">Bisher bestes Ergebnis</AppText>
            <AppText variant="title" color={Palette.sun}>{bestScore} %</AppText>
          </View>
        )}
      </Card>

      {result && (
        <Card tone={result.passed ? 'mint' : 'sun'} style={styles.resultCard}>
          <View style={styles.resultIcon}>
            <AppIcon name={result.passed ? 'trophy' : 'refresh'} size={31} color={Palette.forest} />
          </View>
          <View style={styles.resultCopy}>
            <Pill tone={result.passed ? 'mint' : 'sun'}>{result.passed ? 'Bestanden' : 'Noch einmal versuchen'}</Pill>
            <AppText variant="title">{result.score_percent} %</AppText>
            <AppText color={Palette.inkSoft}>
              {result.correct_answers} von {result.total_questions} Fragen richtig beantwortet.
            </AppText>
            <ProgressBar value={result.score_percent} />
          </View>
          <View style={styles.resultActions}>
            {!result.passed && (
              <ActionButton
                label="Erneut versuchen"
                icon="refresh"
                variant="secondary"
                onPress={() => {
                  setAnswers({});
                  setResult(null);
                }}
              />
            )}
            <ActionButton label="Zur Lektion" icon="arrow" onPress={() => router.back()} />
          </View>
        </Card>
      )}

      <View style={styles.questionsList}>
        {questions.map((question, questionIndex) => {
          const options = data.quizOptions
            .filter((option) => option.question_id === question.id)
            .sort((a, b) => a.position - b.position);
          const evaluatedAnswer = result?.answers.find(
            (answer) => answer.question_id === question.id
          );
          return (
            <Card key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}><AppText variant="bodyStrong">{questionIndex + 1}</AppText></View>
                <AppText variant="heading" style={styles.questionText}>{question.question_text}</AppText>
                {evaluatedAnswer && (
                  <Pill
                    tone={evaluatedAnswer.is_correct ? 'mint' : 'coral'}
                    icon={evaluatedAnswer.is_correct ? 'check' : 'close'}>
                    {evaluatedAnswer.is_correct ? 'Richtig' : 'Falsch'}
                  </Pill>
                )}
              </View>
              <View style={styles.optionsList}>
                {options.map((option) => {
                  const selectedOptionId = evaluatedAnswer?.selected_option_id ?? answers[question.id];
                  const selected = selectedOptionId === option.id;
                  const selectedCorrect = selected && evaluatedAnswer?.is_correct === true;
                  const selectedIncorrect = selected && evaluatedAnswer?.is_correct === false;
                  const revealedCorrect =
                    evaluatedAnswer?.is_correct === false &&
                    evaluatedAnswer.correct_option_id === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: Boolean(result) }}
                      disabled={Boolean(result)}
                      onPress={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                      style={({ pressed }) => [
                        styles.option,
                        selected && !evaluatedAnswer && styles.optionSelected,
                        selectedCorrect && styles.optionCorrect,
                        revealedCorrect && styles.optionCorrect,
                        selectedIncorrect && styles.optionIncorrect,
                        pressed && !result && styles.optionPressed,
                      ]}>
                      <View
                        style={[
                          styles.radio,
                          selected && styles.radioSelected,
                          revealedCorrect && styles.radioSelected,
                          selectedIncorrect && styles.radioIncorrect,
                        ]}>
                        {selected && <View style={[styles.radioDot, selectedIncorrect && styles.radioDotIncorrect]} />}
                      </View>
                      <AppText
                        color={selectedIncorrect ? '#84412F' : selected || revealedCorrect ? Palette.forest : Palette.inkSoft}
                        style={styles.optionText}>
                        {option.option_text}
                      </AppText>
                      {revealedCorrect && (
                        <Pill tone="mint" icon="check">Richtige Antwort</Pill>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>

      {!result && (
        <Card style={styles.submitCard}>
          <View style={styles.submitCopy}>
            <AppText variant="heading">Bereit zur Abgabe?</AppText>
            <AppText color={Palette.inkSoft}>
              {Object.keys(answers).length} von {questions.length} Fragen beantwortet
            </AppText>
          </View>
          <ActionButton
            label={submitting ? 'Wird ausgewertet …' : 'Quiz abgeben'}
            icon="check"
            disabled={submitting}
            onPress={() => void submitQuiz()}
          />
        </Card>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xl },
  summaryCopy: { flex: 1, flexBasis: 240, minWidth: 0, alignItems: 'flex-start', gap: Space.sm },
  bestScore: { alignItems: 'flex-end', gap: 3 },
  questionsList: { gap: Space.lg },
  questionCard: { gap: Space.xl },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  questionNumber: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.sunSoft },
  questionText: { flex: 1, paddingTop: Space.sm },
  optionsList: { gap: Space.sm },
  option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, paddingHorizontal: Space.lg, paddingVertical: Space.md, backgroundColor: Palette.white },
  optionSelected: { borderColor: Palette.forest, backgroundColor: Palette.mint },
  optionCorrect: { borderColor: Palette.forest, backgroundColor: Palette.mint },
  optionIncorrect: { borderColor: Palette.coral, backgroundColor: Palette.coralSoft },
  optionPressed: { opacity: 0.8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Palette.disabled, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Palette.forest },
  radioIncorrect: { borderColor: Palette.coral },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.forest },
  radioDotIncorrect: { backgroundColor: Palette.coral },
  optionText: { flex: 1 },
  submitCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg },
  submitCopy: { flex: 1, flexBasis: 220, minWidth: 0, gap: 3 },
  resultCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xl },
  resultIcon: { width: 66, height: 66, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.68)' },
  resultCopy: { flex: 1, flexBasis: 240, minWidth: 0, alignItems: 'flex-start', gap: Space.sm },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});
