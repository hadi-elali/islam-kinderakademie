import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaffPortrait } from '@/components/staff-portrait';
import { ErrorBanner } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, Pill, SectionHeader } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { TeachingContact } from '@/types/database';

export function TeachingContacts({ ageGroupIds }: { ageGroupIds: number[] }) {
  const { data, isLoading } = useAcademyData();
  const [error, setError] = useState<string | null>(null);
  const contacts = data.teachingContacts.filter((contact) => contact.age_group_id !== null && ageGroupIds.includes(contact.age_group_id));
  if (ageGroupIds.length === 0 || isLoading) return null;

  async function contactTeacher(contact: TeachingContact) {
    if (!contact.email) return;
    setError(null);
    try {
      await Linking.openURL(`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent('Frage zum Unterricht')}`);
    } catch {
      setError(`Das E-Mail-Programm konnte nicht geöffnet werden. Schreibe bitte direkt an ${contact.email}.`);
    }
  }

  return (
    <Card>
      <SectionHeader title="Deine Dozenten" description="Ansprechpartner für den Unterricht deiner Altersgruppe" />
      {error && <ErrorBanner message={error} />}
      <View style={styles.list}>
        {contacts.length === 0 ? (
          <AppText color={Palette.inkSoft}>Für diese Altersgruppe ist noch kein Dozent zugeordnet.</AppText>
        ) : contacts.map((contact) => (
          <View key={contact.profile_id} style={styles.row}>
            <StaffPortrait name={contact.display_name} url={contact.portrait_url} />
            <View style={styles.copy}>
              <AppText variant="bodyStrong">{contact.display_name}</AppText>
              <Pill tone="sky">{data.ageGroups.find((group) => group.id === contact.age_group_id)?.title ?? 'Dozent'}</Pill>
              {contact.email && <AppText variant="small" color={Palette.inkSoft} selectable>{contact.email}</AppText>}
            </View>
            <ActionButton label="Dozent kontaktieren" icon="external" variant="secondary" compact disabled={!contact.email} onPress={() => void contactTeacher(contact)} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: Space.lg, gap: Space.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md },
  copy: { flex: 1, flexBasis: 180, minWidth: 0, alignItems: 'flex-start', gap: Space.xs },
});
