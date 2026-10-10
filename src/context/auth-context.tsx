import { FunctionsHttpError, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
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
import { AppState, Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PaymentMethod } from '@/types/database';
import { validatePassword } from '@/utils/password';

export type AccountRole = 'parent' | 'teacher' | 'admin';

export type SignUpPayment = {
  paymentMethod: PaymentMethod;
  paymentAccepted: boolean;
  payerName: string;
};

export type AccountProfile = {
  id: number | null;
  displayName: string;
  avatarUrl: string | null;
  role: AccountRole;
};

type AuthActionResult = {
  error: string | null;
};

type SignUpResult = AuthActionResult & {
  needsEmailConfirmation: boolean;
};

type PasswordLoginResponse = {
  session?: { access_token: string; refresh_token: string };
  error?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isProfileLoading: boolean;
  isConfigured: boolean;

  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthActionResult>;

  signUp: (
    displayName: string,
    email: string,
    password: string,
    payment: SignUpPayment,
    captchaToken: string,
  ) => Promise<SignUpResult>;

  requestPasswordReset: (
    email: string,
    captchaToken: string,
  ) => Promise<AuthActionResult>;

  signOut: () => Promise<AuthActionResult>;

  refreshProfile: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

function fallbackProfile(user: User): AccountProfile {
  const metadataName =
    user.user_metadata?.display_name;

  return {
    id: null,
    displayName:
      typeof metadataName === 'string' &&
      metadataName.trim()
        ? metadataName.trim()
        : user.email?.split('@')[0] ||
          'Mein Konto',
    avatarUrl: null,
    role: 'parent',
  };
}

function resolveRole(
  roles: unknown[],
): AccountRole {
  const values = roles
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (
        entry &&
        typeof entry === 'object' &&
        'role' in entry
      ) {
        return entry.role;
      }

      return null;
    })
    .filter(
      (entry): entry is string =>
        typeof entry === 'string',
    );

  if (values.includes('admin')) {
    return 'admin';
  }

  if (values.includes('teacher')) {
    return 'teacher';
  }

  return 'parent';
}

