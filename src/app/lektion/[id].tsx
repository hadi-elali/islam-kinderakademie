import { TeachingContacts } from "@/components/teaching-contacts";
import * as Linking from "expo-linking";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import PdfReader from "@/components/pdf-reader";
import YoutubeVideoPlayer from "@/components/YoutubeVideoPlayer";
import { AppIcon } from "@/components/ui/app-icon";
import { ChoiceChips, DataLoading, ErrorBanner } from "@/components/ui/data-ui";
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  PageScaffold,
  Pill,
  ProgressBar,
} from "@/components/ui/primitives";
import { Layout, Palette, Radius, Space } from "@/constants/design";
import { useAcademy } from "@/context/academy-context";
import { useAcademyData } from "@/context/academy-data-context";
import { getMediaSignedUrl } from "@/lib/academy-api";
import { apiErrorMessage, formatDateTime } from "@/utils/format";
import { findActiveTimeGroupForChild } from "@/utils/time-group-access";

const sessionLabels = {
  scheduled: "Geplant",
  live: "Jetzt live",
  completed: "Abgeschlossen",
  cancelled: "Abgesagt",
} as const;

const sessionPriority = {
  live: 0,
  scheduled: 1,
  completed: 2,
  cancelled: 3,
} as const;

/* ============================================================
 * YOUTUBE HELPER
 * ============================================================ */

/**
 * Unterstützt unter anderem:
 *
 * https://www.youtube.com/watch?v=VIDEO_ID
 * https://youtu.be/VIDEO_ID
 * https://youtube.com/embed/VIDEO_ID
 * https://youtube.com/shorts/VIDEO_ID
 * https://youtube.com/live/VIDEO_ID
 */
function getYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const input = value.trim();

  if (!input) {
    return null;
  }

  try {
    const url = new URL(input);

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    let videoId: string | null = null;

    /*
     * https://youtu.be/VIDEO_ID
     */
    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    /*
     * youtube.com
     */
    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      /*
       * https://youtube.com/watch?v=VIDEO_ID
       */
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      }

      /*
       * https://youtube.com/embed/VIDEO_ID
       * https://youtube.com/shorts/VIDEO_ID
       * https://youtube.com/live/VIDEO_ID
       */
      const pathMatch = url.pathname.match(
        /^\/(?:embed|shorts|live)\/([^/?#]+)/,
      );

      if (pathMatch?.[1]) {
        videoId = pathMatch[1];
      }
    }

    if (!videoId) {
      return null;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(videoId)) {
      return null;
    }

    return videoId;
  } catch {
    return null;
  }
}

/* ============================================================
 * LESSON DETAIL
 * ============================================================ */

