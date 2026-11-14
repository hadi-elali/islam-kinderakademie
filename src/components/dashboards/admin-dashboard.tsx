import { Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { AppIcon, AppIconName } from "@/components/ui/app-icon";
import { DataLoading, ErrorBanner } from "@/components/ui/data-ui";
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  Field,
  PageScaffold,
  Pill,
  ProgressBar,
  SectionHeader,
  StatCard,
} from "@/components/ui/primitives";
import { Layout, Palette, Radius, Space } from "@/constants/design";
import { useAcademyData } from "@/context/academy-data-context";
import { setQuizRelease } from "@/lib/academy-api";
import { supabase } from "@/lib/supabase";
import type {
  MonthlyPaymentRow,
  PaymentAgreementRow,
} from "@/types/database";
import { confirmAction } from "@/utils/feedback";
import { apiErrorMessage, formatDateTime } from "@/utils/format";

/* ============================================================
 * ADMIN ACTIONS
 * ============================================================ */

const adminActions: {
  label: string;
  description: string;
  icon: AppIconName;
  href: string;
}[] = [
  {
    label: "Konten & Rollen",
    description: "Eltern, Lehrkräfte und Admins",
    icon: "profile",
    href: "/konten",
  },
  {
    label: "Curriculum & Altersgruppen",
    description: "Altersgruppen, Jahre und Lernreisen",
    icon: "curriculum",
    href: "/curriculum",
  },
  {
    label: "Lektionen",
    description: "Inhalte und Veröffentlichungen",
    icon: "lessons",
    href: "/lektionen",
  },
  {
    label: "Zeitgruppen",
    description: "Unterrichtszeiten und Freigaben",
    icon: "groups",
    href: "/gruppen",
  },
  {
    label: "Kalender",
    description: "Live-Unterricht verwalten",
    icon: "calendar",
    href: "/kalender",
  },
  {
    label: "Mitteilungen",
    description: "Familien informieren",
    icon: "messages",
    href: "/mitteilungen",
  },
  {
    label: "Medien",
    description: "Privaten Storage verwalten",
    icon: "media",
    href: "/medien",
  },
  {
    label: "Abzeichen",
    description: "Persönliche Ziele definieren",
    icon: "trophy",
    href: "/abzeichen",
  },
  {
    label: "Abgaben",
    description: "Interaktionen kontrollieren",
    icon: "check",
    href: "/abgaben",
  },
];

/* ============================================================
 * HELPERS
 * ============================================================ */

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/* ============================================================
 * ADMIN DASHBOARD
 * ============================================================ */

