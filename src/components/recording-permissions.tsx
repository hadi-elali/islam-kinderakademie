import { useState } from 'react';
import { View } from 'react-native';

import { ActionButton, AppText, Pill } from '@/components/ui/primitives';
import { Palette, Space } from '@/constants/design';
import { loadRecordingPermissions, type RecordingPermission } from '@/lib/privacy-api';

export function RecordingPermissions({ childrenById }: { childrenById: { id: number; display_name: string }[] }) {
  const [permissions, setPermissions] = useState<RecordingPermission[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setPermissions(null);
    setError(null);
    try { setPermissions(await loadRecordingPermissions()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Die Aufnahmezustimmungen konnten nicht geprüft werden.'); }
    finally { setLoading(false); }
  }

  return <View style={{ gap: Space.md }}>
    <AppText variant="bodyStrong">Vor jeder Aufnahme: Zustimmungen prüfen</AppText>
    <AppText variant="small" color={Palette.inkSoft}>Kinder ohne aktuelle Freigabe dürfen nicht erkennbar aufgenommen werden. Die Teilnahme muss ohne Aufnahme möglich bleiben. Diese Anzeige steuert Zoom nicht automatisch; prüfe sie unmittelbar vor dem Termin erneut.</AppText>
    <ActionButton label={loading ? 'Wird geprüft …' : 'Aktuelle Aufnahmezustimmungen prüfen'} variant="secondary" disabled={loading} onPress={() => void refresh()} />
    {error && <AppText color={Palette.inkSoft}>{error}</AppText>}
    {permissions?.map((permission) => {
      const child = childrenById.find((entry) => entry.id === permission.child_id);
      if (!child) return null;
      return <View key={permission.child_id} style={{ gap: Space.sm }}>
        <AppText variant="small">{child.display_name}</AppText>
        <Pill tone={permission.recording_allowed ? 'mint' : 'sun'}>{permission.recording_allowed ? 'Aufnahme freigegeben' : 'Keine Aufnahmefreigabe'}</Pill>
      </View>;
    })}
  </View>;
}
