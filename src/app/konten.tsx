import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { StaffPortrait } from '@/components/staff-portrait';
import { ChoiceChips, DataLoading, ErrorBanner, FormDialog, RowActions } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, Field, PageScaffold, Pill, StatCard } from '@/components/ui/primitives';
import { Palette, Radius, Space } from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { listAdminAccounts, removeStaffPortrait, setProfilePrimaryRole, uploadStaffPortrait } from '@/lib/academy-api';
import { AdminAccountSummary, DatabaseRole } from '@/types/database';
import { apiErrorMessage, formatDateTime } from '@/utils/format';

type AccountFilter = 'all' | DatabaseRole;

const roleLabels: Record<DatabaseRole, string> = {
  parent: 'Elternkonto',
  teacher: 'Lehrkraft',
  admin: 'Admin',
};

export default function AccountsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { data, execute } = useAcademyData();
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [editing, setEditing] = useState<AdminAccountSummary | null>(null);
  const [nextRole, setNextRole] = useState<DatabaseRole>('parent');
  const [nextAgeGroupId, setNextAgeGroupId] = useState<number | null>(null);
  const [uploadingProfileId, setUploadingProfileId] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAdminAccounts()
      .then((rows) => {
        if (!active) return;
        setAccounts(rows);
        setLoadError(null);
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(apiErrorMessage(reason));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter(
      (account) =>
        (filter === 'all' || account.account_role === filter) &&
        (!query || account.display_name.toLowerCase().includes(query) || account.email?.toLowerCase().includes(query))
    );
  }, [accounts, filter, search]);

  async function reload() {
    setIsLoading(true);
    setLoadError(null);
    try {
      setAccounts(await listAdminAccounts());
    } catch (reason) {
      setLoadError(apiErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }

  function openRoleDialog(account: AdminAccountSummary) {
    setEditing(account);
    setNextRole(account.account_role);
    setNextAgeGroupId(account.age_group_id);
    setFormError(null);
  }

  async function saveRole() {
    if (!editing) return;
    if (nextRole === 'teacher' && !nextAgeGroupId) {
      setFormError('Bitte ordne der Lehrkraft eine Altersgruppe zu.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await execute(() => setProfilePrimaryRole(editing.profile_id, nextRole, nextRole === 'parent' ? null : nextAgeGroupId));
      await reload();
      if (editing.profile_id === profile?.id) await refreshProfile();
      setEditing(null);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function changePortrait(account: AdminAccountSummary, remove = false) {
    if (uploadingProfileId !== null) return;
    setImageError(null);
    setUploadingProfileId(account.profile_id);
    try {
      if (remove && account.portrait_path) {
        await execute(() => removeStaffPortrait(account.profile_id, account.portrait_path!));
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'image/webp'], multiple: false, copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error('Das Bild darf höchstens 5 MB groß sein.');
        const fileData = asset.file ? await asset.file.arrayBuffer() : await fetch(asset.uri).then((response) => response.arrayBuffer());
        const mimeType = asset.mimeType ?? ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[asset.name.split('.').pop()?.toLowerCase() ?? '']);
        if (!mimeType) throw new Error('Bitte wähle ein JPG-, PNG- oder WebP-Bild.');
        await execute(() => uploadStaffPortrait({ profileId: account.profile_id, data: fileData, mimeType, previousPath: account.portrait_path }));
      }
      await reload();
    } catch (reason) {
      setImageError(apiErrorMessage(reason));
    } finally {
      setUploadingProfileId(null);
    }
  }

  const parents = accounts.filter((account) => account.account_role === 'parent').length;
  const teachers = accounts.filter((account) => account.account_role === 'teacher').length;
  const admins = accounts.filter((account) => account.account_role === 'admin').length;

  return (
    <PageScaffold
      eyebrow="Administration"
      title="Konten & Rollen"
      description="Kontorollen, Altersgruppen der Dozenten und Profilbilder verwalten."
      action={<ActionButton label="Aktualisieren" icon="refresh" variant="secondary" disabled={isLoading} onPress={() => void reload()} />}>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void reload()} />}
      {imageError && <ErrorBanner message={imageError} />}
      <View style={styles.statsGrid}>
        <StatCard icon="profile" value={String(accounts.length)} label="Konten gesamt" tone="mint" />
        <StatCard icon="children" value={String(parents)} label="Elternkonten" tone="sun" />
        <StatCard icon="groups" value={String(teachers)} label="Lehrkräfte" tone="sky" />
        <StatCard icon="settings" value={String(admins)} label="Admins" tone="coral" />
      </View>

      <Card style={styles.toolbarCard}>
        <View style={styles.searchField}>
          <Field label="Konten durchsuchen" placeholder="Name oder E-Mail" value={search} onChangeText={setSearch} autoCapitalize="none" />
        </View>
        <View style={styles.filters}>
          {([
            ['all', 'Alle'],
            ['parent', 'Eltern'],
            ['teacher', 'Lehrkräfte'],
            ['admin', 'Admins'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setFilter(value)}>
              <Pill tone={filter === value ? 'mint' : 'neutral'}>{label}</Pill>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.listCard}>
        {isLoading && accounts.length === 0 ? (
          <DataLoading label="Konten werden geladen …" />
        ) : visibleAccounts.length === 0 ? (
          <EmptyState icon="profile" title="Keine Konten gefunden" description="Passe Suche oder Rollenfilter an." />
        ) : (
          <View style={styles.accountList}>
            {visibleAccounts.map((account) => {
              const isCurrent = account.profile_id === profile?.id;
              return (
                <View key={account.profile_id} style={styles.accountRow}>
                  <StaffPortrait name={account.display_name} url={account.account_role === 'parent' ? null : account.portrait_url} size={48} />
                  <View style={styles.accountCopy}>
                    <View style={styles.titleLine}>
                      <AppText variant="bodyStrong">{account.display_name}</AppText>
                      {isCurrent && <Pill tone="sun">Dein Konto</Pill>}
                    </View>
                    <AppText color={Palette.inkSoft}>{account.email ?? 'Keine E-Mail-Adresse'}</AppText>
                    {(account.account_role === 'teacher' || (account.account_role === 'admin' && account.age_group_id !== null)) && <AppText variant="small" color={Palette.forest}>
                      {data.ageGroups.find((group) => group.id === account.age_group_id)?.title ?? 'Noch keiner Altersgruppe zugeordnet'}
                    </AppText>}
                    <AppText variant="small" color={Palette.muted}>Profil #{account.profile_id} · Registriert {formatDateTime(account.profile_created_at)}</AppText>
                  </View>
                  <Pill tone={account.account_role === 'admin' ? 'coral' : account.account_role === 'teacher' ? 'sky' : 'mint'}>
                    {roleLabels[account.account_role]}
                  </Pill>
                  <RowActions onEdit={() => openRoleDialog(account)} />
                  {account.account_role !== 'parent' && (
                    <View style={styles.imageActions}>
                      <ActionButton label={uploadingProfileId === account.profile_id ? 'Wird gespeichert …' : account.portrait_path ? 'Bild ändern' : 'Bild hochladen'} icon="media" compact variant="secondary" disabled={uploadingProfileId !== null} onPress={() => void changePortrait(account)} />
                      {account.portrait_path && <ActionButton label="Bild entfernen" compact variant="quiet" disabled={uploadingProfileId !== null} onPress={() => void changePortrait(account, true)} />}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <FormDialog
        visible={Boolean(editing)}
        title="Rolle und Altersgruppe ändern"
        description={editing ? `${editing.display_name} · ${editing.email ?? 'Keine E-Mail-Adresse'}` : undefined}
        saveLabel="Zuordnung speichern"
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={() => void saveRole()}>
        {formError && <ErrorBanner message={formError} />}
        <ChoiceChips
          label="Primäre Rolle"
          value={nextRole}
          onChange={(value) => value && setNextRole(value)}
          options={[
            { value: 'parent', label: 'Elternkonto' },
            { value: 'teacher', label: 'Lehrkraft' },
            { value: 'admin', label: 'Administration' },
          ]}
        />
        {nextRole !== 'parent' && (
          <ChoiceChips label={nextRole === 'admin' ? 'Altersgruppe als Dozent (optional)' : 'Altersgruppe der Lehrkraft'}
            value={nextAgeGroupId} onChange={setNextAgeGroupId} allowEmpty={nextRole === 'admin'} emptyLabel="Keine Zuordnung"
            options={data.ageGroups.map((group) => ({ value: group.id, label: group.title }))} />
        )}
        <AppText variant="small" color={Palette.inkSoft}>
          Name und E-Mail werden automatisch aus diesem Konto übernommen.
          {nextRole === 'admin'
            ? ' Mit einer Altersgruppe erscheint der Admin für die zugehörigen Eltern und Kinder als Dozent. Admins behalten Zugriff auf alle Bereiche und Altersgruppen.'
            : nextRole === 'teacher'
              ? ' Lehrkräfte können ausschließlich Inhalte ihrer zugewiesenen Altersgruppe bearbeiten.'
              : ''}
        </AppText>
        <View style={styles.roleNotice}>
          <AppIcon name="lock" size={19} color={Palette.forest} />
          <AppText color={Palette.inkSoft} style={styles.noticeCopy}>
            Die Rolle bestimmt Navigation und Datenrechte. Der letzte Admin kann sich nicht selbst herabstufen.
          </AppText>
        </View>
      </FormDialog>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.lg },
  toolbarCard: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: Space.lg, padding: Space.lg },
  searchField: { flex: 1, minWidth: 250 },
  filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm, paddingBottom: Space.sm },
  listCard: { minHeight: 480 },
  accountList: { gap: Space.sm },
  accountRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.line, paddingVertical: Space.md },
  avatar: { width: 48, height: 48, borderRadius: Radius.medium, backgroundColor: Palette.sun, alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, flexBasis: 240, minWidth: 0, gap: 3 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  roleNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, borderRadius: Radius.medium, backgroundColor: Palette.mint, padding: Space.md },
  noticeCopy: { flex: 1 },
});
