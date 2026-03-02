import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';
import type { OperatorProfile, Organization, OrganizationMembership } from '../lib/types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: OperatorProfile | null;
  memberships: Array<OrganizationMembership & { organization: Organization }>;
  currentOrg: Organization | null;
  hasOrg: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  joinDemoOrg: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  loading: true,
  session: null,
  user: null,
  profile: null,
  memberships: [],
  currentOrg: null,
  hasOrg: false,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialState);

  async function loadProfile(userId: string) {
    const { data: profile } = await supabase
      .from('operator_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: memberships } = await supabase
      .from('organization_memberships')
      .select('*, organization:organizations(*)')
      .eq('user_id', userId);

    const normalizedMemberships = ((memberships ?? []) as Array<
      OrganizationMembership & { organization: Organization }
    >).filter((item) => Boolean(item.organization));

    setState((prev) => ({
      ...prev,
      profile: (profile as OperatorProfile | null) ?? null,
      memberships: normalizedMemberships,
      currentOrg: normalizedMemberships[0]?.organization ?? null,
      hasOrg: normalizedMemberships.length > 0,
      loading: false,
    }));
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      const session = data.session;
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          profile: null,
          memberships: [],
          currentOrg: null,
          hasOrg: false,
        }));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function messageFromUnknown(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string') return maybeMessage;
      try {
        return JSON.stringify(error);
      } catch (_ignored) {
        return String(error);
      }
    }
    return String(error);
  }

  function isAuthJwtError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('invalid jwt') ||
      normalized.includes('"code":401') ||
      normalized.includes('401') ||
      normalized.includes('unauthorized') ||
      normalized.includes('jwt')
    );
  }

  async function invokeDeleteAccount() {
    return supabase.functions.invoke('delete-account', {
      method: 'POST',
      body: {},
    });
  }

  async function deleteViaDirectFetch(accessToken: string) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      return { ok: true, message: '' };
    }

    const text = await response.text();
    return { ok: false, message: text || `HTTP ${response.status}` };
  }

  async function deleteAccount() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'No active session found. Please sign in again and retry.' };
    }

    // Attempt 1: regular invoke.
    let result = await invokeDeleteAccount();
    if (!result.error) {
      await supabase.auth.signOut();
      return { error: null };
    }

    let message = messageFromUnknown(result.error);

    // Attempt 2: refresh session and retry invoke once.
    await supabase.auth.refreshSession();
    result = await invokeDeleteAccount();
    if (!result.error) {
      await supabase.auth.signOut();
      return { error: null };
    }
    message = `${message}\n${messageFromUnknown(result.error)}`.trim();

    // Attempt 3: direct fetch with latest token.
    const {
      data: { session: latestSession },
    } = await supabase.auth.getSession();
    const fallbackToken = latestSession?.access_token ?? null;
    if (fallbackToken) {
      const fallbackResult = await deleteViaDirectFetch(fallbackToken);
      if (fallbackResult.ok) {
        await supabase.auth.signOut();
        return { error: null };
      }
      message = `${message}\n${fallbackResult.message}`.trim();
    }

    // Guaranteed fallback: if auth is bad, force a clean sign-out and guide re-login.
    if (isAuthJwtError(message)) {
      await supabase.auth.signOut();
      return {
        error:
          'Session token was invalid. You were signed out. Please sign in again and retry delete account.',
      };
    }

    return { error: message || 'Delete account failed.' };
  }

  async function joinDemoOrg() {
    await supabase.rpc('join_demo_organization');
    if (state.user) {
      await loadProfile(state.user.id);
    }
  }

  async function refreshProfile() {
    if (state.user) {
      await loadProfile(state.user.id);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      joinDemoOrg,
      refreshProfile,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