export function AdminDashboard() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const stacked = width < Layout.contentStackBreakpoint;

  const { data, isLoading, error, refresh, execute } = useAcademyData();

  const [quizSearch, setQuizSearch] = useState("");

  const [expandedLessonIds, setExpandedLessonIds] = useState<number[]>([]);

  const [quizReleaseAction, setQuizReleaseAction] = useState<number | null>(
    null,
  );

  const [quizActionError, setQuizActionError] = useState<string | null>(null);

  /* ==========================================================
   * PAYMENT STATE
   * ========================================================== */

  const [paymentAgreements, setPaymentAgreements] = useState<
    PaymentAgreementRow[]
  >([]);

  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPaymentRow[]>(
    [],
  );

  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  /* ==========================================================
   * EXISTING DASHBOARD DATA
   * ========================================================== */

  const adminIds = new Set(
    data.userRoles
      .filter((row) => row.role === "admin")
      .map((row) => row.profile_id),
  );

  const teacherIds = new Set(
    data.userRoles
      .filter((row) => row.role === "teacher")
      .map((row) => row.profile_id),
  );

  const staffIds = new Set([...adminIds, ...teacherIds]);

  const parentCount = data.profiles.filter(
    (entry) => !staffIds.has(entry.id),
  ).length;

  const activeYear = data.academyYears.find((year) => year.is_active);

  const publishedLessons = data.lessons.filter(
    (lesson) => lesson.status === "published",
  ).length;

  const scheduledSessions = data.liveSessions.filter(
    (session) => session.status === "scheduled" || session.status === "live",
  ).length;

  const pendingTimeGroupRequests = data.groupMembers.filter(
    (membership) => membership.membership_status === "pending",
  ).length;

  const completedProgress = data.lessonProgress.filter(
    (row) => row.status === "completed",
  ).length;

  const totalProgress = data.lessonProgress.length;

  const completionRate = totalProgress
    ? Math.round((completedProgress / totalProgress) * 100)
    : 0;

  const latestProfiles = [...data.profiles]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const checks = [
    {
      label: "Aktives Akademiejahr",
      done: Boolean(activeYear),
      href: "/curriculum",
    },
    {
      label: "Mindestens eine Lehrkraft",
      done: teacherIds.size > 0,
      href: "/konten",
    },
    {
      label: "Veröffentlichte Lektionen",
      done: publishedLessons > 0,
      href: "/lektionen",
    },
    {
      label: "Eingerichtete Zeitgruppen",
      done: data.groups.length > 0,
      href: "/gruppen",
    },
    {
      label: "Geplanter Live-Unterricht",
      done: scheduledSessions > 0,
      href: "/kalender",
    },
  ];

  /* ==========================================================
   * LOAD PAYMENT DATA
   * ========================================================== */

  const fetchPaymentData = useCallback(async () => {
    if (!supabase) {
      return {
        agreements: [] as PaymentAgreementRow[],
        payments: [] as MonthlyPaymentRow[],
      };
    }

    const [agreementsResult, paymentsResult] = await Promise.all([
      supabase
        .from("payment_agreements")
        .select(
          `
              id,
              auth_user_id,
              payment_method,
              payer_name,
              monthly_amount_cents,
              payment_accepted,
              accepted_at,
              agreement_status,
              created_at
            `,
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("monthly_payments")
        .select(
          `
              id,
              payment_agreement_id,
              billing_month,
              amount_cents,
              status,
              paid_at
            `,
        )
        .order("billing_month", {
          ascending: false,
        }),
    ]);

    if (agreementsResult.error) {
      throw agreementsResult.error;
    }

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    return {
      agreements: (agreementsResult.data ?? []) as PaymentAgreementRow[],
      payments: (paymentsResult.data ?? []) as MonthlyPaymentRow[],
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initializePaymentData() {
      try {
        const result = await fetchPaymentData();

        if (ignore) {
          return;
        }

        setPaymentAgreements(result.agreements);
        setMonthlyPayments(result.payments);
        setPaymentsError(null);
      } catch (reason) {
        if (ignore) {
          return;
        }

        const message =
          reason && typeof reason === "object" && "message" in reason
            ? String(reason.message)
            : "Die Zahlungsdaten konnten nicht geladen werden.";

        setPaymentsError(message);
      } finally {
        if (!ignore) {
          setPaymentsLoading(false);
        }
      }
    }

    void initializePaymentData();

    return () => {
      ignore = true;
    };
  }, [fetchPaymentData]);

  const refreshPaymentData = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);

    try {
      const result = await fetchPaymentData();

      setPaymentAgreements(result.agreements);
      setMonthlyPayments(result.payments);
    } catch (reason) {
      const message =
        reason && typeof reason === "object" && "message" in reason
          ? String(reason.message)
          : "Die Zahlungsdaten konnten nicht geladen werden.";

      setPaymentsError(message);
    } finally {
      setPaymentsLoading(false);
    }
  }, [fetchPaymentData]);

  /* ==========================================================
   * PAYMENT CALCULATIONS
   * ========================================================== */

  const activeAgreements = paymentAgreements.filter(
    (agreement) => agreement.agreement_status === "active",
  );

  const paypalCount = activeAgreements.filter(
    (agreement) => agreement.payment_method === "paypal",
  ).length;

  const bankTransferCount = activeAgreements.filter(
    (agreement) => agreement.payment_method === "bank_transfer",
  ).length;

  const monthlyRevenueCents = activeAgreements.reduce(
    (total, agreement) => total + agreement.monthly_amount_cents,
    0,
  );

  const pendingPayments = monthlyPayments.filter(
    (payment) => payment.status === "pending",
  );

  const overduePayments = monthlyPayments.filter(
    (payment) => payment.status === "overdue",
  );

  const latestPaymentAgreements = paymentAgreements.slice(0, 5);

  /* ==========================================================
   * QUIZ FILTER
   * ========================================================== */

  const filteredQuizLessons = useMemo(() => {
    const query = quizSearch.trim().toLocaleLowerCase("de-DE");

    return [...data.lessons]
      .filter((lesson) => {
        if (!query) {
          return true;
        }

        const journey = data.journeys.find(
          (entry) => entry.id === lesson.learning_journey_id,
        );

        return (
          lesson.title.toLocaleLowerCase("de-DE").includes(query) ||
          journey?.title.toLocaleLowerCase("de-DE").includes(query)
        );
      })
      .sort((a, b) => {
        const aHasQuiz = data.quizzes.some((quiz) => quiz.lesson_id === a.id);

        const bHasQuiz = data.quizzes.some((quiz) => quiz.lesson_id === b.id);

        return Number(bHasQuiz) - Number(aHasQuiz) || a.position - b.position;
      });
  }, [data.journeys, data.lessons, data.quizzes, quizSearch]);

  const visibleQuizLessons = filteredQuizLessons.slice(0, 8);

  /* ==========================================================
   * ACTIONS
   * ========================================================== */

  function openQuizEditor(lessonId: number) {
    router.push(
      `/quiz-bearbeiten?lessonId=${lessonId}&returnTo=dashboard` as Href,
    );
  }

  function openTopicEditor(lessonId: number) {
    router.push(`/lektion-neu?lessonId=${lessonId}&returnTo=dashboard` as Href);
  }

  function toggleLessonDetails(lessonId: number) {
    setExpandedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  }

  async function toggleQuizRelease(
    quizId: number,
    quizTitle: string,
    isReleased: boolean,
  ) {
    if (isReleased) {
      const confirmed = await confirmAction(
        "Quiz sperren?",
        `„${quizTitle}“ ist danach für Familien nicht mehr sichtbar.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setQuizReleaseAction(quizId);
    setQuizActionError(null);

    try {
      await execute(() => setQuizRelease(quizId, !isReleased), ['quizzes']);
    } catch (reason) {
      setQuizActionError(apiErrorMessage(reason));
    } finally {
      setQuizReleaseAction(null);
    }
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <PageScaffold
      eyebrow="Administration"
      title="Admin-Dashboard"
      description="Konten, Rollen, Zahlungen, Akademiestruktur und Plattformaktivität an einem Ort."
      action={
        <ActionButton
          label="Konten verwalten"
          icon="profile"
          onPress={() => router.push("/konten")}
        />
      }
    >
      {/* ======================================================
       * GENERAL ERRORS
       * ====================================================== */}

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      {/* ======================================================
       * MAIN STATS
       * ====================================================== */}

      <View style={styles.statsGrid}>
        <StatCard
          icon="profile"
          value={String(data.profiles.length)}
          label="Konten"
          tone="mint"
        />

        <StatCard
          icon="groups"
          value={String(staffIds.size)}
          label="Teamkonten"
          tone="sky"
        />

        <StatCard
          icon="children"
          value={String(data.children.length)}
          label="Kinderprofile"
          tone="sun"
        />

        <StatCard
          icon="clock"
          value={String(pendingTimeGroupRequests)}
          label="Zeitgruppenanfragen"
          tone="sun"
        />

        <StatCard
          icon="lessons"
          value={String(publishedLessons)}
          label="Veröffentlichte Lektionen"
          tone="coral"
        />
      </View>

      {pendingTimeGroupRequests > 0 && (
        <Card tone="sun" style={styles.timeGroupRequestCard}>
          <View style={styles.timeGroupRequestIcon}>
            <AppIcon name="clock" size={23} color={Palette.forest} />
          </View>
          <View style={styles.timeGroupRequestCopy}>
            <AppText variant="heading">
              {pendingTimeGroupRequests}{" "}
              {pendingTimeGroupRequests === 1
                ? "Zeitgruppenanfrage wartet"
                : "Zeitgruppenanfragen warten"}
            </AppText>
            <AppText color={Palette.inkSoft}>
              Öffne die Zeitgruppenverwaltung, um Kinder freizuschalten oder
              Anfragen abzulehnen.
            </AppText>
          </View>
          <ActionButton
            label="Anfragen prüfen"
            icon="arrow"
            onPress={() => router.push("/gruppen")}
          />
        </Card>
      )}

      {/* ======================================================
       * PAYMENTS
       * ====================================================== */}

      {paymentsError && (
        <ErrorBanner
          message={paymentsError}
          onRetry={() => void refreshPaymentData()}
        />
      )}

      <SectionHeader
        title="Zahlungen & Monatsbeiträge"
        description={`${paypalCount} PayPal · ${bankTransferCount} Banküberweisung`}
        action={
          <ActionButton
            label={paymentsLoading ? "Wird aktualisiert …" : "Aktualisieren"}
            compact
            variant="quiet"
            disabled={paymentsLoading}
            onPress={() => void refreshPaymentData()}
          />
        }
      />

      <View style={styles.statsGrid}>
        <StatCard
          icon="profile"
          value={String(activeAgreements.length)}
          label="Aktive Beiträge"
          tone="mint"
        />

        <StatCard
          icon="calendar"
          value={formatEuro(monthlyRevenueCents)}
          label="Soll pro Monat"
          tone="sky"
        />

        <StatCard
          icon="clock"
          value={String(pendingPayments.length)}
          label="Offene Zahlungen"
          tone="sun"
        />

        <StatCard
          icon="messages"
          value={String(overduePayments.length)}
          label="Überfällig"
          tone="coral"
        />
      </View>

      <Card>
        <SectionHeader
          title="Zahlungsvereinbarungen"
          description="Die zuletzt registrierten Familienkonten"
        />

        {paymentsLoading && latestPaymentAgreements.length === 0 ? (
          <DataLoading label="Zahlungsdaten werden geladen …" />
        ) : latestPaymentAgreements.length === 0 ? (
          <EmptyState
            compact
            icon="profile"
            title="Noch keine Zahlungsvereinbarungen"
            description="Neue Registrierungen mit bestätigtem Monatsbeitrag erscheinen automatisch hier."
          />
        ) : (
          <View style={styles.accountList}>
            {latestPaymentAgreements.map((agreement) => {
              const account = data.profiles.find(
                (profile) => profile.auth_user_id === agreement.auth_user_id,
              );

              const paymentMethod =
                agreement.payment_method === "paypal"
                  ? "PayPal"
                  : "Banküberweisung";

              return (
                <View key={agreement.id} style={styles.paymentRow}>
                  <View style={styles.accountAvatar}>
                    <AppText variant="bodyStrong">
                      {(account?.display_name ?? "?").charAt(0).toUpperCase()}
                    </AppText>
                  </View>

                  <View style={styles.paymentAccountCopy}>
                    <AppText variant="bodyStrong">
                      {account?.display_name ?? "Unbekanntes Konto"}
                    </AppText>

                    <AppText variant="small" color={Palette.inkSoft}>
                      Zahlung über:{" "}
                      {agreement.payer_name ??
                        "Nicht angegeben (Bestandskonto)"}
                    </AppText>

                    <AppText variant="small" color={Palette.muted}>
                      Zustimmung am {formatDateTime(agreement.accepted_at)}
                    </AppText>
                  </View>

                  <View style={styles.paymentAmount}>
                    <AppText variant="bodyStrong" color={Palette.forest}>
                      {formatEuro(agreement.monthly_amount_cents)}
                    </AppText>

                    <AppText variant="small" color={Palette.muted}>
                      pro Monat
                    </AppText>
                  </View>

                  <View style={styles.paymentStatus}>
                    <Pill
                      tone={
                        agreement.payment_method === "paypal" ? "sky" : "sun"
                      }
                    >
                      {paymentMethod}
                    </Pill>

                    <Pill
                      tone={
                        agreement.agreement_status === "active"
                          ? "mint"
                          : "neutral"
                      }
                    >
                      {agreement.agreement_status === "active"
                        ? "Aktiv"
                        : "Beendet"}
                    </Pill>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* ======================================================
       * ADMINISTRATION
       * ====================================================== */}

      <SectionHeader
        title="Administration"
        description="Alle zentralen Arbeitsbereiche"
      />

      <View style={styles.quickGrid}>
        {adminActions.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as Href)}
            style={({ pressed }) => [
              styles.quickPressable,
              pressed && styles.pressed,
            ]}
          >
            <Card style={styles.quickCard}>
              <View style={styles.quickIcon}>
                <AppIcon name={item.icon} size={22} color={Palette.forest} />
              </View>

              <View style={styles.quickCopy}>
                <AppText variant="bodyStrong">{item.label}</AppText>

                <AppText variant="small" color={Palette.inkSoft}>
                  {item.description}
                </AppText>
              </View>

              <AppIcon name="arrow" size={18} color={Palette.muted} />
            </Card>
          </Pressable>
        ))}
      </View>

      {/* ======================================================
       * QUIZZES
       * ====================================================== */}

      <Card>
        <SectionHeader
          title="Themen und Multiple-Choice-Quizze"
          description="Quizze anlegen, bearbeiten und für Familien freigeben."
          action={
            <ActionButton
              label="Alle Lektionen"
              compact
              variant="quiet"
              onPress={() => router.push("/lektionen")}
            />
          }
        />

        {quizActionError && <ErrorBanner message={quizActionError} />}

        <View style={styles.quizToolbar}>
          <View style={styles.quizSearch}>
            <Field
              label="Thema suchen"
              placeholder="Titel oder Lernreise"
              value={quizSearch}
              onChangeText={setQuizSearch}
            />
          </View>

          <Pill>{filteredQuizLessons.length} Themen</Pill>
        </View>

        {isLoading && data.lessons.length === 0 ? (
          <DataLoading label="Lektionen werden geladen …" />
        ) : visibleQuizLessons.length === 0 ? (
          <EmptyState
            compact
            icon="lessons"
            title={
              data.lessons.length === 0
                ? "Noch keine Lektionen"
                : "Keine Lektion gefunden"
            }
            description={
              data.lessons.length === 0
                ? "Lege zuerst eine Lektion an, bevor du ein Quiz erstellst."
                : "Ändere den Suchbegriff."
            }
            actionLabel={
              data.lessons.length === 0 ? "Lektion anlegen" : undefined
            }
            onAction={
              data.lessons.length === 0
                ? () => router.push("/lektion-neu")
                : undefined
            }
          />
        ) : (
          <View style={styles.quizList}>
            {visibleQuizLessons.map((lesson) => {
              const isExpanded = expandedLessonIds.includes(lesson.id);

              const journey = data.journeys.find(
                (entry) => entry.id === lesson.learning_journey_id,
              );

              const quiz = data.quizzes.find(
                (entry) => entry.lesson_id === lesson.id,
              );

              const questionCount = quiz
                ? data.quizQuestions.filter(
                    (question) => question.quiz_id === quiz.id,
                  ).length
                : 0;

              const canReleaseQuiz =
                lesson.status === "published" && lesson.is_released;

              return (
                <View key={lesson.id} style={styles.quizRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${lesson.title} ${
                      isExpanded ? "einklappen" : "ausklappen"
                    }`}
                    accessibilityState={{
                      expanded: isExpanded,
                    }}
                    onPress={() => toggleLessonDetails(lesson.id)}
                    style={({ pressed }) => [
                      styles.quizToggle,
                      pressed && styles.quizTogglePressed,
                    ]}
                  >
                    <View style={styles.quizIcon}>
                      <AppIcon
                        name={quiz ? "check" : "add"}
                        size={19}
                        color={Palette.forest}
                      />
                    </View>

                    <View style={styles.quizCopy}>
                      <AppText variant="bodyStrong">{lesson.title}</AppText>

                      <AppText
                        variant="small"
                        color={Palette.muted}
                        numberOfLines={1}
                      >
                        {journey?.title ?? "Unbekannte Lernreise"}
                      </AppText>
                    </View>

                    <View style={styles.quizStatus}>
                      <Pill tone={quiz ? "sky" : "neutral"}>
                        {quiz
                          ? `${questionCount} ${
                              questionCount === 1 ? "Frage" : "Fragen"
                            }`
                          : "Kein Quiz"}
                      </Pill>

                      {quiz && (
                        <Pill tone={quiz.is_published ? "mint" : "sun"}>
                          {quiz.is_published ? "Freigegeben" : "Gesperrt"}
                        </Pill>
                      )}
                    </View>

                    <View style={styles.expandControl}>
                      <AppText variant="small" color={Palette.forest}>
                        {isExpanded ? "Schließen" : "Öffnen"}
                      </AppText>

                      <AppIcon
                        name="chevron"
                        size={20}
                        color={Palette.forest}
                        style={isExpanded ? styles.chevronExpanded : undefined}
                      />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.topicActions}>
                      <ActionButton
                        label="Thema bearbeiten"
                        icon="edit"
                        compact
                        variant="secondary"
                        onPress={() => openTopicEditor(lesson.id)}
                      />

                      <ActionButton
                        label={quiz ? "Quiz bearbeiten" : "Quiz anlegen"}
                        icon={quiz ? "edit" : "add"}
                        compact
                        variant={quiz ? "secondary" : "primary"}
                        onPress={() => openQuizEditor(lesson.id)}
                      />

                      {quiz && (
                        <ActionButton
                          label={
                            quizReleaseAction === quiz.id
                              ? "Freigabe wird geändert …"
                              : quiz.is_published
                                ? "Quiz sperren"
                                : "Quiz freigeben"
                          }
                          icon={quiz.is_published ? "close" : "check"}
                          compact
                          disabled={
                            quizReleaseAction !== null ||
                            (!quiz.is_published && !canReleaseQuiz)
                          }
                          onPress={() =>
                            void toggleQuizRelease(
                              quiz.id,
                              quiz.title,
                              quiz.is_published,
                            )
                          }
                        />
                      )}

                      {quiz && !quiz.is_published && !canReleaseQuiz && (
                        <AppText
                          variant="small"
                          color={Palette.muted}
                          style={styles.quizReleaseHint}
                        >
                          Gib zuerst die veröffentlichte Lektion frei.
                        </AppText>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {filteredQuizLessons.length > visibleQuizLessons.length && (
              <AppText
                variant="small"
                color={Palette.muted}
                style={styles.quizHint}
              >
                Weitere Lektionen findest du über die Suche oder unter „Alle
                Lektionen“.
              </AppText>
            )}
          </View>
        )}
      </Card>

      {/* ======================================================
       * PLATFORM STATUS
       * ====================================================== */}

      <View style={[styles.mainGrid, stacked && styles.column]}>
        <Card style={[styles.healthCard, stacked && styles.fullWidth]}>
          <SectionHeader
            title="Plattformstatus"
            description={`${checks.filter((item) => item.done).length} von ${checks.length} Punkten erfüllt`}
          />

          <View style={styles.checkList}>
            {checks.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href as Href)}
                style={({ pressed }) => [
                  styles.checkRow,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[styles.checkIcon, item.done && styles.checkIconDone]}
                >
                  <AppIcon
                    name={item.done ? "check" : "clock"}
                    size={18}
                    color={item.done ? Palette.white : Palette.forest}
                  />
                </View>

                <AppText variant="bodyStrong" style={styles.checkLabel}>
                  {item.label}
                </AppText>

                <Pill tone={item.done ? "mint" : "sun"}>
                  {item.done ? "Bereit" : "Offen"}
                </Pill>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card
          tone="dark"
          style={[styles.systemCard, stacked && styles.fullWidth]}
        >
          <View style={styles.systemTop}>
            <View style={styles.systemIcon}>
              <AppIcon name="settings" size={24} color={Palette.sun} />
            </View>

            <Pill tone="mint">Supabase verbunden</Pill>
          </View>

          <View style={styles.systemCopy}>
            <AppText variant="heading" color={Palette.white}>
              {activeYear?.title ?? "Kein aktives Akademiejahr"}
            </AppText>

            <AppText color="#CDE0D7">
              {data.groups.length} Zeitgruppen · {scheduledSessions} aktive Termine
              · {pendingTimeGroupRequests} offene Freigaben · {data.messages.length}{" "}
              Mitteilungen
            </AppText>
          </View>

          <View style={styles.progressCopy}>
            <View style={styles.progressLine}>
              <AppText variant="small" color="#CDE0D7">
                Abgeschlossene Lernstände
              </AppText>

              <AppText variant="small" color={Palette.white}>
                {completionRate}%
              </AppText>
            </View>

            <ProgressBar
              value={completionRate}
              color={Palette.sun}
              trackColor="rgba(255,255,255,0.13)"
            />
          </View>
        </Card>
      </View>

      {/* ======================================================
       * NEWEST ACCOUNTS
       * ====================================================== */}

      <Card>
        <SectionHeader
          title="Neueste Konten"
          description={`${parentCount} Elternkonten · ${teacherIds.size} Lehrkräfte · ${adminIds.size} Admins`}
          action={
            <ActionButton
              label="Alle Konten"
              compact
              variant="quiet"
              onPress={() => router.push("/konten")}
            />
          }
        />

        {isLoading && latestProfiles.length === 0 ? (
          <DataLoading />
        ) : latestProfiles.length === 0 ? (
          <EmptyState
            compact
            icon="profile"
            title="Noch keine Konten"
            description="Registrierte Profile erscheinen automatisch hier."
          />
        ) : (
          <View style={styles.accountList}>
            {latestProfiles.map((account) => {
              const role = adminIds.has(account.id)
                ? "Admin"
                : teacherIds.has(account.id)
                  ? "Lehrkraft"
                  : "Elternkonto";

              return (
                <View key={account.id} style={styles.accountRow}>
                  <View style={styles.accountAvatar}>
                    <AppText variant="bodyStrong">
                      {account.display_name.charAt(0).toUpperCase()}
                    </AppText>
                  </View>

                  <View style={styles.quickCopy}>
                    <AppText variant="bodyStrong">
                      {account.display_name}
                    </AppText>

                    <AppText variant="small" color={Palette.muted}>
                      Erstellt am {formatDateTime(account.created_at)}
                    </AppText>
                  </View>

                  <Pill
                    tone={
                      role === "Admin"
                        ? "coral"
                        : role === "Lehrkraft"
                          ? "sky"
                          : "mint"
                    }
                  >
                    {role}
                  </Pill>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </PageScaffold>
  );
}

/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.lg,
  },

  timeGroupRequestCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.lg,
  },

  timeGroupRequestIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    backgroundColor: Palette.sunSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  timeGroupRequestCopy: {
    flex: 1,
    flexBasis: 280,
    minWidth: 0,
    gap: Space.xs,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
  },

  quickPressable: {
    flex: 1,
    minWidth: 230,
  },

  quickCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.lg,
  },

  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: Palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },

  quickCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  /* ========================================================
   * PAYMENTS
   * ======================================================== */

  paymentRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    paddingVertical: Space.md,
  },

  paymentAccountCopy: {
    flex: 1,
    minWidth: 190,
    gap: 2,
  },

  paymentAmount: {
    minWidth: 100,
    gap: 2,
    alignItems: "flex-start",
  },

  paymentStatus: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.sm,
  },

  /* ========================================================
   * QUIZ
   * ======================================================== */

  quizToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: Space.lg,
    marginTop: Space.lg,
  },

  quizSearch: {
    flex: 1,
    minWidth: 240,
  },

  quizList: {
    marginTop: Space.lg,
  },

  quizRow: {
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },

  quizToggle: {
    width: "100%",
    minHeight: 68,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.md,
    borderRadius: Radius.medium,
    paddingVertical: Space.sm,
  },

  quizTogglePressed: {
    backgroundColor: Palette.cream,
  },

  quizIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },

  quizCopy: {
    flex: 1,
    flexBasis: 210,
    minWidth: 0,
    gap: 2,
  },

  quizStatus: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },

  expandControl: {
    minWidth: 94,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: Radius.small,
    backgroundColor: Palette.mint,
    paddingHorizontal: Space.sm,
  },

  chevronExpanded: {
    transform: [
      {
        rotate: "90deg",
      },
    ],
  },

  topicActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    paddingLeft: 40 + Space.md,
    paddingRight: Space.sm,
    paddingBottom: Space.md,
  },

  quizReleaseHint: {
    flexBasis: "100%",
  },

  quizHint: {
    paddingTop: Space.md,
  },

  /* ========================================================
   * PLATFORM
   * ======================================================== */

  mainGrid: {
    flexDirection: "row",
    gap: Space.lg,
    alignItems: "stretch",
  },

  column: {
    flexDirection: "column",
  },

  fullWidth: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    flexBasis: "auto",
  },

  healthCard: {
    flex: 1.25,
    minWidth: 0,
  },

  systemCard: {
    flex: 0.75,
    minWidth: 280,
    justifyContent: "space-between",
    gap: Space.xl,
  },

  systemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },

  systemIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  systemCopy: {
    gap: Space.sm,
  },

  progressCopy: {
    gap: Space.sm,
  },

  progressLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  checkList: {
    marginTop: Space.lg,
  },

  checkRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    paddingVertical: Space.sm,
  },

  checkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },

  checkIconDone: {
    backgroundColor: Palette.forest,
  },

  checkLabel: {
    flex: 1,
  },

  /* ========================================================
   * ACCOUNTS
   * ======================================================== */

  accountList: {
    marginTop: Space.lg,
  },

  accountRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    paddingVertical: Space.sm,
  },

  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.medium,
    backgroundColor: Palette.sun,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },
});
