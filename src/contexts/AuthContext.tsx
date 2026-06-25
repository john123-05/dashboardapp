import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
