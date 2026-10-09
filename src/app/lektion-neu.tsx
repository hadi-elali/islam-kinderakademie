import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import {
  ChoiceChips,
  DataLoading,
  ErrorBanner,
  RowActions,
} from '@/components/ui/data-ui';
import {
  DateField,
  TimeField,
} from '@/components/ui/date-time-fields';
import {
  ActionButton,
  AppText,
  Card,
  Field,
  PageScaffold,
  Pill,
  SectionHeader,
} from '@/components/ui/primitives';
import {
  Layout,
  Palette,
  Space,
} from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import {
  deleteRecord,
  deleteLessonPdf,
  getMediaSignedUrl,
  saveLesson,
  setLessonRelease,
  uploadLessonPdf,
} from '@/lib/academy-api';
import {
  AcademyData,
  LessonDocumentRow,
  LessonRow,
  LessonStatus,
  LiveSessionRow,
} from '@/types/database';
import { confirmAction } from '@/utils/feedback';
import {
  apiErrorMessage,
  combineLocalDateTime,
  formatBytes,
  toLocalDateInput,
  toLocalTimeInput,
} from '@/utils/format';

function isYoutubeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  try {
    const url = new URL(trimmed);

    const hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    return (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtu.be'
    );
  } catch {
    return false;
  }
}

export default function LessonEditorScreen() {
  const params =
    useLocalSearchParams<{
      lessonId?: string;
      returnTo?: string;
    }>();

  const lessonId = params.lessonId
    ? Number(params.lessonId)
    : null;

  const returnPath =
    params.returnTo === 'dashboard'
      ? '/dashboard'
      : '/lektionen';

  const {
    data,
    isLoading,
    error,
  } = useAcademyData();

  const lesson = lessonId
    ? data.lessons.find(
        (entry) =>
          entry.id === lessonId,
      )
    : null;

  if (
    lessonId &&
    isLoading &&
    !lesson
  ) {
    return (
      <PageScaffold title="Lektion laden">
        <Card>
          <DataLoading />
        </Card>
      </PageScaffold>
    );
  }

  if (
    lessonId &&
    !lesson
  ) {
    return (
      <PageScaffold title="Lektion nicht gefunden">
        <Card>
          <ErrorBanner
            message={
              error ??
              'Die angeforderte Lektion ist nicht vorhanden oder nicht zugänglich.'
            }
          />
        </Card>
      </PageScaffold>
    );
  }

  return (
    <LessonEditor
      key={
        lesson?.id ??
        'new'
      }
      data={data}
      initialLesson={
        lesson ?? null
      }
      returnPath={
        returnPath
      }
    />
  );
}

