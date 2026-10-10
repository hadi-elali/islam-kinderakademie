import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { ChoiceChips, DataLoading, ErrorBanner, FormDialog, RowActions } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, Field, PageScaffold, Pill } from '@/components/ui/primitives';
import { Palette, Radius, Space } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { useAcademyData } from '@/context/academy-data-context';
import { createRecord, deleteRecord, updateRecord } from '@/lib/academy-api';
import { BadgeRow } from '@/types/database';
import { confirmAction } from '@/utils/feedback';
import { apiErrorMessage } from '@/utils/format';

export default function BadgesScreen() {
  const { profile } = useAuth();
  const { data, isLoading, error: loadError, refresh, execute } = useAcademyData();
  const [badgeDialog, setBadgeDialog] = useState(false);
  const [awardDialog, setAwardDialog] = useState(false);
  const [editing, setEditing] = useState<BadgeRow | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeRow | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconKey, setIconKey] = useState('trophy');
  const [childId, setChildId] = useState<number | null>(null);
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openBadge(badge?: BadgeRow) {
    setEditing(badge ?? null);
    setTitle(badge?.title ?? '');
    setDescription(badge?.description ?? '');
    setIconKey(badge?.icon_key ?? 'trophy');
    setFormError(null);
    setBadgeDialog(true);
  }

  function openAward(badge: BadgeRow) {
    setSelectedBadge(badge);
    setChildId(data.children[0]?.id ?? null);
    setLessonId(null);
    setFormError(null);
    setAwardDialog(true);
  }

  async function saveBadge() {
    if (!title.trim() || !iconKey.trim()) {
      setFormError('Titel und Icon-Schlüssel sind erforderlich.');
      return;
    }
    setSaving(true);
    try {
      const values = { age_group_id: profile?.role === 'teacher' ? data.ageGroups[0]?.id ?? null : editing?.age_group_id ?? null, title: title.trim(), description: description.trim() || null, icon_key: iconKey.trim() };
      await execute(() => editing ? updateRecord('badges', editing.id, values) : createRecord('badges', values));
      setBadgeDialog(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function awardBadge() {
    if (!selectedBadge || !childId) {
      setFormError('Wähle ein Kinderprofil aus.');
      return;
    }
    setSaving(true);
    try {
      await execute(() => createRecord('child_badges', {
        child_id: childId,
        badge_id: selectedBadge.id,
        lesson_id: lessonId,
        awarded_at: new Date().toISOString(),
      }));
      setAwardDialog(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function removeBadge(badge: BadgeRow) {
    const confirmed = await confirmAction('Abzeichen löschen?', `„${badge.title}“ wird auch aus allen Kinderpässen entfernt.`);
    if (confirmed) await execute(() => deleteRecord('badges', badge.id));
  }

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title="Abzeichen"
      description="Persönliche Lernziele definieren und Kinderprofilen verleihen."
      action={<ActionButton label="Abzeichen anlegen" icon="add" disabled={profile?.role === 'teacher' && data.ageGroups.length === 0} onPress={() => openBadge()} />}>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void refresh()} />}
      <Card style={styles.listCard}>
        {isLoading && data.badges.length === 0 ? (
          <DataLoading />
        ) : data.badges.length === 0 ? (
          <EmptyState icon="trophy" title="Noch keine Abzeichen" description="Lege das erste persönliche Lernziel an." actionLabel="Abzeichen anlegen" onAction={() => openBadge()} />
        ) : (
          <View style={styles.grid}>
            {data.badges.map((badge) => {
              const awards = data.childBadges.filter((entry) => entry.badge_id === badge.id);
              return (
                <View key={badge.id} style={styles.badgeCard}>
                  <View style={styles.badgeIcon}><AppIcon name="trophy" size={26} color="#846211" /></View>
                  <View style={styles.badgeCopy}>
                    <AppText variant="bodyStrong">{badge.title}</AppText>
                    {badge.description && <AppText color={Palette.inkSoft}>{badge.description}</AppText>}
                    <Pill tone="sun">{awards.length} verliehen</Pill>
                  </View>
                  <ActionButton label="Verleihen" icon="add" compact variant="secondary" disabled={data.children.length === 0} onPress={() => openAward(badge)} />
                  {(profile?.role === 'admin' || (badge.age_group_id !== null && data.ageGroups.some((group) => group.id === badge.age_group_id))) && <RowActions onEdit={() => openBadge(badge)} onDelete={() => void removeBadge(badge)} />}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <FormDialog visible={badgeDialog} title={editing ? 'Abzeichen bearbeiten' : 'Abzeichen anlegen'} saving={saving} onClose={() => setBadgeDialog(false)} onSave={() => void saveBadge()}>
        {formError && <ErrorBanner message={formError} />}
        <Field label="Titel" placeholder="Erste Lernreise" value={title} onChangeText={setTitle} />
        <Field label="Beschreibung" placeholder="Optional" multiline value={description} onChangeText={setDescription} />
        <Field label="Icon-Schlüssel" placeholder="trophy" value={iconKey} onChangeText={setIconKey} helper="Wird später für die grafische Darstellung verwendet." />
      </FormDialog>

      <FormDialog visible={awardDialog} title={`„${selectedBadge?.title ?? ''}“ verleihen`} saving={saving} onClose={() => setAwardDialog(false)} onSave={() => void awardBadge()}>
        {formError && <ErrorBanner message={formError} />}
        <ChoiceChips label="Kinderprofil" value={childId} onChange={setChildId} options={data.children.map((child) => ({ value: child.id, label: child.display_name }))} />
        <ChoiceChips label="Bezug zur Lektion (optional)" value={lessonId} allowEmpty onChange={setLessonId} options={data.lessons.map((lesson) => ({ value: lesson.id, label: lesson.title }))} />
      </FormDialog>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  listCard: { minHeight: 430 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  badgeCard: { width: 330, maxWidth: '100%', flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, padding: Space.lg },
  badgeIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: Palette.sunSoft, alignItems: 'center', justifyContent: 'center' },
  badgeCopy: { flex: 1, minWidth: 170, alignItems: 'flex-start', gap: 5 },
});
