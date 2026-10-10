import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import {
  ChoiceChips,
  DataLoading,
  ErrorBanner,
  FormDialog,
  RowActions,
} from '@/components/ui/data-ui';
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  Field,
  PageScaffold,
  Pill,
  SegmentedControl,
  SectionHeader,
} from '@/components/ui/primitives';
import { Layout, Palette, Space } from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { createRecord, deleteRecord, updateRecord } from '@/lib/academy-api';
import { AcademyYearRow, AgeGroupRow, LearningJourneyRow } from '@/types/database';
import { apiErrorMessage, formatDate } from '@/utils/format';
import { confirmAction } from '@/utils/feedback';

type YearForm = { title: string; startsOn: string; endsOn: string; active: boolean };
type JourneyForm = {
  title: string;
  description: string;
  yearId: number | null;
  ageGroupId: number | null;
  published: boolean;
};
type AgeGroupForm = { title: string; minAge: string; maxAge: string };

const emptyYear: YearForm = { title: '', startsOn: '', endsOn: '', active: false };

export default function CurriculumScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;
  const { profile } = useAuth();
  const { data, isLoading, error: loadError, refresh, execute } = useAcademyData();
  const [ageGroupId, setAgeGroupId] = useState<number | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [ageGroupDialog, setAgeGroupDialog] = useState(false);
  const [yearDialog, setYearDialog] = useState(false);
  const [journeyDialog, setJourneyDialog] = useState(false);
  const [editingAgeGroup, setEditingAgeGroup] = useState<AgeGroupRow | null>(null);
  const [editingYear, setEditingYear] = useState<AcademyYearRow | null>(null);
  const [editingJourney, setEditingJourney] = useState<LearningJourneyRow | null>(null);
  const [yearForm, setYearForm] = useState<YearForm>(emptyYear);
  const [journeyForm, setJourneyForm] = useState<JourneyForm>({
    title: '',
    description: '',
    yearId: null,
    ageGroupId: null,
    published: false,
  });
  const [ageGroupForm, setAgeGroupForm] = useState<AgeGroupForm>({ title: '', minAge: '', maxAge: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';
  const effectiveAgeGroupId = ageGroupId ?? data.ageGroups[0]?.id ?? null;
  const activeAgeGroup = data.ageGroups.find((group) => group.id === effectiveAgeGroupId) ?? null;
  const selectedYear =
    data.academyYears.find((year) => year.id === selectedYearId) ?? null;
  const effectiveYearId = selectedYear?.id ?? null;

  const visibleJourneys = useMemo(
    () =>
      data.journeys.filter(
        (journey) =>
          journey.academy_year_id === effectiveYearId &&
          journey.age_group_id === effectiveAgeGroupId
      ),
    [data.journeys, effectiveAgeGroupId, effectiveYearId]
  );

  function openAgeGroup(ageGroup?: AgeGroupRow) {
    setEditingAgeGroup(ageGroup ?? null);
    setAgeGroupForm(
      ageGroup
        ? { title: ageGroup.title, minAge: String(ageGroup.min_age), maxAge: String(ageGroup.max_age) }
        : { title: '', minAge: '', maxAge: '' }
    );
    setFormError(null);
    setAgeGroupDialog(true);
  }

  function openYear(year?: AcademyYearRow) {
    setEditingYear(year ?? null);
    setYearForm(
      year
        ? { title: year.title, startsOn: year.starts_on, endsOn: year.ends_on, active: year.is_active }
        : emptyYear
    );
    setFormError(null);
    setYearDialog(true);
  }

  function openJourney(journey?: LearningJourneyRow) {
    setEditingJourney(journey ?? null);
    setJourneyForm(
      journey
        ? {
            title: journey.title,
            description: journey.description ?? '',
            yearId: journey.academy_year_id,
            ageGroupId: journey.age_group_id,
            published: journey.is_published,
          }
        : {
            title: '',
            description: '',
            yearId: effectiveYearId,
            ageGroupId: effectiveAgeGroupId,
            published: false,
          }
    );
    setFormError(null);
    setJourneyDialog(true);
  }

  async function saveAgeGroup() {
    const minAge = Number(ageGroupForm.minAge);
    const maxAge = Number(ageGroupForm.maxAge);
    if (!ageGroupForm.title.trim()) {
      setFormError('Eine Bezeichnung ist erforderlich.');
      return;
    }
    if (
      !Number.isInteger(minAge) ||
      !Number.isInteger(maxAge) ||
      minAge < 0 ||
      maxAge > 99 ||
      maxAge < minAge
    ) {
      setFormError('Gib ein gültiges Mindest- und Höchstalter ein.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const values = {
        title: ageGroupForm.title.trim(),
        min_age: minAge,
        max_age: maxAge,
        position: editingAgeGroup?.position ?? data.ageGroups.length,
      };
      const savedAgeGroup = await execute(() =>
        editingAgeGroup
          ? updateRecord('age_groups', editingAgeGroup.id, values)
          : createRecord('age_groups', values)
      );
      setAgeGroupId(savedAgeGroup.id);
      setAgeGroupDialog(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function saveYear() {
    if (!yearForm.title.trim() || !yearForm.startsOn || !yearForm.endsOn) {
      setFormError('Titel, Startdatum und Enddatum sind erforderlich.');
      return;
    }
    if (yearForm.endsOn < yearForm.startsOn) {
      setFormError('Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (yearForm.active) {
        await Promise.all(
          data.academyYears
            .filter((year) => year.is_active && year.id !== editingYear?.id)
            .map((year) => updateRecord('academy_years', year.id, { is_active: false }))
        );
      }
      const values = {
        title: yearForm.title.trim(),
        starts_on: yearForm.startsOn,
        ends_on: yearForm.endsOn,
        is_active: yearForm.active,
      };
      const savedYear = await execute(() =>
        editingYear
          ? updateRecord('academy_years', editingYear.id, values)
          : createRecord('academy_years', values)
      );
      setSelectedYearId(savedYear.id);
      setYearDialog(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function saveJourney() {
    if (!journeyForm.title.trim() || !journeyForm.yearId || !journeyForm.ageGroupId) {
      setFormError('Titel, Akademiejahr und Altersgruppe sind erforderlich.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const siblingCount = data.journeys.filter(
        (journey) =>
          journey.academy_year_id === journeyForm.yearId && journey.age_group_id === journeyForm.ageGroupId
      ).length;
      const values = {
        academy_year_id: journeyForm.yearId,
        age_group_id: journeyForm.ageGroupId,
        title: journeyForm.title.trim(),
        description: journeyForm.description.trim() || null,
        position: editingJourney?.position ?? siblingCount,
        is_published: journeyForm.published,
      };
      const savedJourney = await execute(() =>
        editingJourney
          ? updateRecord('learning_journeys', editingJourney.id, values)
          : createRecord('learning_journeys', values)
      );
      setSelectedYearId(savedJourney.academy_year_id);
      setAgeGroupId(savedJourney.age_group_id);
      setJourneyDialog(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function removeAgeGroup(ageGroup: AgeGroupRow) {
    const confirmed = await confirmAction(
      'Altersgruppe löschen?',
      `„${ageGroup.title}“ kann nur gelöscht werden, wenn keine Kinder, Zeitgruppen oder Lernreisen zugeordnet sind.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      await execute(() => deleteRecord('age_groups', ageGroup.id));
      if (effectiveAgeGroupId === ageGroup.id) setAgeGroupId(null);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  async function removeYear(year: AcademyYearRow) {
    const confirmed = await confirmAction(
      'Akademiejahr löschen?',
      'Alle zugehörigen Lernreisen, Lektionen, Zeitgruppen und Fortschrittsdaten werden mitgelöscht.'
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      await execute(() => deleteRecord('academy_years', year.id));
      if (effectiveYearId === year.id) setSelectedYearId(null);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  async function removeJourney(journey: LearningJourneyRow) {
    const confirmed = await confirmAction(
      'Lernreise löschen?',
      `„${journey.title}“ und alle enthaltenen Lektionen werden dauerhaft gelöscht.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      await execute(() => deleteRecord('learning_journeys', journey.id));
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title="Curriculum"
      description="Akademiejahre, Lernreisen und Lektionen werden hier hierarchisch aufgebaut."
      action={
        <View style={styles.headerActions}>
          {isAdmin && <ActionButton label="Altersgruppe" variant="secondary" icon="add" onPress={() => openAgeGroup()} />}
          {isAdmin && <ActionButton label="Akademiejahr" variant="secondary" icon="add" onPress={() => openYear()} />}
        </View>
      }>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void refresh()} />}
      {actionError && <ErrorBanner message={actionError} />}
      <Card style={styles.toolbarCard}>
        <View style={styles.toolbarRow}>
          <View style={styles.toolbarCopy}>
            <AppText variant="bodyStrong">Altersgruppe</AppText>
            <AppText variant="small" color={Palette.inkSoft}>Inhalte werden getrennt gepflegt.</AppText>
          </View>
          {effectiveAgeGroupId ? (
            <View style={styles.ageGroupControls}>
              <SegmentedControl
                value={effectiveAgeGroupId}
                onChange={setAgeGroupId}
                options={data.ageGroups.map((group) => ({ value: group.id, label: group.title }))}
              />
              {isAdmin && activeAgeGroup && (
                <RowActions
                  onEdit={() => openAgeGroup(activeAgeGroup)}
                  onDelete={() => void removeAgeGroup(activeAgeGroup)}
                />
              )}
            </View>
          ) : (
            <AppText color={Palette.muted}>Noch keine Altersgruppe angelegt.</AppText>
          )}
        </View>
      </Card>

      <SectionHeader title="Akademiejahre" description={`${data.academyYears.length} Zeiträume · Jahr anklicken, um seine Lernreisen zu öffnen`} />
      {isLoading && data.academyYears.length === 0 ? (
        <Card><DataLoading /></Card>
      ) : data.academyYears.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar"
            title="Noch kein Akademiejahr"
            description="Lege zuerst einen Zeitraum für das Curriculum und die Unterrichtsgruppen an."
            actionLabel={isAdmin ? "Akademiejahr anlegen" : undefined}
            onAction={isAdmin ? () => openYear() : undefined}
          />
        </Card>
      ) : (
        <View style={styles.yearList}>
          {data.academyYears.map((year) => {
            const isSelected = year.id === effectiveYearId;
            const journeyCount = data.journeys.filter(
              (journey) =>
                journey.academy_year_id === year.id &&
                journey.age_group_id === effectiveAgeGroupId
            ).length;
            return (
              <Card key={year.id} tone={isSelected ? 'sky' : 'paper'} style={[styles.yearCard, isSelected && styles.yearCardSelected]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${year.title} öffnen`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedYearId(year.id)}
                  style={({ pressed }) => [
                    styles.yearSelect,
                    compact && styles.yearSelectCompact,
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.nodeIcon, isSelected && styles.nodeIconSelected]}><AppIcon name="calendar" size={22} color={Palette.forest} /></View>
                  <View style={[styles.nodeCopy, compact && styles.copyCompact]}>
                    <View style={styles.titleLine}>
                      <AppText variant="bodyStrong">{year.title}</AppText>
                      <Pill tone={year.is_active ? 'mint' : 'neutral'}>{year.is_active ? 'Aktiv' : 'Inaktiv'}</Pill>
                      {isSelected && <Pill tone="neutral">Geöffnet</Pill>}
                    </View>
                    <AppText variant="small" color={Palette.inkSoft}>
                      {formatDate(year.starts_on)} – {formatDate(year.ends_on)} · {journeyCount} Lernreisen
                    </AppText>
                  </View>
                  <AppIcon name="arrow" size={19} color={Palette.forest} />
                </Pressable>
                {isAdmin && <RowActions onEdit={() => openYear(year)} onDelete={() => void removeYear(year)} />}
              </Card>
            );
          })}
        </View>
      )}

      {selectedYear ? (
        <>
          <SectionHeader
            title={`Lernreisen in ${selectedYear.title}`}
            description={`${activeAgeGroup?.title ?? 'Ohne Altersgruppe'} · ${visibleJourneys.length} Lernreisen`}
            action={
              effectiveAgeGroupId ? (
                <ActionButton label="Lernreise hinzufügen" icon="add" onPress={() => openJourney()} />
              ) : undefined
            }
          />
          <Card style={styles.treeCard}>
            {visibleJourneys.length === 0 ? (
              <EmptyState
                compact
                icon="curriculum"
                title={`Noch keine Lernreisen in ${selectedYear.title}`}
                description="Lege für das ausgewählte Jahr und die Altersgruppe eine Lernreise an."
              />
            ) : (
              <View style={styles.journeyList}>
                {visibleJourneys.map((journey, index) => {
                  const lessonCount = data.lessons.filter((lesson) => lesson.learning_journey_id === journey.id).length;
                  return (
                    <View key={journey.id} style={styles.journeyRow}>
                      <View style={styles.journeyNumber}><AppText variant="bodyStrong">{index + 1}</AppText></View>
                      <View style={[styles.nodeCopy, compact && styles.copyCompact]}>
                        <View style={styles.titleLine}>
                          <AppText variant="bodyStrong">{journey.title}</AppText>
                          <Pill tone="sky" icon="calendar">{selectedYear.title}</Pill>
                          <Pill tone={journey.is_published ? 'mint' : 'sun'}>
                            {journey.is_published ? 'Veröffentlicht' : 'Entwurf'}
                          </Pill>
                        </View>
                        <AppText variant="small" color={Palette.inkSoft}>
                          {lessonCount} Lektionen
                        </AppText>
                        {journey.description && <AppText color={Palette.inkSoft}>{journey.description}</AppText>}
                      </View>
                      <RowActions
                        extra={<ActionButton label="Bearbeiten" icon="edit" compact variant="secondary" onPress={() => openJourney(journey)} />}
                        onDelete={() => void removeJourney(journey)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </>
      ) : (
        <Card tone="sky">
          <EmptyState
            compact
            icon="calendar"
            title="Akademiejahr auswählen"
            description="Klicke auf ein Akademiejahr. Erst danach werden seine Lernreisen angezeigt."
          />
        </Card>
      )}

      <Card tone="sun" style={styles.editorHint}>
        <View style={styles.hintIcon}><AppIcon name="lessons" size={23} color="#846211" /></View>
        <View style={[styles.hintCopy, compact && styles.copyCompact]}>
          <AppText variant="bodyStrong">Lektionseditor</AppText>
          <AppText color={Palette.inkSoft}>Erstellt Einstiegstext, geplanten Live-Zoom-Termin und ein separates Multiple-Choice-Quiz.</AppText>
        </View>
        <Pressable onPress={() => router.push('/lektion-neu')} style={({ pressed }) => pressed && styles.pressed}>
          <AppText variant="bodyStrong" color={Palette.forest}>Editor öffnen</AppText>
        </Pressable>
      </Card>

      <FormDialog
        visible={ageGroupDialog}
        title={editingAgeGroup ? 'Altersgruppe bearbeiten' : 'Altersgruppe anlegen'}
        description="Die Altersgruppe steht anschließend für Kinder, Zeitgruppen und Lernreisen zur Verfügung."
        saving={saving}
        onClose={() => setAgeGroupDialog(false)}
        onSave={() => void saveAgeGroup()}>
        {formError && <ErrorBanner message={formError} />}
        <Field
          label="Bezeichnung"
          placeholder="Zum Beispiel 13–15 Jahre"
          value={ageGroupForm.title}
          onChangeText={(title) => setAgeGroupForm((form) => ({ ...form, title }))}
        />
        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Field
              label="Mindestalter"
              keyboardType="number-pad"
              value={ageGroupForm.minAge}
              onChangeText={(minAge) => setAgeGroupForm((form) => ({ ...form, minAge }))}
            />
          </View>
          <View style={styles.formHalf}>
            <Field
              label="Höchstalter"
              keyboardType="number-pad"
              value={ageGroupForm.maxAge}
              onChangeText={(maxAge) => setAgeGroupForm((form) => ({ ...form, maxAge }))}
            />
          </View>
        </View>
      </FormDialog>

      <FormDialog
        visible={yearDialog}
        title={editingYear ? 'Akademiejahr bearbeiten' : 'Akademiejahr anlegen'}
        saving={saving}
        onClose={() => setYearDialog(false)}
        onSave={() => void saveYear()}>
        {formError && <ErrorBanner message={formError} />}
        <Field label="Bezeichnung" placeholder="Akademiejahr 2026/27" value={yearForm.title} onChangeText={(title) => setYearForm((form) => ({ ...form, title }))} />
        <View style={styles.formRow}>
          <View style={styles.formHalf}><Field label="Startdatum" placeholder="2026-09-01" value={yearForm.startsOn} onChangeText={(startsOn) => setYearForm((form) => ({ ...form, startsOn }))} /></View>
          <View style={styles.formHalf}><Field label="Enddatum" placeholder="2027-07-31" value={yearForm.endsOn} onChangeText={(endsOn) => setYearForm((form) => ({ ...form, endsOn }))} /></View>
        </View>
        <ChoiceChips
          label="Status"
          value={yearForm.active ? 'active' : 'inactive'}
          onChange={(value) => setYearForm((form) => ({ ...form, active: value === 'active' }))}
          options={[{ value: 'inactive', label: 'Inaktiv' }, { value: 'active', label: 'Aktiv' }]}
        />
      </FormDialog>

      <FormDialog
        visible={journeyDialog}
        title={editingJourney ? 'Lernreise bearbeiten' : 'Lernreise anlegen'}
        description={
          editingJourney
            ? 'Jede Lernreise gehört verpflichtend zu genau einem Akademiejahr.'
            : `Die neue Lernreise wird ${selectedYear?.title ?? 'dem ausgewählten Akademiejahr'} zugeordnet.`
        }
        saving={saving}
        onClose={() => setJourneyDialog(false)}
        onSave={() => void saveJourney()}>
        {formError && <ErrorBanner message={formError} />}
        <Field label="Titel" placeholder="Titel der Lernreise" value={journeyForm.title} onChangeText={(title) => setJourneyForm((form) => ({ ...form, title }))} />
        <Field label="Beschreibung" placeholder="Optional" multiline value={journeyForm.description} onChangeText={(description) => setJourneyForm((form) => ({ ...form, description }))} />
        <ChoiceChips
          label="Zugeordnetes Akademiejahr"
          value={journeyForm.yearId}
          onChange={(yearId) => setJourneyForm((form) => ({ ...form, yearId }))}
          options={data.academyYears.map((year) => ({ value: year.id, label: year.title }))}
        />
        <ChoiceChips
          label="Altersgruppe"
          value={journeyForm.ageGroupId}
          onChange={(ageGroupId) => setJourneyForm((form) => ({ ...form, ageGroupId }))}
          options={data.ageGroups.map((group) => ({ value: group.id, label: group.title }))}
        />
        <ChoiceChips
          label="Sichtbarkeit"
          value={journeyForm.published ? 'published' : 'draft'}
          onChange={(value) => setJourneyForm((form) => ({ ...form, published: value === 'published' }))}
          options={[{ value: 'draft', label: 'Entwurf' }, { value: 'published', label: 'Veröffentlicht' }]}
        />
      </FormDialog>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  toolbarCard: { padding: Space.lg },
  toolbarRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.lg },
  toolbarCopy: { gap: 2 },
  ageGroupControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  yearList: { gap: Space.sm },
  yearCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md, padding: Space.lg },
  yearCardSelected: { borderWidth: 2, borderColor: Palette.forest },
  yearSelect: { flex: 1, minWidth: 230, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  yearSelectCompact: { width: '100%', minWidth: 0, flexBasis: '100%' },
  nodeIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  nodeIconSelected: { backgroundColor: Palette.paper },
  nodeCopy: { flex: 1, minWidth: 180, gap: 3 },
  copyCompact: { minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  treeCard: { minHeight: 300 },
  journeyList: { gap: Space.sm },
  journeyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.line, paddingVertical: Space.md },
  journeyNumber: { width: 42, height: 42, borderRadius: 15, backgroundColor: Palette.sunSoft, alignItems: 'center', justifyContent: 'center' },
  editorHint: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.lg },
  hintIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.62)', alignItems: 'center', justifyContent: 'center' },
  hintCopy: { flex: 1, minWidth: 220, gap: 3 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  formHalf: { flex: 1, minWidth: 200 },
  pressed: { opacity: 0.65 },
});
