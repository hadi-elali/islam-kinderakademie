import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import type { PrivacyChoices, PrivacyState } from '@/constants/privacy';
import { useAcademy } from '@/context/academy-context';
import { useAuth } from '@/context/auth-context';
import { loadPrivacyState, savePrivacyChoices } from '@/lib/privacy-api';

type PrivacyContextValue = {
  state: PrivacyState | null;
  isLoading: boolean;
  error: string | null;
  canLoadAcademyData: boolean;
  refresh: () => Promise<void>;
  save: (choices: PrivacyChoices) => Promise<void>;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  return <ScopedPrivacyProvider key={user?.id ?? 'signed-out'}>{children}</ScopedPrivacyProvider>;
}

function ScopedPrivacyProvider({ children }: PropsWithChildren) {
  const { user, profile } = useAuth();
  const { activeRole } = useAcademy();
  const userId = user?.id ?? null;
  const active = useRef(false);
  const requestId = useRef(0);
  const [state, setState] = useState<PrivacyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const load = useCallback(async () => {
    if (!userId) return;
    const request = ++requestId.current;
    try {
      const nextState = await loadPrivacyState();
      if (active.current && requestId.current === request) { setState(nextState); setError(null); }
    } catch (reason) {
      if (active.current && requestId.current === request) {
        setState(null);
        setError(reason instanceof Error ? reason.message : 'Datenschutzeinstellungen konnten nicht geladen werden.');
      }
    } finally {
      if (active.current && requestId.current === request) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    active.current = true;
    void Promise.resolve().then(load);
    return () => { active.current = false; requestId.current += 1; };
  }, [load]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await load();
  }, [load]);
  const save = useCallback(async (choices: PrivacyChoices) => {
    await savePrivacyChoices(choices);
    // Drop permission immediately on withdrawal, before the subsequent read.
    if (!active.current) return;
    if (!choices.childDataGranted) setState((current) => current ? { ...current, child_data_granted: false, recording_granted: false } : null);
    await refresh();
  }, [refresh]);

  const canLoadAcademyData = Boolean(userId && profile && (
    (activeRole === 'team' && profile.role !== 'parent') || state?.child_data_granted
  ));
  const value = useMemo(() => ({ state, isLoading, error, canLoadAcademyData, refresh, save }),
    [state, isLoading, error, canLoadAcademyData, refresh, save]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) throw new Error('usePrivacy must be used inside PrivacyProvider');
  return value;
}
