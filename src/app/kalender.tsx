import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { ChoiceChips, DataLoading, ErrorBanner, FormDialog, RowActions } from '@/components/ui/data-ui';
import { DateField, TimeField } from '@/components/ui/date-time-fields';
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  Field,
  PageScaffold,
  Pill,
  SectionHeader,
} from '@/components/ui/primitives';
import { Layout, Palette, Radius, Space } from '@/constants/design';
import { useAcademy } from '@/context/academy-context';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { createRecord, deleteRecord, updateRecord } from '@/lib/academy-api';
import type { LiveSessionRow, LiveSessionStatus } from '@/types/database';
import { confirmAction } from '@/utils/feedback';
import {
  apiErrorMessage,
  combineLocalDateTime,
  formatDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from '@/utils/format';

const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type SessionForm = {
  lessonId: number | null;
  groupId: number | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  replayUrl: string;
  status: LiveSessionStatus;
};

export default function CalendarScreen() {
  const { activeRole, selectedChildId } = useAcademy();
  const isTeam = activeRole === 'team';
  const { profile } = useAuth();
  const { data, isLoading, error: loadError, refresh, execute } = useAcademyData();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSessionRow | null>(null);
  const [form, setForm] = useState<SessionForm>({ lessonId: null, groupId: null, title: '', date: '', startTime: '17:00', endTime: '18:00', meetingUrl: '', replayUrl: '', status: 'scheduled' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const stacked = width < Layout.contentStackBreakpoint;
  const cells = useMemo(() => createMonthCells(visibleMonth), [visibleMonth]);
  const monthTitle = visibleMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const accessibleSessions = useMemo(() => {
    if (isTeam) return data.liveSessions;

    const ownChildIds = new Set(
      data.children
        .filter(
          (child) =>
            child.parent_profile_id === profile?.id &&
            (activeRole !== 'child' || child.id === selectedChildId)
        )
        .map((child) => child.id)
    );
    const activeYearIds = new Set(
      data.academyYears
        .filter((year) => year.is_active)
        .map((year) => year.id)
    );
    const approvedGroups = data.groupMembers
      .filter(
        (membership) =>
          ownChildIds.has(membership.child_id) &&
          membership.membership_status === 'approved'
      )
      .map((membership) =>
        data.groups.find(
          (group) =>
            group.id === membership.group_id &&
            activeYearIds.has(group.academy_year_id)
        )
      )
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
    const approvedGroupIds = new Set(approvedGroups.map((group) => group.id));
    const approvedAgeYearKeys = new Set(
      approvedGroups.map(
        (group) => `${group.age_group_id}:${group.academy_year_id}`
      )
    );
    const journeyIds = new Set(
      data.journeys
        .filter((journey) =>
          approvedAgeYearKeys.has(
            `${journey.age_group_id}:${journey.academy_year_id}`
          )
        )
        .map((journey) => journey.id)
    );
    const lessonIds = new Set(
      data.lessons
        .filter((lesson) => journeyIds.has(lesson.learning_journey_id))
        .map((lesson) => lesson.id)
    );

    return data.liveSessions.filter(
      (session) =>
        lessonIds.has(session.lesson_id) &&
        (session.group_id === null || approvedGroupIds.has(session.group_id))
    );
  }, [
    data.academyYears,
    data.children,
    data.groupMembers,
    data.groups,
    data.journeys,
    data.lessons,
    data.liveSessions,
    activeRole,
    isTeam,
    profile?.id,
    selectedChildId,
  ]);
  const visibleSessions = useMemo(
    () =>
      accessibleSessions.filter((session) => {
        const date = new Date(session.starts_at);
        return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth();
      }),
    [accessibleSessions, visibleMonth]
  );
  const selectedLesson = data.lessons.find((lesson) => lesson.id === form.lessonId);
  const selectedJourney = data.journeys.find(
    (journey) => journey.id === selectedLesson?.learning_journey_id
  );
  const compatibleTimeGroups = data.groups.filter(
    (group) =>
      group.age_group_id === selectedJourney?.age_group_id &&
      group.academy_year_id === selectedJourney?.academy_year_id
  );

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openSession(session?: LiveSessionRow) {
    const today = new Date();
    const defaultDate =
      visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() === today.getMonth()
        ? localDateKey(today)
        : localDateKey(visibleMonth);
    setEditing(session ?? null);
    setForm(
      session
        ? {
            lessonId: session.lesson_id,
            groupId: session.group_id,
            title: session.title ?? '',
            date: toLocalDateInput(session.starts_at),
            startTime: toLocalTimeInput(session.starts_at),
            endTime: toLocalTimeInput(session.ends_at),
            meetingUrl: session.meeting_url ?? '',
            replayUrl: session.replay_url ?? '',
            status: session.status,
          }
        : {
            lessonId: data.lessons[0]?.id ?? null,
            groupId: null,
            title: '',
            date: defaultDate,
            startTime: '17:00',
            endTime: '18:00',
            meetingUrl: '',
            replayUrl: '',
            status: 'scheduled',
          }
    );
    setFormError(null);
    setDialogOpen(true);
  }

  async function save() {
    const startsAt = combineLocalDateTime(form.date, form.startTime);
    const endsAt = combineLocalDateTime(form.date, form.endTime);
    if (!form.lessonId || !startsAt || !endsAt || endsAt <= startsAt) {
      setFormError('Lektion, Datum sowie gültige Start- und Endzeiten sind erforderlich.');
      return;
    }
    if (
      form.groupId &&
      !compatibleTimeGroups.some((group) => group.id === form.groupId)
    ) {
      setFormError('Die Zeitgruppe muss zur Altersgruppe der Lektion gehören.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const values = {
        lesson_id: form.lessonId,
        group_id: form.groupId,
        title: form.title.trim() || null,
        starts_at: startsAt,
        ends_at: endsAt,
        meeting_url: form.meetingUrl.trim() || null,
        replay_url: form.replayUrl.trim() || null,
        status: form.status,
      };
      await execute(() =>
        editing
          ? updateRecord('live_sessions', editing.id, values)
          : createRecord('live_sessions', values), ['liveSessions']
      );
      setDialogOpen(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove(session: LiveSessionRow) {
    const confirmed = await confirmAction('Termin löschen?', 'Der Live-Termin wird dauerhaft aus dem Kalender entfernt.');
    if (confirmed) await execute(() => deleteRecord('live_sessions', session.id), ['liveSessions']);
  }

  return (
    <PageScaffold
      eyebrow="Planung"
      title="Kalender"
      description="Live-Unterricht, Replays und besondere Termine werden hier gebündelt."
      action={isTeam ? <ActionButton label="Termin anlegen" icon="add" disabled={data.lessons.length === 0} onPress={() => openSession()} /> : undefined}>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void refresh()} />}
      <View style={[styles.layout, stacked && styles.column]}>
        <Card style={[styles.calendarCard, stacked && styles.fullWidth]}>
          <View style={styles.calendarHeader}>
            <Pressable accessibilityLabel="Vorheriger Monat" onPress={() => changeMonth(-1)} style={styles.arrowButton}>
              <View style={styles.arrowLeft}><AppIcon name="arrow" size={19} color={Palette.ink} /></View>
            </Pressable>
            <AppText variant="heading" style={styles.monthTitle}>{capitalize(monthTitle)}</AppText>
            <Pressable accessibilityLabel="Nächster Monat" onPress={() => changeMonth(1)} style={styles.arrowButton}>
              <AppIcon name="arrow" size={19} color={Palette.ink} />
            </Pressable>
          </View>
          <View style={styles.weekHeader}>
            {weekDays.map((day) => <View key={day} style={styles.dayCell}><AppText variant="label" color={Palette.muted}>{day}</AppText></View>)}
          </View>
          <View style={styles.monthGrid}>
            {cells.map((cell) => {
              const eventCount = accessibleSessions.filter((session) => localDateKey(new Date(session.starts_at)) === cell.key).length;
              return (
                <View key={cell.key} style={[styles.dateCell, cell.outside && styles.dateCellOutside]}>
                  <AppText variant="small" color={cell.outside ? Palette.disabled : Palette.ink} style={cell.today && styles.todayText}>{cell.day}</AppText>
                  {eventCount > 0 && <View style={styles.eventBadge}><AppText variant="small" color={Palette.white}>{eventCount}</AppText></View>}
                </View>
              );
            })}
          </View>
        </Card>

        <View style={[styles.agendaColumn, stacked && styles.fullWidth]}>
          <Card tone="mint" style={styles.agendaSummary}>
            <View style={styles.agendaSummaryTop}>
              <View style={styles.agendaIcon}><AppIcon name="calendar" size={24} color={Palette.forest} /></View>
              <Pill tone="mint">{visibleSessions.length} Termine</Pill>
            </View>
            <AppText variant="heading">Monatsübersicht</AppText>
            <AppText color={Palette.inkSoft}>{visibleSessions.length ? 'Alle zugänglichen Live-Termine dieses Monats.' : 'Aktuell sind keine Termine eingetragen.'}</AppText>
          </Card>
          <Card style={styles.agendaList}>
            <SectionHeader title="Anstehend" />
            {isLoading && accessibleSessions.length === 0 ? (
              <DataLoading />
            ) : visibleSessions.length === 0 ? (
              <EmptyState compact icon="clock" title="Keine Termine" description="Neue Termine erscheinen hier chronologisch." />
            ) : (
              <View style={styles.sessionList}>
                {visibleSessions.map((session) => {
                  const lesson = data.lessons.find((entry) => entry.id === session.lesson_id);
                  const group = data.groups.find((entry) => entry.id === session.group_id);
                  return (
                    <View key={session.id} style={styles.sessionRow}>
                      <View style={styles.sessionDate}><AppIcon name="video" size={19} color={Palette.forest} /></View>
                      <View style={styles.sessionCopy}>
                        <AppText variant="bodyStrong">{session.title || lesson?.title || 'Live-Unterricht'}</AppText>
                        <AppText variant="small" color={Palette.inkSoft}>{formatDateTime(session.starts_at)}</AppText>
                        <AppText variant="small" color={Palette.muted}>{group ? `${group.name} · ${group.schedule_label}` : 'Für alle Zeitgruppen'}</AppText>
                        {session.meeting_url && session.status !== 'cancelled' && (
                          <ActionButton label="Zoom öffnen" icon="external" compact variant="secondary" onPress={() => void Linking.openURL(session.meeting_url!)} />
                        )}
                      </View>
                      {isTeam && <RowActions onEdit={() => openSession(session)} onDelete={() => void remove(session)} />}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>
      </View>

      <FormDialog visible={dialogOpen} title={editing ? 'Termin bearbeiten' : 'Termin anlegen'} saving={saving} onClose={() => setDialogOpen(false)} onSave={() => void save()}>
        {formError && <ErrorBanner message={formError} />}
        <ChoiceChips label="Lektion" value={form.lessonId} onChange={(lessonId) => {
          const lesson = data.lessons.find((entry) => entry.id === lessonId);
          const journey = data.journeys.find((entry) => entry.id === lesson?.learning_journey_id);
          setForm((current) => ({
            ...current,
            lessonId,
            groupId: data.groups.some(
              (group) =>
                group.id === current.groupId &&
                group.age_group_id === journey?.age_group_id &&
                group.academy_year_id === journey?.academy_year_id
            ) ? current.groupId : null,
          }));
        }} options={data.lessons.map((lesson) => ({ value: lesson.id, label: lesson.title }))} />
        <ChoiceChips label="Zeitgruppe" value={form.groupId} allowEmpty emptyLabel="Alle Zeitgruppen" onChange={(groupId) => setForm((current) => ({ ...current, groupId }))} options={compatibleTimeGroups.map((group) => ({ value: group.id, label: `${group.name} · ${group.schedule_label}` }))} />
        <Field label="Bezeichnung" placeholder="Live-Unterricht" value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} />
        <DateField label="Datum" value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
        <View style={styles.formRow}>
          <View style={styles.formHalf}><TimeField label="Beginn" value={form.startTime} onChange={(startTime) => setForm((current) => ({ ...current, startTime }))} /></View>
          <View style={styles.formHalf}><TimeField label="Ende" value={form.endTime} onChange={(endTime) => setForm((current) => ({ ...current, endTime }))} /></View>
        </View>
        <Field label="Zoom-Link" placeholder="https://zoom.us/…" value={form.meetingUrl} onChangeText={(meetingUrl) => setForm((current) => ({ ...current, meetingUrl }))} autoCapitalize="none" />
        <Field label="Replay-Link" placeholder="Optional" value={form.replayUrl} onChangeText={(replayUrl) => setForm((current) => ({ ...current, replayUrl }))} autoCapitalize="none" />
        <ChoiceChips label="Status" value={form.status} onChange={(status) => status && setForm((current) => ({ ...current, status }))} options={[{ value: 'scheduled', label: 'Geplant' }, { value: 'live', label: 'Live' }, { value: 'completed', label: 'Beendet' }, { value: 'cancelled', label: 'Abgesagt' }]} />
      </FormDialog>
    </PageScaffold>
  );
}

function createMonthCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - firstWeekday);
  const todayKey = localDateKey(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { day: date.getDate(), key: localDateKey(date), outside: date.getMonth() !== monthIndex, today: localDateKey(date) === todayKey };
  });
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: Space.lg, alignItems: 'stretch' },
  column: { flexDirection: 'column' },
  fullWidth: { width: '100%', minWidth: 0, maxWidth: '100%', flexBasis: 'auto' },
  calendarCard: { flex: 1.45, minWidth: 0 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.xl },
  arrowButton: { width: 40, height: 40, borderRadius: Radius.small, backgroundColor: '#F0F3F1', alignItems: 'center', justifyContent: 'center' },
  arrowLeft: { transform: [{ rotate: '180deg' }] },
  monthTitle: { textAlign: 'center', flex: 1 },
  weekHeader: { flexDirection: 'row', paddingBottom: Space.sm },
  dayCell: { flex: 1, alignItems: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: Palette.line },
  dateCell: { width: '14.2857%', aspectRatio: 1.05, minHeight: 42, borderRightWidth: 1, borderBottomWidth: 1, borderColor: Palette.line, padding: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.paper },
  dateCellOutside: { backgroundColor: '#F7F8F5' },
  todayText: { color: Palette.white, backgroundColor: Palette.forest, width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, overflow: 'hidden' },
  eventBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: Palette.coral, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  agendaColumn: { flex: 0.75, minWidth: 270, gap: Space.lg },
  agendaSummary: { gap: Space.md },
  agendaSummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agendaIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  agendaList: { flex: 1 },
  sessionList: { gap: Space.sm, marginTop: Space.lg },
  sessionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.line, paddingVertical: Space.md },
  sessionDate: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1, gap: 4 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  formHalf: { flex: 1, minWidth: 210 },
});