export default function LessonDetailScreen() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const compact = width < Layout.compactBreakpoint;

  const params = useLocalSearchParams<{
    id: string;
  }>();

  const lessonId = Number(params.id);

  const { selectedChildId } = useAcademy();

  const { data, isLoading, error, refresh } = useAcademyData();

  /*
   * Breite des YouTube-Containers.
   *
   * Dadurch können wir dem Player exakt
   * die verfügbare Breite und eine
   * 16:9-Höhe geben.
   */
  const [youtubePlayerWidth, setYoutubePlayerWidth] = useState(0);

  const [youtubePlayerError, setYoutubePlayerError] = useState(false);

  const [selectedPdfId, setSelectedPdfId] = useState<number | null>(null);
  const [pdfResult, setPdfResult] = useState<{
    assetId: number;
    url: string | null;
    error: string | null;
  } | null>(null);

  /* ==========================================================
   * DATEN
   * ========================================================== */

  const child =
    data.children.find((entry) => entry.id === selectedChildId) ?? null;

  const approvedTimeGroup = child
    ? findActiveTimeGroupForChild(data, child.id, "approved")
    : null;

  const pendingTimeGroup = child
    ? findActiveTimeGroupForChild(data, child.id, "pending")
    : null;

  const lesson =
    data.lessons.find(
      (entry) => entry.id === lessonId && entry.status === "published",
    ) ?? null;

  const journey =
    data.journeys.find((entry) => entry.id === lesson?.learning_journey_id) ??
    null;

  const journeyMatchesChild = Boolean(
    child &&
      journey &&
      journey.age_group_id === child.age_group_id &&
      data.academyYears.some(
        (year) => year.id === journey.academy_year_id && year.is_active,
      ),
  );

  const lessonDocuments = lesson
    ? data.lessonDocuments
        .filter((document) => document.lesson_id === lesson.id)
        .sort((a, b) => a.position - b.position || a.id - b.id)
    : [];

  const selectedDocument =
    lessonDocuments.find((document) => document.id === selectedPdfId) ??
    lessonDocuments[0] ??
    null;

  const canReadLesson = Boolean(
    child && approvedTimeGroup && lesson && journeyMatchesChild,
  );

  const selectedPdfAsset = canReadLesson
    ? data.mediaAssets.find(
        (asset) => asset.id === selectedDocument?.media_asset_id,
      ) ?? null
    : null;

  const currentPdfResult =
    pdfResult?.assetId === selectedPdfAsset?.id ? pdfResult : null;
  const pdfUrl = currentPdfResult?.url ?? null;
  const pdfError = currentPdfResult?.error ?? null;
  const pdfLoading = Boolean(selectedPdfAsset && !currentPdfResult);

  useEffect(() => {
    let active = true;

    if (!selectedPdfAsset) {
      return () => {
        active = false;
      };
    }

    void getMediaSignedUrl(selectedPdfAsset)
      .then((url) => {
        if (!active) {
          return;
        }

        if (!url) {
          throw new Error("Die PDF-Adresse konnte nicht erstellt werden.");
        }

        setPdfResult({
          assetId: selectedPdfAsset.id,
          url,
          error: null,
        });
      })
      .catch((reason) => {
        if (active) {
          setPdfResult({
            assetId: selectedPdfAsset.id,
            url: null,
            error: apiErrorMessage(reason),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [selectedPdfAsset]);

  async function openSelectedPdf() {
    if (!selectedPdfAsset) {
      return;
    }

    setPdfResult((current) =>
      current?.assetId === selectedPdfAsset.id
        ? { ...current, error: null }
        : current,
    );

    try {
      const url = await getMediaSignedUrl(selectedPdfAsset);
      if (url) {
        await Linking.openURL(url);
      }
    } catch (reason) {
      setPdfResult({
        assetId: selectedPdfAsset.id,
        url: pdfUrl,
        error: apiErrorMessage(reason),
      });
    }
  }

  /*
   * Priorität:
   *
   * live
   * scheduled
   * completed
   */
  const liveSession =
    data.liveSessions
      .filter(
        (session) =>
          session.lesson_id === lessonId && session.status !== "cancelled",
      )
      .sort(
        (a, b) =>
          sessionPriority[a.status] - sessionPriority[b.status] ||
          a.starts_at.localeCompare(b.starts_at),
      )[0] ?? null;

  const quiz =
    data.quizzes.find(
      (entry) => entry.lesson_id === lessonId && entry.is_published,
    ) ?? null;

  const questionCount = quiz
    ? data.quizQuestions.filter((question) => question.quiz_id === quiz.id)
        .length
    : 0;

  const progress = data.lessonProgress.find(
    (entry) => entry.child_id === child?.id && entry.lesson_id === lessonId,
  );

  const attempts =
    quiz && child
      ? data.quizAttempts.filter(
          (attempt) =>
            attempt.quiz_id === quiz.id && attempt.child_id === child.id,
        )
      : [];

  const bestScore = attempts.reduce(
    (best, attempt) => Math.max(best, attempt.score_percent),
    0,
  );

  /* ==========================================================
   * YOUTUBE
   * ========================================================== */

  const youtubeUrl = lesson?.youtube_url?.trim() || null;

  const youtubeVideoId = getYouTubeVideoId(youtubeUrl);

  /*
   * YouTube wird nur angezeigt,
   * wenn eine gültige Video-ID erkannt wurde.
   */
  const hasYoutubeVideo = Boolean(youtubeVideoId);

  const youtubePlayerHeight =
    youtubePlayerWidth > 0 ? Math.round(youtubePlayerWidth * (9 / 16)) : 0;

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (isLoading && (!child || !lesson)) {
    return <DataLoading label="Lektion wird geladen …" />;
  }

  if (!child || !Number.isFinite(lessonId)) {
    return (
      <PageScaffold eyebrow="Lektion" title="Lektion nicht verfügbar">
        <Card>
          <EmptyState
            icon="lock"
            title="Kein Zugriff auf diese Lektion"
            description="Wähle ein Kinderprofil und öffne eine veröffentlichte Lektion über die Lernreisen."
            actionLabel="Zu den Lernreisen"
            onAction={() => router.replace("/lernreisen")}
          />
        </Card>
      </PageScaffold>
    );
  }

  if (!approvedTimeGroup) {
    return (
      <PageScaffold eyebrow="Lektion" title="Inhalte noch gesperrt">
        <Card>
          <EmptyState
            icon="lock"
            title="Freigabe der Zeitgruppe ausstehend"
            description={
              pendingTimeGroup
                ? `${pendingTimeGroup.name} · ${pendingTimeGroup.schedule_label} wurde angefragt. Die Lernreise bleibt sichtbar; diese Lektion öffnet sich nach der Admin-Freigabe.`
                : "Bitte frage im Elternbereich zuerst eine Zeitgruppe an. Die Lektionen öffnen sich nach der Admin-Freigabe."
            }
            actionLabel="Lernreisen ansehen"
            onAction={() => router.replace("/lernreisen")}
          />
        </Card>
      </PageScaffold>
    );
  }

  if (!lesson || !journeyMatchesChild) {
    return (
      <PageScaffold eyebrow="Lektion" title="Lektion nicht verfügbar">
        <Card>
          <EmptyState
            icon="lock"
            title="Kein Zugriff auf diese Lektion"
            description="Öffne eine freigegebene Lektion der ausgewählten Altersgruppe über die Lernreisen."
            actionLabel="Zu den Lernreisen"
            onAction={() => router.replace("/lernreisen")}
          />
        </Card>
      </PageScaffold>
    );
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <PageScaffold
      eyebrow={journey?.title ?? "Lernreise"}
      title={lesson.title}
      description={lesson.description ?? undefined}
    >
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}
      <TeachingContacts ageGroupIds={[child.age_group_id]} />

      {/* ====================================================
       * FORTSCHRITT
       * ==================================================== */}

      <Card
        tone="dark"
        style={[styles.progressCard, compact && styles.progressCardCompact]}
      >
        <View style={styles.progressCopy}>
          <Pill tone={progress?.status === "completed" ? "sun" : "mint"}>
            {progress?.status === "completed"
              ? "Lektion abgeschlossen"
              : "Deine Lektion"}
          </Pill>

          <AppText variant="heading" color={Palette.white}>
            {hasYoutubeVideo
              ? "Lesen, die Aufzeichnung ansehen und anschließend das Quiz lösen."
              : "Lesen, live dabei sein und anschließend das Quiz lösen."}
          </AppText>

          <ProgressBar
            value={progress?.progress_percent ?? 0}
            color={Palette.sun}
            trackColor="rgba(255,255,255,0.13)"
          />
        </View>

        <AppText variant="title" color={Palette.sun}>
          {progress?.progress_percent ?? 0} %
        </AppText>
      </Card>

      <View style={styles.flow}>
        {/* ==================================================
         * SCHRITT 1
         * ================================================== */}

        <Card style={styles.flowCard}>
          <View style={styles.flowHeader}>
            <View style={[styles.stepNumber, styles.stepStart]}>
              <AppText variant="bodyStrong">1</AppText>
            </View>

            <View style={styles.flowHeading}>
              <AppText variant="label" color={Palette.muted}>
                Vorbereitung
              </AppText>

              <AppText variant="heading">Einstieg in das Thema</AppText>
            </View>

            <Pill tone="mint">Lesen</Pill>
          </View>

          {lesson.intro_text ? (
            <AppText color={Palette.inkSoft}>{lesson.intro_text}</AppText>
          ) : (
            <AppText color={Palette.muted}>
              Der Einstiegstext wird noch ergänzt.
            </AppText>
          )}
        </Card>

        {lessonDocuments.length > 0 && (
          <>
            <View style={styles.connector} />

            <Card tone="mint" style={styles.flowCard}>
              <View style={styles.flowHeader}>
                <View style={[styles.stepNumber, styles.stepReader]}>
                  <AppIcon name="lessons" size={20} color={Palette.forest} />
                </View>

                <View style={styles.flowHeading}>
                  <AppText variant="label" color={Palette.muted}>
                    Lesematerial
                  </AppText>

                  <AppText variant="heading">PDF-Reader</AppText>
                </View>

                <Pill tone="sky">
                  {lessonDocuments.length === 1
                    ? "1 Dokument"
                    : `${lessonDocuments.length} Dokumente`}
                </Pill>
              </View>

              {lessonDocuments.length > 1 && selectedDocument && (
                <ChoiceChips
                  label="Dokument auswählen"
                  value={selectedDocument.id}
                  onChange={(documentId) => setSelectedPdfId(documentId)}
                  options={lessonDocuments.map((document) => ({
                    value: document.id,
                    label: document.title,
                  }))}
                />
              )}

              {pdfLoading ? (
                <DataLoading label="PDF wird geladen …" />
              ) : pdfUrl && selectedDocument ? (
                <PdfReader
                  sourceUrl={pdfUrl}
                  title={selectedDocument.title}
                  height={compact ? 520 : 720}
                  onError={() =>
                    setPdfResult({
                      assetId: selectedPdfAsset!.id,
                      url: pdfUrl,
                      error:
                        "Der eingebettete Reader konnte nicht geladen werden. Öffne die PDF separat.",
                    })
                  }
                />
              ) : (
                <AppText color={Palette.muted}>
                  Die PDF konnte gerade nicht im Reader geladen werden.
                </AppText>
              )}

              {pdfError && <ErrorBanner message={pdfError} />}

              {selectedPdfAsset && (
                <View style={styles.pdfActions}>
                  <ActionButton
                    label="PDF separat öffnen"
                    icon="external"
                    variant="secondary"
                    onPress={() => void openSelectedPdf()}
                  />
                </View>
              )}
            </Card>
          </>
        )}

        <View style={styles.connector} />

        {/* ==================================================
         * SCHRITT 2
         *
         * YOUTUBE HAT VORRANG VOR ZOOM
         * ================================================== */}

        <Card tone="sky" style={styles.flowCard}>
          <View style={styles.flowHeader}>
            <View style={[styles.stepNumber, styles.stepLive]}>
              <AppIcon
                name={hasYoutubeVideo ? "play" : "video"}
                size={20}
                color={Palette.forest}
              />
            </View>

            <View style={styles.flowHeading}>
              <AppText variant="label" color={Palette.muted}>
                {hasYoutubeVideo ? "Aufzeichnung" : "Live-Unterricht"}
              </AppText>

              <AppText variant="heading">
                {hasYoutubeVideo ? "YouTube-Aufzeichnung" : "Zoom-Vorlesung"}
              </AppText>
            </View>

            {hasYoutubeVideo ? (
              <Pill tone="coral">YouTube</Pill>
            ) : (
              liveSession && (
                <Pill tone={liveSession.status === "live" ? "coral" : "sky"}>
                  {sessionLabels[liveSession.status]}
                </Pill>
              )
            )}
          </View>

          {/* =================================================
           * YOUTUBE-AUFZEICHNUNG
           * ================================================= */}

          {hasYoutubeVideo && youtubeVideoId && youtubeUrl ? (
            <View style={styles.liveDetails}>

              {liveSession && (
                <View style={styles.liveTime}>
                  <AppIcon name="calendar" size={21} color={Palette.forest} />

                  <View style={styles.liveTimeCopy}>
                    <AppText variant="bodyStrong">
                      {formatDateTime(liveSession.starts_at)}
                    </AppText>

                    <AppText variant="small" color={Palette.inkSoft}>
                      Unterrichtstermin
                    </AppText>
                  </View>
                </View>
              )}

              {/* =============================================
               * YOUTUBE PLAYER
               *
               * Native:
               * react-native-youtube-iframe
               *
               * Web:
               * YoutubeVideoPlayer.web.tsx
               * ============================================= */}

              <View
                style={styles.youtubeContainer}
                onLayout={(event) => {
                  const nextWidth = Math.floor(event.nativeEvent.layout.width);

                  if (nextWidth > 0 && nextWidth !== youtubePlayerWidth) {
                    setYoutubePlayerWidth(nextWidth);
                  }
                }}
              >
                {youtubePlayerWidth > 0 && (
                  <YoutubeVideoPlayer
                    key={youtubeVideoId}
                    videoId={youtubeVideoId}
                    width={youtubePlayerWidth}
                    height={youtubePlayerHeight}
                    play={false}
                    initialPlayerParams={{
                      start: 0,
                    }}
                    onReady={() => {
                      setYoutubePlayerError(false);
                    }}
                    onChangeState={(state: any) => {
                      console.log("YouTube Player State:", state);

                      /*
                       * Später können wir hier
                       * den Video-Fortschritt
                       * mit der Datenbank verbinden.
                       */
                      if (state === "ended") {
                        console.log("YouTube-Video vollständig abgespielt.");
                      }
                    }}
                    onError={() => {
                      setYoutubePlayerError(true);
                    }}
                  />
                )}
              </View>

              {youtubePlayerError && (
                <View style={styles.youtubeError}>
                  <View style={styles.youtubeErrorCopy}>
                    <AppIcon name="video" size={19} color={Palette.forest} />

                    <View style={styles.youtubeErrorText}>
                      <AppText variant="bodyStrong">
                        Video konnte nicht eingebettet werden
                      </AppText>

                      <AppText variant="small" color={Palette.inkSoft}>
                        Möglicherweise hat der Videoanbieter die eingebettete
                        Wiedergabe deaktiviert.
                      </AppText>
                    </View>
                  </View>

                  <ActionButton
                    label="Auf YouTube öffnen"
                    icon="external"
                    compact
                    variant="secondary"
                    onPress={() => void Linking.openURL(youtubeUrl)}
                  />
                </View>
              )}
            </View>
          ) : liveSession ? (
            /* ===============================================
             * KEIN YOUTUBE:
             * ZOOM ANZEIGEN
             * =============================================== */

            <View style={styles.liveDetails}>
              <View style={styles.liveTime}>
                <AppIcon name="calendar" size={21} color={Palette.forest} />

                <View style={styles.liveTimeCopy}>
                  <AppText variant="bodyStrong">
                    {formatDateTime(liveSession.starts_at)}
                  </AppText>

                  <AppText variant="small" color={Palette.inkSoft}>
                    Ende: {formatDateTime(liveSession.ends_at)}
                  </AppText>
                </View>
              </View>

              <View style={styles.liveActions}>
                {liveSession.meeting_url &&
                  liveSession.status !== "completed" && (
                    <ActionButton
                      label={
                        liveSession.status === "live"
                          ? "Jetzt Zoom öffnen"
                          : "Zoom-Zugang öffnen"
                      }
                      icon="external"
                      onPress={() =>
                        void Linking.openURL(liveSession.meeting_url!)
                      }
                    />
                  )}

                {(lesson.replay_url || liveSession.replay_url) && (
                  <ActionButton
                    label="Aufzeichnung öffnen"
                    icon="play"
                    variant="secondary"
                    onPress={() =>
                      void Linking.openURL(
                        lesson.replay_url || liveSession.replay_url!,
                      )
                    }
                  />
                )}
              </View>
            </View>
          ) : (
            /* ===============================================
             * WEDER YOUTUBE NOCH ZOOM
             * =============================================== */

            <EmptyState
              compact
              icon="clock"
              title="Termin folgt"
              description="Der nächste Zoom-Termin wird hier zeitlich geplant angezeigt."
            />
          )}
        </Card>

        <View style={styles.connector} />

        {/* ==================================================
         * SCHRITT 3
         * ================================================== */}

        <Card tone="mint" style={styles.flowCard}>
          <View style={styles.flowHeader}>
            <View style={[styles.stepNumber, styles.stepQuiz]}>
              <AppIcon name="check" size={20} color={Palette.white} />
            </View>

            <View style={styles.flowHeading}>
              <AppText variant="label" color={Palette.muted}>
                Abschluss
              </AppText>

              <AppText variant="heading">Multiple-Choice-Quiz</AppText>
            </View>

            {progress?.status === "completed" && (
              <Pill tone="sun">Bestanden</Pill>
            )}
          </View>

          {quiz && questionCount > 0 ? (
            <View style={styles.quizDetails}>
              <View style={styles.quizCopy}>
                <AppText color={Palette.inkSoft}>
                  {quiz.description ??
                    "Überprüfe, was du aus der Vorlesung mitgenommen hast."}
                </AppText>

                <AppText variant="small" color={Palette.muted}>
                  {questionCount} Fragen · Bestehensgrenze{" "}
                  {quiz.passing_percent} %
                  {attempts.length > 0
                    ? ` · Bestes Ergebnis ${bestScore} %`
                    : ""}
                </AppText>
              </View>

              <ActionButton
                label={
                  attempts.length > 0 ? "Quiz erneut öffnen" : "Quiz starten"
                }
                icon="arrow"
                onPress={() => router.push(`/quiz/${lesson.id}` as Href)}
              />
            </View>
          ) : (
            <EmptyState
              compact
              icon="clock"
              title="Quiz wird vorbereitet"
              description="Das Quiz erscheint nach der Veröffentlichung auf einer eigenen Seite."
            />
          )}
        </Card>
      </View>
    </PageScaffold>
  );
}

/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xl,
  },

  progressCardCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
  },

  progressCopy: {
    flex: 1,
    alignItems: "flex-start",
    gap: Space.md,
  },

  flow: {
    alignItems: "stretch",
  },

  flowCard: {
    gap: Space.xl,
  },

  flowHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.md,
  },

  flowHeading: {
    flex: 1,
    minWidth: 190,
    gap: 2,
  },

  stepNumber: {
    width: 46,
    height: 46,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },

  stepStart: {
    backgroundColor: Palette.sunSoft,
  },

  stepLive: {
    backgroundColor: "rgba(255,255,255,0.62)",
  },

  stepReader: {
    backgroundColor: Palette.skySoft,
  },

  stepQuiz: {
    backgroundColor: Palette.forest,
  },

  connector: {
    width: 2,
    height: 26,
    alignSelf: "flex-start",
    marginLeft: 45,
    backgroundColor: Palette.line,
  },

  liveDetails: {
    gap: Space.lg,
  },

  liveTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },

  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },

  liveTimeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  liveActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },

  pdfActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },

  /* ======================================================
   * YOUTUBE
   * ====================================================== */

  youtubeContainer: {
    width: "100%",
    overflow: "hidden",
    borderRadius: Radius.medium,
    backgroundColor: "#000000",
  },

  youtubeError: {
    width: "100%",
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.medium,
    backgroundColor: Palette.coralSoft,
  },

  youtubeErrorCopy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },

  youtubeErrorText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  /* ======================================================
   * QUIZ
   * ====================================================== */

  quizDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.lg,
  },

  quizCopy: {
    flex: 1,
    flexBasis: 230,
    minWidth: 0,
    gap: Space.sm,
  },
});
