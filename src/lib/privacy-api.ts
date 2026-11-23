import { PRIVACY_VERSION, type PrivacyChoices, type PrivacyState } from '@/constants/privacy';
import { supabase } from '@/lib/supabase';

export async function loadPrivacyState(): Promise<PrivacyState> {
  if (!supabase) throw new Error('Die Akademie ist noch nicht konfiguriert.');
  const { data, error } = await supabase.rpc('get_privacy_state');
  if (error) throw new Error('Deine Datenschutzeinstellungen konnten nicht geladen werden. Bitte versuche es erneut.');
  const state = data?.[0] as PrivacyState | undefined;
  if (!state || state.policy_version !== PRIVACY_VERSION) {
    throw new Error('Die Datenschutzeinstellungen sind noch nicht verfügbar. Bitte wende dich an info@bufib.de.');
  }
  return state;
}

export async function savePrivacyChoices(choices: PrivacyChoices): Promise<void> {
  if (!supabase) throw new Error('Die Akademie ist noch nicht konfiguriert.');
  const { error } = await supabase.rpc('record_privacy_choices', {
    requested_version: PRIVACY_VERSION,
    child_data_granted: choices.childDataGranted,
    recording_granted: choices.recordingGranted,
    guardian_confirmed: choices.guardianConfirmed,
  });
  if (error) throw new Error('Die Entscheidung konnte nicht gespeichert werden. Bitte versuche es erneut.');
}

export type RecordingPermission = { child_id: number; recording_allowed: boolean };

export async function loadRecordingPermissions(): Promise<RecordingPermission[]> {
  if (!supabase) throw new Error('Die Akademie ist noch nicht konfiguriert.');
  const { data, error } = await supabase.rpc('get_child_recording_permissions');
  if (error) throw new Error('Aufnahmezustimmungen konnten nicht geprüft werden. Kinder dürfen bis zur Klärung nicht aufgenommen werden.');
  return (data ?? []) as RecordingPermission[];
}