function authRedirectUrl(path = '/login') {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    const productionBaseUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.EXPO_BASE_URL?.replace(
            /\/$/,
            '',
          ) ?? ''
        : '';

    return `${window.location.origin}${productionBaseUrl}${path}`;
  }

  return Linking.createURL(path);
}

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<AccountProfile | null>(null);

  const [isInitializing, setIsInitializing] =
    useState(Boolean(supabase));

  const [
    isProfileLoading,
    setIsProfileLoading,
  ] = useState(false);

  const sessionRef =
    useRef<Session | null>(null);

  const profileUserIdRef =
    useRef<string | null>(null);

  const profileRequestIdRef =
    useRef(0);

  const updateSession = useCallback(
    (
      nextSession: Session | null,
      force = false,
    ) => {
      const currentSession =
        sessionRef.current;

      const hasSameUser =
        Boolean(currentSession) ===
          Boolean(nextSession) &&
        currentSession?.user.id ===
          nextSession?.user.id;

      if (!force && hasSameUser) {
        return;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
    },
    [],
  );

  const loadProfile = useCallback(
    async (user: User | null) => {
      const requestId =
        ++profileRequestIdRef.current;

      profileUserIdRef.current =
        user?.id ?? null;

      if (!supabase || !user) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      const fallback =
        fallbackProfile(user);

      try {
        /*
         * Repariert auch ältere Auth-Konten,
         * die vor dem Profil-Trigger angelegt
         * wurden.
         */
        await supabase.rpc(
          'ensure_current_profile',
        );

        const {
          data: profileRow,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            'id, display_name, avatar_url',
          )
          .eq(
            'auth_user_id',
            user.id,
          )
          .maybeSingle();

        if (
          requestId !==
          profileRequestIdRef.current
        ) {
          return;
        }

        if (
          profileError ||
          !profileRow
        ) {
          setProfile(fallback);
          return;
        }

        const { data: roleRows } =
          await supabase
            .from('user_roles')
            .select('role')
            .eq(
              'profile_id',
              profileRow.id,
            );

        if (
          requestId !==
          profileRequestIdRef.current
        ) {
          return;
        }

        setProfile({
          id: profileRow.id,
          displayName:
            profileRow.display_name?.trim() ||
            fallback.displayName,
          avatarUrl:
            profileRow.avatar_url ?? null,
          role: resolveRole(
            roleRows ?? [],
          ),
        });
      } catch {
        if (
          requestId ===
          profileRequestIdRef.current
        ) {
          setProfile(fallback);
        }
      } finally {
        if (
          requestId ===
          profileRequestIdRef.current
        ) {
          setIsProfileLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) {
          return;
        }

        updateSession(data.session);

        setIsInitializing(false);

        const nextUser =
          data.session?.user ?? null;

        if (
          profileUserIdRef.current !==
          (nextUser?.id ?? null)
        ) {
          void loadProfile(nextUser);
        }
      });

    const { data } =
      supabase.auth.onAuthStateChange(
        (event, nextSession) => {
          if (!active) {
            return;
          }

          const sessionDetailsChanged =
            event === 'USER_UPDATED' ||
            event ===
              'PASSWORD_RECOVERY' ||
            event ===
              'MFA_CHALLENGE_VERIFIED';

          updateSession(
            nextSession,
            sessionDetailsChanged,
          );

          setIsInitializing(false);

          const nextUser =
            nextSession?.user ?? null;

          const shouldReloadProfile =
            event === 'USER_UPDATED' ||
            profileUserIdRef.current !==
              (nextUser?.id ?? null);

          if (shouldReloadProfile) {
            void loadProfile(nextUser);
          }
        },
      );

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [
    loadProfile,
    updateSession,
  ]);

  useEffect(() => {
    const client = supabase;

    if (
      !client ||
      Platform.OS === 'web'
    ) {
      return;
    }

    const subscription =
      AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            client.auth.startAutoRefresh();
          } else {
            client.auth.stopAutoRefresh();
          }
        },
      );

    return () =>
      subscription.remove();
  }, []);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AuthActionResult> => {
      if (!supabase) {
        return {
          error:
            'Supabase ist noch nicht konfiguriert.',
        };
      }

      try {
        const { data, error } =
          await supabase.functions.invoke<PasswordLoginResponse>('password-login', {
            body: { email, password },
          });

        if (error) {
          if (error instanceof FunctionsHttpError) {
            const response = await error.context.json() as PasswordLoginResponse;
            if (typeof response.error === 'string') {
              return { error: response.error };
            }
          }
          return { error: 'Die Anmeldung ist zurzeit nicht verfügbar.' };
        }
        if (!data?.session?.access_token || !data.session.refresh_token) {
          return { error: 'Die Anmeldung konnte nicht abgeschlossen werden.' };
        }

        // setSession übernimmt die normale Sitzungsspeicherung und Auth-Events.
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        return { error: sessionError?.message ?? null };
      } catch {
        return { error: 'Die Anmeldung ist zurzeit nicht verfügbar.' };
      }
    },
    [],
  );

  const signUp = useCallback(
    async (
      displayName: string,
      email: string,
      password: string,
      payment: SignUpPayment,
      captchaToken: string,
    ): Promise<SignUpResult> => {
      if (!supabase) {
        return {
          error:
            'Supabase ist noch nicht konfiguriert.',
          needsEmailConfirmation:
            false,
        };
      }

      const passwordValidation = validatePassword(password);

      if (!passwordValidation.isValid) {
        return {
          error: passwordValidation.message,
          needsEmailConfirmation: false,
        };
      }

      if (!captchaToken) {
        return {
          error: 'Bitte bestätige zuerst die hCaptcha-Prüfung.',
          needsEmailConfirmation: false,
        };
      }

      /*
       * Zusätzlich serverseitige
       * Plausibilitätsprüfung im Client.
       */
      if (!payment.paymentAccepted) {
        return {
          error:
            'Bitte bestätige den monatlichen Beitrag von 15,00 €.',
          needsEmailConfirmation:
            false,
        };
      }

      if (
        payment.paymentMethod !==
          'paypal' &&
        payment.paymentMethod !==
          'bank_transfer'
      ) {
        return {
          error:
            'Bitte wähle eine gültige Zahlungsart.',
          needsEmailConfirmation:
            false,
        };
      }

      const normalizedPayerName =
        payment.payerName.trim();

      if (
        normalizedPayerName.length < 2 ||
        normalizedPayerName.length > 120
      ) {
        return {
          error:
            'Bitte gib den Namen des verwendeten Zahlungskontos an.',
          needsEmailConfirmation:
            false,
        };
      }

      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,

          options: {
            captchaToken,
            emailRedirectTo:
              authRedirectUrl(),

            /*
             * Diese Werte landen in:
             *
             * auth.users.raw_user_meta_data
             *
             * Der von uns angelegte
             * Supabase-Trigger übernimmt
             * payment_method,
             * payment_payer_name und
             * payment_accepted anschließend
             * in payment_agreements.
             *
             * Der Preis 15,00 € wird
             * NICHT vom Client übertragen.
             * Er wird serverseitig auf
             * 1500 Cent festgelegt.
             */
            data: {
              display_name:
                displayName.trim(),

              payment_method:
                payment.paymentMethod,

              payment_payer_name:
                normalizedPayerName,

              payment_accepted:
                payment.paymentAccepted,
            },
          },
        });

      return {
        error:
          error?.message ?? null,

        needsEmailConfirmation:
          !error && !data.session,
      };
    },
    [],
  );

  const signOut = useCallback(
    async (): Promise<AuthActionResult> => {
      if (!supabase) {
        return {
          error:
            'Supabase ist noch nicht konfiguriert.',
        };
      }

      const { error } =
        await supabase.auth.signOut();

      return {
        error:
          error?.message ?? null,
      };
    },
    [],
  );

  const requestPasswordReset =
    useCallback(
      async (
        email: string,
        captchaToken: string,
      ): Promise<AuthActionResult> => {
        if (!supabase) {
          return {
            error:
              'Supabase ist noch nicht konfiguriert.',
          };
        }

        if (!captchaToken) {
          return {
            error: 'Bitte bestätige zuerst die hCaptcha-Prüfung.',
          };
        }

        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                authRedirectUrl(
                  '/account',
                ),
              captchaToken,
            },
          );

        return {
          error:
            error?.message ?? null,
        };
      },
      [],
    );

  const refreshProfile =
    useCallback(async () => {
      await loadProfile(
        session?.user ?? null,
      );
    }, [
      loadProfile,
      session?.user,
    ]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        user:
          session?.user ?? null,
        profile,
        isAuthenticated:
          Boolean(session),
        isInitializing,
        isProfileLoading,
        isConfigured:
          isSupabaseConfigured,
        signIn,
        signUp,
        requestPasswordReset,
        signOut,
        refreshProfile,
      }),
      [
        isInitializing,
        isProfileLoading,
        profile,
        refreshProfile,
        requestPasswordReset,
        session,
        signIn,
        signOut,
        signUp,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
