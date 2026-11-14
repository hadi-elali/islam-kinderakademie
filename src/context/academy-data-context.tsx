import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getMediaSignedUrl, loadAcademyData, markMessageRead } from '@/lib/academy-api';
import { AcademyDataKey, deferredAcademyDependencies, initialAcademyKeys } from '@/lib/academy-sources';
import { SignedUrlCache } from '@/lib/signed-url-cache';
import { createAcademyDataLoader } from '@/lib/academy-data-loader';
import { AcademyData, MediaAssetRow, emptyDatabaseData } from '@/types/database';
import { useAuth } from '@/context/auth-context';

type AcademyDataContextValue = {
  data: AcademyData;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  execute: <T>(action: () => Promise<T>, changedKeys?: readonly AcademyDataKey[]) => Promise<T>;
  getMediaUrl: (asset: MediaAssetRow) => Promise<string>;
  signedUrls: SignedUrlCache;
  loadedKeys: ReadonlySet<AcademyDataKey>;
  ensureData: (keys: readonly AcademyDataKey[]) => Promise<void>;
  markMessageAsRead: (messageId: number) => Promise<void>;
};

const AcademyDataContext = createContext<AcademyDataContextValue | null>(null);

export function AcademyDataProvider({ children }: PropsWithChildren) {
  const { user, profile } = useAuth();
  return <ScopedAcademyDataProvider key={`${user?.id ?? 'signed-out'}:${profile?.id ?? ''}:${profile?.role ?? ''}`}>
    {children}
  </ScopedAcademyDataProvider>;
}

function ScopedAcademyDataProvider({ children }: PropsWithChildren) {
  const { profile, isAuthenticated } = useAuth();
  const profileId = profile?.id;
  const accountRole = profile?.role;
  const [data, setData] = useState<AcademyData>(emptyDatabaseData);
  const [isLoading, setIsLoading] = useState(isAuthenticated && Boolean(profileId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadedKeys, setLoadedKeys] = useState<ReadonlySet<AcademyDataKey>>(() => new Set());
  const active = useRef(false);
  const [signedUrls] = useState(() => new SignedUrlCache());

  const ensureRequest = useRef<((keys: readonly AcademyDataKey[]) => Promise<void>) | null>(null);
  const ensureData = useCallback((keys: readonly AcademyDataKey[]) =>
    ensureRequest.current?.(keys) ?? Promise.resolve(), []);
  const refreshRequest = useRef<((keys?: readonly AcademyDataKey[]) => Promise<void>) | null>(null);
  const refreshSelected = useCallback((keys?: readonly AcademyDataKey[]) =>
    refreshRequest.current?.(keys) ?? Promise.resolve(), []);
  const refresh = useCallback(() => refreshSelected(), [refreshSelected]);

  useEffect(() => {
    let current = true;
    active.current = true;
    const loader = createAcademyDataLoader<AcademyDataKey>(initialAcademyKeys, async (keys, full) => {
      if (!current || !isAuthenticated || !profileId || !accountRole) return;
      setIsRefreshing(true);
      // Explicit refreshes and changes to permissions recheck private URL access.
      if (full) signedUrls.clear();
      try {
        const nextData = await loadAcademyData({ id: profileId, role: accountRole }, { keys, signedUrls });
        if (!current) return;
        setData((previous) => ({ ...(full ? emptyDatabaseData : previous), ...nextData }));
        setLoadedKeys((previous) => new Set([...previous, ...keys]));
        setError(null);
      } catch (reason) {
        if (current) {
          setError(reason instanceof Error ? reason.message : 'Die Akademiedaten konnten nicht geladen werden.');
        }
        throw reason;
      } finally {
        if (current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }, deferredAcademyDependencies);
    refreshRequest.current = loader.refresh;
    ensureRequest.current = loader.ensure;
    if (isAuthenticated && profileId && accountRole) {
      void loader.refresh().catch(() => { /* The error is shown by the existing banners. */ });
    }
    return () => {
      current = false;
      active.current = false;
      refreshRequest.current = null;
      ensureRequest.current = null;
      signedUrls.clear();
    };
  }, [isAuthenticated, profileId, accountRole, signedUrls]);

  const execute = useCallback(
    async <T,>(action: () => Promise<T>, changedKeys?: readonly AcademyDataKey[]) => {
      const result = await action();
      // Omit changedKeys for role/group/access changes and complex cascades.
      await refreshSelected(changedKeys);
      return result;
    },
    [refreshSelected]
  );

  const getMediaUrl = useCallback((asset: MediaAssetRow) => {
    if (!active.current || !isAuthenticated || !profileId) {
      return Promise.reject(new Error('Bitte melde dich erneut an.'));
    }
    return getMediaSignedUrl(asset, signedUrls);
  }, [isAuthenticated, profileId, signedUrls]);

  const markMessageAsRead = useCallback(
    async (messageId: number) => {
      if (!profileId) return;

      const receipt = await markMessageRead(messageId, profileId);
      setData((current) => ({
        ...current,
        messageReads: [
          receipt,
          ...current.messageReads.filter(
            (entry) =>
              entry.message_id !== receipt.message_id ||
              entry.profile_id !== receipt.profile_id
          ),
        ],
      }));
    },
    [profileId]
  );

  const value = useMemo<AcademyDataContextValue>(
    () => ({
      data,
      isLoading,
      isRefreshing,
      error,
      refresh,
      execute,
      markMessageAsRead,
      getMediaUrl,
      signedUrls,
      loadedKeys,
      ensureData,
    }),
    [
      data,
      error,
      execute,
      isLoading,
      isRefreshing,
      markMessageAsRead,
      getMediaUrl,
      signedUrls,
      loadedKeys,
      ensureData,
      refresh,
    ]
  );

  return <AcademyDataContext.Provider value={value}>{children}</AcademyDataContext.Provider>;
}

export function useAcademyData(requiredKeys: readonly AcademyDataKey[] = []) {
  const context = useContext(AcademyDataContext);
  if (!context) throw new Error('useAcademyData must be used inside AcademyDataProvider');
  const { ensureData, loadedKeys } = context;
  // A primitive dependency avoids repeating work for inline key arrays.
  const signature = [...new Set(requiredKeys)].sort().join(',');
  useEffect(() => {
    // Wait for the base data. A later successful optional read must not hide
    // an initial loading failure and leave the page without its lesson data.
    if (!signature || context.isLoading || context.error) return;
    void ensureData(signature.split(',') as AcademyDataKey[]).catch(() => {
      // The existing context error banners expose a retry action.
    });
  }, [ensureData, loadedKeys, signature, context.isLoading, context.error]);
  const isReady = requiredKeys.every((key) => loadedKeys.has(key));
  return { ...context, isReady, isLoading: context.isLoading || (!isReady && !context.error) };
}