function LessonEditor({
  data,
  initialLesson,
  returnPath,
}: {
  data: AcademyData;
  initialLesson: LessonRow | null;
  returnPath:
    | '/dashboard'
    | '/lektionen';
}) {
  const router = useRouter();

  const { width } =
    useWindowDimensions();

  const compact =
    width <
    Layout.compactBreakpoint;

  const stacked =
    width <
    Layout.contentStackBreakpoint;

  const { execute } =
    useAcademyData();

  const { profile } =
    useAuth();

  const isAdmin =
    profile?.role === 'admin';

  const existingSession =
    initialLesson
      ? data.liveSessions.find(
          (session) =>
            session.lesson_id === initialLesson.id && session.group_id === null,
        ) ?? data.liveSessions.find(
          (session) =>
            session.lesson_id ===
            initialLesson.id,
        ) ?? null
      : null;

  const existingQuiz =
    initialLesson
      ? data.quizzes.find(
          (quiz) =>
            quiz.lesson_id ===
            initialLesson.id,
        ) ?? null
      : null;

  const quizQuestionCount =
    existingQuiz
      ? data.quizQuestions.filter(
          (question) =>
            question.quiz_id ===
            existingQuiz.id,
        ).length
      : 0;

  /*
   * ============================================================
   * LESSON STATE
   * ============================================================
   */

  const [
    title,
    setTitle,
  ] = useState(
    initialLesson?.title ??
      '',
  );

  const [
    description,
    setDescription,
  ] = useState(
    initialLesson?.description ??
      '',
  );

  const [
    introText,
    setIntroText,
  ] = useState(
    initialLesson?.intro_text ??
      '',
  );

  const [
    journeyId,
    setJourneyId,
  ] = useState<
    number | null
  >(
    initialLesson?.learning_journey_id ??
      null,
  );

  const [
    status,
    setStatus,
  ] =
    useState<LessonStatus>(
      initialLesson?.status ??
        'draft',
    );

  const [
    publishAt,
    setPublishAt,
  ] = useState(
    initialLesson?.publish_at?.slice(
      0,
      16,
    ) ?? '',
  );

  /*
   * Alte Replay-URL bleibt erhalten.
   */
  const [
    replayUrl,
    setReplayUrl,
  ] = useState(
    initialLesson?.replay_url ??
      '',
  );

  /*
   * NEU:
   * YouTube-Aufzeichnung
   */
  const [
    youtubeUrl,
    setYoutubeUrl,
  ] = useState(
    initialLesson?.youtube_url ??
      '',
  );

  /*
   * ============================================================
   * LIVE SESSION STATE
   * ============================================================
   */

  const [
    hasLiveSession,
    setHasLiveSession,
  ] = useState(
    Boolean(
      existingSession,
    ),
  );

  const [
    liveTitle,
    setLiveTitle,
  ] = useState(
    existingSession?.title ??
      '',
  );

  const [
    liveDate,
    setLiveDate,
  ] = useState(
    toLocalDateInput(
      existingSession?.starts_at,
    ),
  );

  const [
    liveStartTime,
    setLiveStartTime,
  ] = useState(
    toLocalTimeInput(
      existingSession?.starts_at,
    ) || '17:00',
  );

  const [
    liveEndTime,
    setLiveEndTime,
  ] = useState(
    toLocalTimeInput(
      existingSession?.ends_at,
    ) || '18:00',
  );

  const [
    meetingUrl,
    setMeetingUrl,
  ] = useState(
    existingSession?.meeting_url ??
      '',
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    releasing,
    setReleasing,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<
    string | null
  >(null);

  const [
    uploadingPdf,
    setUploadingPdf,
  ] = useState(false);

  const [
    deletingPdfId,
    setDeletingPdfId,
  ] = useState<number | null>(null);

  const effectiveJourneyId =
    journeyId ??
    data.journeys[0]?.id ??
    null;
  const lessonDocuments = initialLesson
    ? data.lessonDocuments
        .filter((document) => document.lesson_id === initialLesson.id)
        .sort((a, b) => a.position - b.position || a.id - b.id)
    : [];

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  async function submit() {
    if (
      !title.trim() ||
      !introText.trim() ||
      !effectiveJourneyId
    ) {
      setFormError(
        'Titel, Lernreise und Einstiegstext sind erforderlich.',
      );

      return;
    }

    /*
     * YouTube-Link validieren.
     */
    if (
      youtubeUrl.trim() &&
      !isYoutubeUrl(
        youtubeUrl,
      )
    ) {
      setFormError(
        'Bitte gib eine gültige YouTube-URL ein, z. B. https://www.youtube.com/watch?v=... oder https://youtu.be/...',
      );

      return;
    }

    let liveSession:
      | LiveSessionRow
      | null
      | undefined =
      undefined;

    if (
      hasLiveSession
    ) {
      const startsAt =
        combineLocalDateTime(
          liveDate,
          liveStartTime,
        );

      const endsAt =
        combineLocalDateTime(
          liveDate,
          liveEndTime,
        );

      if (
        !startsAt ||
        !endsAt ||
        endsAt <= startsAt
      ) {
        setFormError(
          'Für den Live-Termin werden ein Datum sowie gültige Start- und Endzeiten benötigt.',
        );

        return;
      }

      liveSession = {
        id:
          existingSession?.id ??
          0,

        lesson_id:
          initialLesson?.id ??
          0,

        group_id:
          null,

        title:
          liveTitle ||
          title,

        starts_at:
          startsAt,

        ends_at:
          endsAt,

        meeting_url:
          meetingUrl.trim() ||
          null,

        replay_url:
          null,

        status:
          'scheduled',

        created_at:
          existingSession?.created_at ??
          '',
      };
    }

    setSaving(true);
    setFormError(null);

    try {
      await execute(
        async () => {
          /*
           * Wenn Live-Termin deaktiviert wurde,
           * vorhandenen Termin entfernen.
           */
          if (
            !hasLiveSession &&
            existingSession
          ) {
            await deleteRecord(
              'live_sessions',
              existingSession.id,
            );
          }

          return saveLesson({
            id:
              initialLesson?.id,

            learningJourneyId:
              effectiveJourneyId,

            title:
              title.trim(),

            description:
              description.trim(),

            introText:
              introText.trim(),

            status,

            position:
              initialLesson?.position ??
              data.lessons.filter(
                (lesson) =>
                  lesson.learning_journey_id ===
                  effectiveJourneyId,
              ).length,

            publishAt:
              publishAt ||
              null,

            /*
             * Bestehende Replay-URL
             */
            replayUrl:
              replayUrl.trim() ||
              null,

            /*
             * NEU:
             * YouTube-Link
             */
            youtubeUrl:
              youtubeUrl.trim() ||
              null,

            liveSession:
              liveSession
                ? {
                    id:
                      existingSession?.id,

                    title:
                      liveSession.title ??
                      undefined,

                    startsAt:
                      liveSession.starts_at,

                    endsAt:
                      liveSession.ends_at,

                    meetingUrl:
                      liveSession.meeting_url ??
                      undefined,
                  }
                : null,
          });
        },
      );

      router.replace(
        returnPath,
      );
    } catch (reason) {
      setFormError(
        apiErrorMessage(
          reason,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * RELEASE
   * ============================================================
   */

  async function toggleRelease() {
    if (
      !initialLesson ||
      !isAdmin
    ) {
      return;
    }

    if (
      initialLesson.is_released
    ) {
      const confirmed =
        await confirmAction(
          'Lektion sperren?',
          'Die Lektion und das zugehörige Quiz sind danach für Familien nicht mehr sichtbar.',
        );

      if (!confirmed) {
        return;
      }
    }

    setReleasing(true);
    setFormError(null);

    try {
      await execute(() =>
        setLessonRelease(
          initialLesson.id,
          !initialLesson.is_released,
        ),
      );
    } catch (reason) {
      setFormError(
        apiErrorMessage(
          reason,
        ),
      );
    } finally {
      setReleasing(
        false,
      );
    }
  }

  async function selectAndUploadPdf() {
    if (!initialLesson || !isAdmin || !profile?.id) {
      setFormError(
        'Speichere die Lektion zuerst und öffne sie mit einem Admin-Konto.',
      );
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    const pickedFile = result.assets[0];
    const isPdf =
      pickedFile.mimeType?.toLowerCase() === 'application/pdf' ||
      pickedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setFormError('Bitte wähle eine PDF-Datei aus.');
      return;
    }

    if (pickedFile.size && pickedFile.size > 50 * 1024 * 1024) {
      setFormError('Die PDF-Datei darf höchstens 50 MB groß sein.');
      return;
    }

    setUploadingPdf(true);
    setFormError(null);

    try {
      const fileData = pickedFile.file
        ? await pickedFile.file.arrayBuffer()
        : await fetch(pickedFile.uri).then((response) => response.arrayBuffer());

      const nextPosition = lessonDocuments.reduce(
        (highest, document) => Math.max(highest, document.position + 1),
        0,
      );

      await execute(() =>
        uploadLessonPdf({
          lessonId: initialLesson.id,
          profileId: profile.id!,
          fileName: pickedFile.name,
          mimeType: pickedFile.mimeType ?? 'application/pdf',
          size: pickedFile.size ?? null,
          data: fileData,
          position: nextPosition,
        }),
      );
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setUploadingPdf(false);
    }
  }

  async function openLessonPdf(document: LessonDocumentRow) {
    const asset = data.mediaAssets.find(
      (entry) => entry.id === document.media_asset_id,
    );

    if (!asset) {
      setFormError('Die PDF-Datei wurde nicht gefunden.');
      return;
    }

    try {
      const url = await getMediaSignedUrl(asset);
      if (url) {
        await Linking.openURL(url);
      }
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    }
  }

  async function removeLessonPdf(document: LessonDocumentRow) {
    if (!isAdmin || deletingPdfId !== null || uploadingPdf) {
      return;
    }

    const asset = data.mediaAssets.find(
      (entry) => entry.id === document.media_asset_id,
    ) ?? null;
    const confirmed = await confirmAction(
      'PDF löschen?',
      `„${document.title}“ wird aus der Lektion und aus dem privaten Speicher entfernt.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingPdfId(document.id);
    setFormError(null);

    try {
      await execute(() => deleteLessonPdf(document, asset));
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setDeletingPdfId(null);
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <PageScaffold
      eyebrow="Lektionseditor"
      title={
        initialLesson
          ? 'Lektion bearbeiten'
          : 'Neue Lektion'
      }
      description="Eine Lektion führt vom Einstiegstext und optionalem PDF-Lesematerial über den geplanten Live-Unterricht zur Aufzeichnung und anschließend zum Multiple-Choice-Quiz."
      action={
        <View
          style={[
            styles.headerActions,
            compact &&
              styles.headerActionsCompact,
          ]}
        >
          <ActionButton
            label="Abbrechen"
            variant="secondary"
            onPress={() =>
              router.back()
            }
          />

          <ActionButton
            label={
              saving
                ? 'Wird gespeichert …'
                : initialLesson
                  ? 'Änderungen speichern'
                  : 'Entwurf speichern'
            }
            icon="check"
            disabled={
              saving ||
              data.journeys
                .length === 0
            }
            onPress={() =>
              void submit()
            }
          />
        </View>
      }
    >
      {formError && (
        <ErrorBanner
          message={
            formError
          }
        />
      )}

      {data.journeys
        .length === 0 && (
        <ErrorBanner
          message="Lege im Curriculum zuerst ein Akademiejahr und eine Lernreise an."
        />
      )}

      <View
        style={[
          styles.editorLayout,
          stacked &&
            styles.column,
        ]}
      >
        {/* ================================================= */}
        {/* HAUPTSPALTE */}
        {/* ================================================= */}

        <View
          style={[
            styles.mainColumn,
            stacked &&
              styles.fullWidth,
          ]}
        >
          {/* GRUNDDATEN */}

          <Card>
            <SectionHeader
              title="Grunddaten"
              description="Zuordnung und Bezeichnung"
            />

            <View
              style={
                styles.formStack
              }
            >
              <Field
                label="Titel der Lektion"
                placeholder="Titel eingeben"
                value={
                  title
                }
                onChangeText={
                  setTitle
                }
              />

              <ChoiceChips
                label="Lernreise"
                value={
                  effectiveJourneyId
                }
                onChange={setJourneyId}
                options={data.journeys.map(
                  (
                    journey,
                  ) => ({
                    value:
                      journey.id,

                    label: `${journey.title} · ${
                      data.ageGroups.find(
                        (
                          group,
                        ) =>
                          group.id ===
                          journey.age_group_id,
                      )
                        ?.title ??
                      'Ohne Altersgruppe'
                    }`,
                  }),
                )}
              />

              <Field
                label="Kurzbeschreibung"
                placeholder="Optionale Beschreibung"
                multiline
                value={
                  description
                }
                onChangeText={
                  setDescription
                }
              />
            </View>
          </Card>

          <SectionHeader
            title="Lektionsablauf"
            description="Einstieg, Lesematerial, Live-Unterricht und Quiz"
          />

          {/* ================================================= */}
          {/* SCHRITT 1 */}
          {/* ================================================= */}

          <Card
            style={
              styles.stepCard
            }
          >
            <View
              style={
                styles.stepHeader
              }
            >
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      Palette.sunSoft,
                  },
                ]}
              >
                <AppIcon
                  name="play"
                  size={22}
                  color={
                    Palette.forest
                  }
                />
              </View>

              <View
                style={
                  styles.stepCopy
                }
              >
                <AppText
                  variant="label"
                  color={
                    Palette.muted
                  }
                >
                  Schritt 01
                </AppText>

                <AppText variant="bodyStrong">
                  Einstiegstext
                </AppText>

                <AppText
                  variant="small"
                  color={
                    Palette.inkSoft
                  }
                >
                  Bereitet die
                  Kinder auf den
                  Live-Unterricht
                  vor.
                </AppText>
              </View>

              <Pill
                tone={
                  introText.trim()
                    ? 'mint'
                    : 'neutral'
                }
              >
                {introText.trim()
                  ? 'Gefüllt'
                  : 'Leer'}
              </Pill>
            </View>

            <Field
              label="Text vor der Vorlesung"
              placeholder="Einführung, Leitfrage oder kurze Geschichte …"
              multiline
              value={
                introText
              }
              onChangeText={
                setIntroText
              }
            />
          </Card>

          {/* ================================================= */}
          {/* PDF-LESEMATERIAL */}
          {/* ================================================= */}

          <Card style={styles.pdfCard}>
            <View style={styles.mediaIcon}>
              <AppIcon
                name="lessons"
                size={25}
                color={Palette.forest}
              />
            </View>

            <View style={styles.mediaHeading}>
              <AppText variant="heading">PDF-Lesematerial</AppText>
              <AppText variant="small" color={Palette.inkSoft}>
                Mehrere PDFs können direkt in der freigegebenen Lektion als
                Reader angezeigt werden.
              </AppText>
            </View>

            {!initialLesson ? (
              <AppText variant="small" color={Palette.muted}>
                Speichere zuerst die Lektion. Danach kannst du PDFs hochladen.
              </AppText>
            ) : (
              <>
                {lessonDocuments.length === 0 ? (
                  <Pill tone="neutral">Noch keine PDF hinterlegt</Pill>
                ) : (
                  <View style={styles.pdfList}>
                    {lessonDocuments.map((document) => {
                      const asset = data.mediaAssets.find(
                        (entry) => entry.id === document.media_asset_id,
                      );

                      return (
                        <View key={document.id} style={styles.pdfRow}>
                          <View style={styles.pdfCopy}>
                            <AppText variant="bodyStrong" numberOfLines={2}>
                              {document.title}
                            </AppText>
                            <AppText variant="small" color={Palette.muted}>
                              {formatBytes(asset?.size_bytes ?? null)}
                            </AppText>
                          </View>

                          <RowActions
                            extra={
                              <ActionButton
                                label="Öffnen"
                                icon="external"
                                compact
                                variant="secondary"
                                onPress={() => void openLessonPdf(document)}
                              />
                            }
                            onDelete={
                              isAdmin
                                ? () => void removeLessonPdf(document)
                                : undefined
                            }
                          />
                        </View>
                      );
                    })}
                  </View>
                )}

                {isAdmin ? (
                  <ActionButton
                    label={
                      uploadingPdf ? 'PDF wird hochgeladen …' : 'PDF hochladen'
                    }
                    icon="add"
                    disabled={uploadingPdf || deletingPdfId !== null}
                    onPress={() => void selectAndUploadPdf()}
                  />
                ) : (
                  <AppText variant="small" color={Palette.muted}>
                    Nur Admins können Lektions-PDFs hochladen und entfernen.
                  </AppText>
                )}
              </>
            )}
          </Card>

          {/* ================================================= */}
          {/* SCHRITT 2 */}
          {/* ================================================= */}

          <Card
            style={
              styles.stepCard
            }
          >
            <View
              style={
                styles.stepHeader
              }
            >
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      Palette.skySoft,
                  },
                ]}
              >
                <AppIcon
                  name="video"
                  size={22}
                  color={
                    Palette.forest
                  }
                />
              </View>

              <View
                style={
                  styles.stepCopy
                }
              >
                <AppText
                  variant="label"
                  color={
                    Palette.muted
                  }
                >
                  Schritt 02
                </AppText>

                <AppText variant="bodyStrong">
                  Live-Vorlesung
                  über Zoom
                </AppText>

                <AppText
                  variant="small"
                  color={
                    Palette.inkSoft
                  }
                >
                  Ein gemeinsamer Termin und Zoom-Zugang gelten für alle
                  Zeitgruppen der Lektion.
                </AppText>
              </View>

              <Pill
                tone={
                  hasLiveSession
                    ? 'sky'
                    : 'neutral'
                }
              >
                {hasLiveSession
                  ? 'Geplant'
                  : 'Offen'}
              </Pill>
            </View>

            <View
              style={
                styles.formStack
              }
            >
              <ChoiceChips
                label="Live-Termin"
                value={
                  hasLiveSession
                    ? 'yes'
                    : 'no'
                }
                onChange={(
                  value,
                ) =>
                  setHasLiveSession(
                    value ===
                      'yes',
                  )
                }
                options={[
                  {
                    value:
                      'no',
                    label:
                      'Noch kein Termin',
                  },
                  {
                    value:
                      'yes',
                    label:
                      'Termin eintragen',
                  },
                ]}
              />

              {hasLiveSession && (
                <>
                  <Field
                    label="Bezeichnung"
                    placeholder={
                      title ||
                      'Live-Unterricht'
                    }
                    value={
                      liveTitle
                    }
                    onChangeText={
                      setLiveTitle
                    }
                  />

                  <DateField
                    label="Datum"
                    value={
                      liveDate
                    }
                    onChange={
                      setLiveDate
                    }
                  />

                  <View
                    style={
                      styles.formRow
                    }
                  >
                    <View
                      style={
                        styles.formHalf
                      }
                    >
                      <TimeField
                        label="Beginn"
                        value={
                          liveStartTime
                        }
                        onChange={
                          setLiveStartTime
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.formHalf
                      }
                    >
                      <TimeField
                        label="Ende"
                        value={
                          liveEndTime
                        }
                        onChange={
                          setLiveEndTime
                        }
                      />
                    </View>
                  </View>

                  <Field
                    label="Zoom-Zugang"
                    helper="Dieser Link gilt für alle Zeitgruppen der Altersgruppe im Akademiejahr dieser Lektion."
                    placeholder="https://zoom.us/…"
                    value={
                      meetingUrl
                    }
                    onChangeText={
                      setMeetingUrl
                    }
                    autoCapitalize="none"
                  />
                </>
              )}
            </View>
          </Card>

          {/* ================================================= */}
          {/* SCHRITT 3 */}
          {/* ================================================= */}

          <Card
            style={
              styles.stepCard
            }
          >
            <View
              style={
                styles.stepHeader
              }
            >
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      Palette.mint,
                  },
                ]}
              >
                <AppIcon
                  name="check"
                  size={22}
                  color={
                    Palette.forest
                  }
                />
              </View>

              <View
                style={
                  styles.stepCopy
                }
              >
                <AppText
                  variant="label"
                  color={
                    Palette.muted
                  }
                >
                  Schritt 03
                </AppText>

                <AppText variant="bodyStrong">
                  Multiple-Choice-Quiz
                </AppText>

                <AppText
                  variant="small"
                  color={
                    Palette.inkSoft
                  }
                >
                  Öffnet für
                  Kinder auf einer
                  eigenen Seite.
                </AppText>
              </View>

              <Pill
                tone={
                  existingQuiz?.is_published
                    ? 'mint'
                    : existingQuiz
                      ? 'sun'
                      : 'neutral'
                }
              >
                {existingQuiz?.is_published
                  ? `${quizQuestionCount} Fragen · veröffentlicht`
                  : existingQuiz
                    ? `${quizQuestionCount} Fragen · Entwurf`
                    : 'Noch nicht angelegt'}
              </Pill>
            </View>

            {initialLesson ? (
              <ActionButton
                label={
                  existingQuiz
                    ? 'Quiz bearbeiten'
                    : 'Quiz anlegen'
                }
                icon="arrow"
                variant="secondary"
                onPress={() =>
                  router.push(
                    `/quiz-bearbeiten?lessonId=${initialLesson.id}${
                      returnPath ===
                      '/dashboard'
                        ? '&returnTo=dashboard'
                        : ''
                    }` as Href,
                  )
                }
              />
            ) : (
              <AppText
                color={
                  Palette.inkSoft
                }
              >
                Speichere zuerst
                die Lektion.
                Anschließend
                kannst du die
                Quizfragen
                anlegen.
              </AppText>
            )}
          </Card>
        </View>

        {/* ================================================= */}
        {/* SEITENSPALTE */}
        {/* ================================================= */}

        <View
          style={[
            styles.sideColumn,
            stacked &&
              styles.fullWidth,
          ]}
        >
          {/* STATUS */}

          <Card
            style={
              styles.statusCard
            }
          >
            <SectionHeader
              title="Status & Freigabe"
            />

            <ChoiceChips
              label="Veröffentlichung"
              value={
                status
              }
              onChange={(
                value,
              ) =>
                value &&
                setStatus(
                  value,
                )
              }
              options={[
                {
                  value:
                    'draft',
                  label:
                    'Entwurf',
                },
                {
                  value:
                    'scheduled',
                  label:
                    'Geplant',
                },
                {
                  value:
                    'published',
                  label:
                    'Veröffentlicht',
                },
                {
                  value:
                    'archived',
                  label:
                    'Archiviert',
                },
              ]}
            />

            <Field
              label="Veröffentlichungszeit (optional)"
              placeholder="2026-09-01T08:00"
              value={
                publishAt
              }
              onChangeText={
                setPublishAt
              }
            />

            <View
              style={
                styles.releaseBox
              }
            >
              <Pill
                tone={
                  initialLesson?.is_released
                    ? 'mint'
                    : 'neutral'
                }
              >
                {initialLesson?.is_released
                  ? 'Für Familien freigegeben'
                  : 'Für Familien gesperrt'}
              </Pill>

              {!initialLesson ? (
                <AppText
                  variant="small"
                  color={
                    Palette.inkSoft
                  }
                >
                  Speichere die
                  Lektion zuerst
                  als Entwurf.
                </AppText>
              ) : isAdmin ? (
                <>
                  <ActionButton
                    label={
                      releasing
                        ? 'Freigabe wird geändert …'
                        : initialLesson.is_released
                          ? 'Lektion wieder sperren'
                          : 'Lektion jetzt freigeben'
                    }
                    icon={
                      initialLesson.is_released
                        ? 'close'
                        : 'check'
                    }
                    disabled={
                      releasing ||
                      status !==
                        initialLesson.status ||
                      (!initialLesson.is_released &&
                        initialLesson.status !==
                          'published')
                    }
                    onPress={() =>
                      void toggleRelease()
                    }
                  />

                  {status !==
                  initialLesson.status ? (
                    <AppText
                      variant="small"
                      color={
                        Palette.muted
                      }
                    >
                      Speichere
                      zuerst deine
                      Statusänderung.
                    </AppText>
                  ) : !initialLesson.is_released &&
                    initialLesson.status !==
                      'published' ? (
                    <AppText
                      variant="small"
                      color={
                        Palette.muted
                      }
                    >
                      Setze den
                      Status auf
                      „Veröffentlicht“,
                      speichere und
                      gib die
                      Lektion
                      anschließend
                      hier frei.
                    </AppText>
                  ) : null}
                </>
              ) : (
                <AppText
                  variant="small"
                  color={
                    Palette.inkSoft
                  }
                >
                  Nur Admins
                  können
                  Lektionen für
                  Familien
                  freigeben.
                </AppText>
              )}
            </View>
          </Card>

          {/* ================================================= */}
          {/* YOUTUBE */}
          {/* ================================================= */}

          <Card
            tone="mint"
            style={
              styles.mediaCard
            }
          >
            <View
              style={
                styles.mediaIcon
              }
            >
              <AppIcon
                name="video"
                size={25}
                color={
                  Palette.forest
                }
              />
            </View>

            <View
              style={
                styles.mediaHeading
              }
            >
              <AppText variant="heading">
                YouTube-Aufzeichnung
              </AppText>

              <AppText
                variant="small"
                color={
                  Palette.inkSoft
                }
              >
                Nach dem
                Zoom-Unterricht
                kannst du hier
                die
                Aufzeichnung
                hinterlegen.
              </AppText>
            </View>

            <Field
              label="YouTube-Link"
              placeholder="https://www.youtube.com/watch?v=..."
              value={
                youtubeUrl
              }
              onChangeText={
                setYoutubeUrl
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
              helper="Sobald ein YouTube-Link eingetragen ist, sehen Familien die YouTube-Aufzeichnung anstelle des Zoom-Zugangs."
            />

            {youtubeUrl.trim() ? (
              <Pill tone="mint">
                YouTube-Video
                hinterlegt
              </Pill>
            ) : (
              <Pill tone="neutral">
                Noch kein
                YouTube-Video
              </Pill>
            )}
          </Card>

          {/* ================================================= */}
          {/* ALTE / ALTERNATIVE REPLAY URL */}
          {/* ================================================= */}

          <Card
            style={
              styles.replayCard
            }
          >
            <AppText variant="bodyStrong">
              Alternative
              Replay-URL
            </AppText>

            <AppText
              variant="small"
              color={
                Palette.muted
              }
            >
              Optional. Wird nur
              als alternative
              Aufzeichnung
              verwendet, wenn
              kein YouTube-Link
              hinterlegt ist.
            </AppText>

            <Field
              label="Replay-URL"
              placeholder="https://…"
              value={
                replayUrl
              }
              onChangeText={
                setReplayUrl
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
            />
          </Card>
        </View>
      </View>
    </PageScaffold>
  );
}

const styles =
  StyleSheet.create({
    headerActions: {
      flexDirection:
        'row',
      gap: Space.sm,
    },

    headerActionsCompact: {
      flexDirection:
        'column-reverse',
    },

    editorLayout: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      gap: Space.lg,
    },

    column: {
      flexDirection:
        'column',
    },

    fullWidth: {
      width:
        '100%',
      minWidth: 0,
      maxWidth:
        '100%',
      flexBasis:
        'auto',
    },

    mainColumn: {
      flex: 1.45,
      minWidth: 0,
      gap: Space.xl,
    },

    sideColumn: {
      flex: 0.7,
      minWidth: 300,
      gap: Space.lg,
    },

    formStack: {
      gap: Space.lg,
      marginTop:
        Space.xl,
    },

    formRow: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: Space.md,
    },

    formHalf: {
      flex: 1,
      minWidth: 180,
    },

    stepCard: {
      gap: Space.lg,
      padding:
        Space.lg,
    },

    stepHeader: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      alignItems:
        'center',
      gap: Space.md,
    },

    stepIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    stepCopy: {
      flex: 1,
      flexBasis: 210,
      minWidth: 0,
      gap: 2,
    },

    statusCard: {
      gap: Space.lg,
    },

    releaseBox: {
      gap: Space.sm,
      alignItems:
        'flex-start',
    },

    mediaCard: {
      gap: Space.md,
    },

    mediaIcon: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.65)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    mediaHeading: {
      gap: 4,
    },

    pdfCard: {
      gap: Space.md,
    },

    pdfList: {
      gap: Space.sm,
    },

    pdfRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: Space.sm,
      borderWidth: 1,
      borderColor: Palette.line,
      borderRadius: 14,
      padding: Space.sm,
    },

    pdfCopy: {
      flex: 1,
      minWidth: 140,
      gap: 2,
    },

    replayCard: {
      gap: Space.md,
    },
  });
