import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DataLoading, ErrorBanner, RowActions } from '@/components/ui/data-ui';
import { ActionButton, AppText, Card, EmptyState, PageScaffold, Pill } from '@/components/ui/primitives';
import { Palette, Radius, Space } from '@/constants/design';
import { useAcademyData } from '@/context/academy-data-context';
import { useAuth } from '@/context/auth-context';
import { deleteMediaAsset, getMediaSignedUrl, uploadMediaAsset } from '@/lib/academy-api';
import { MediaAssetRow, MediaType } from '@/types/database';
import { confirmAction } from '@/utils/feedback';
import { apiErrorMessage, formatBytes, formatDate } from '@/utils/format';

type MediaFilter = 'all' | MediaType;

export default function MediaScreen() {
  const { profile } = useAuth();
  const { data, isLoading, error: loadError, refresh, execute } = useAcademyData();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const assets = useMemo(
    () => data.mediaAssets.filter((asset) => filter === 'all' || asset.media_type === filter),
    [data.mediaAssets, filter]
  );

  async function selectAndUpload() {
    if (!profile?.id) {
      setActionError('Das angemeldete Profil wurde noch nicht geladen.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    setActionError(null);
    try {
      const fileData = asset.file
        ? await asset.file.arrayBuffer()
        : await fetch(asset.uri).then((response) => response.arrayBuffer());
      await execute(() =>
        uploadMediaAsset({
          profileId: profile.id!,
          ageGroupId: profile.role === 'teacher' ? data.ageGroups[0]?.id ?? null : null,
          fileName: asset.name,
          mimeType: asset.mimeType ?? null,
          size: asset.size ?? null,
          data: fileData,
        })
      );
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setUploading(false);
    }
  }

  async function openAsset(asset: MediaAssetRow) {
    try {
      const url = await getMediaSignedUrl(asset);
      if (url) await Linking.openURL(url);
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  async function removeAsset(asset: MediaAssetRow) {
    const lessonDocument = data.lessonDocuments.find(
      (document) => document.media_asset_id === asset.id,
    );
    const confirmed = await confirmAction(
      'Datei löschen?',
      lessonDocument
        ? `„${asset.file_name}“ wird aus der zugehörigen Lektion und aus dem privaten Speicher entfernt.`
        : `„${asset.file_name}“ wird aus Storage und Mediathek entfernt.`,
    );
    if (!confirmed) return;
    try {
      await execute(() => deleteMediaAsset(asset));
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title="Medien"
      description="Bilder, Audios, Dokumente und Replays werden in einem privaten Storage-Bucket verwaltet."
      action={<ActionButton label={uploading ? 'Wird hochgeladen …' : 'Datei hochladen'} icon="add" disabled={uploading || (profile?.role === 'teacher' && data.ageGroups.length === 0)} onPress={() => void selectAndUpload()} />}>
      {loadError && <ErrorBanner message={loadError} onRetry={() => void refresh()} />}
      {actionError && <ErrorBanner message={actionError} />}
      <Card tone="mint" style={styles.uploadCard}>
        <View style={styles.uploadIcon}><AppIcon name="media" size={31} color={Palette.forest} /></View>
        <View style={styles.uploadCopy}>
          <AppText variant="heading">Private Akademie-Mediathek</AppText>
          <AppText color={Palette.inkSoft}>Dateien sind nur für angemeldete Mitglieder abrufbar. Maximale Größe: 50 MB.</AppText>
        </View>
        <ActionButton label="Datei auswählen" variant="secondary" disabled={uploading || (profile?.role === 'teacher' && data.ageGroups.length === 0)} onPress={() => void selectAndUpload()} />
      </Card>

      <View style={styles.filters}>
        {([
          ['all', 'Alle'],
          ['image', 'Bilder'],
          ['video', 'Videos'],
          ['audio', 'Audio'],
          ['document', 'Dokumente'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setFilter(value)}>
            <Pill tone={filter === value ? 'mint' : 'neutral'}>{label}</Pill>
          </Pressable>
        ))}
      </View>

      <Card style={styles.libraryCard}>
        {isLoading && data.mediaAssets.length === 0 ? (
          <DataLoading />
        ) : assets.length === 0 ? (
          <EmptyState icon="media" title="Die Mediathek ist leer" description="Hochgeladene Dateien erscheinen hier und können geschützt geöffnet werden." />
        ) : (
          <View style={styles.assetGrid}>
            {assets.map((asset) => {
              const isLessonPdf = data.lessonDocuments.some(
                (document) => document.media_asset_id === asset.id,
              );

              return (
                <View key={asset.id} style={styles.assetCard}>
                  <View style={styles.assetIcon}>
                    <AppIcon name={asset.media_type === 'video' ? 'video' : asset.media_type === 'image' ? 'media' : 'lessons'} size={25} color={Palette.forest} />
                  </View>
                  <View style={styles.assetCopy}>
                    <AppText variant="bodyStrong" numberOfLines={2}>{asset.file_name}</AppText>
                    <AppText variant="small" color={Palette.muted}>{formatBytes(asset.size_bytes)} · {formatDate(asset.created_at)}</AppText>
                    <Pill tone="sky">
                      {isLessonPdf ? 'Lektions-PDF' : asset.media_type}
                    </Pill>
                  </View>
                  <RowActions
                    extra={<ActionButton label="Öffnen" icon="external" compact variant="secondary" onPress={() => void openAsset(asset)} />}
                    onDelete={
                      !isLessonPdf || profile?.role === 'admin'
                        ? () => void removeAsset(asset)
                        : undefined
                    }
                  />
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  uploadCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg },
  uploadIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.68)', alignItems: 'center', justifyContent: 'center' },
  uploadCopy: { flex: 1, flexBasis: 230, minWidth: 0, gap: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  libraryCard: { minHeight: 430 },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  assetCard: { width: 320, maxWidth: '100%', flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.medium, padding: Space.lg },
  assetIcon: { width: 50, height: 50, borderRadius: Radius.medium, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  assetCopy: { flex: 1, minWidth: 150, alignItems: 'flex-start', gap: 5 },
});
