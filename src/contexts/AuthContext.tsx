import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PREVIEW } from '../lib/preview';

// Rollen und Seitenrechte wie im Web-Dashboard (src/contexts/AuthContext.tsx):
// Inhaber sehen alles, Mitarbeiter nur die im CRM freigegebenen Seiten (allowed_pages).
interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  fullName: string | null;
  email: string | null;
  hasOrg: boolean;
  isOwner: boolean;
  isStaff: boolean;
  allowedPages: string[] | null;
  allowedParkIds: string[];
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const initial: AuthState = {
  loading: true,
  session: null,
  user: null,
  fullName: null,
  email: null,
  hasOrg: false,
  isOwner: false,
  isStaff: false,
  allowedPages: null,
  allowedParkIds: [],
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T | null> {
  return Promise.race([Promise.resolve(promise), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

function parkIdsOf(user: User | null): string[] {
  const raw = user?.app_metadata?.allowed_park_ids;
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(PREVIEW ? { ...initial, loading: false, hasOrg: true, isOwner: true, email: 'vorschau@liftpictures.de', fullName: 'Vorschau' } : initial);

  const loadProfile = useCallback(async (user: User) => {
    const [profile, memberships] = await Promise.all([
      withTimeout(supabase.from('operator_profiles').select('*').eq('id', user.id).maybeSingle()),
      withTimeout(supabase.from('organization_memberships').select('*').eq('user_id', user.id)),
    ]);
    const rows = (memberships && !memberships.error ? memberships.data : null) as Array<Record<string, any>> | null;
    const current = rows && rows.length > 0 ? rows[0] : null;

    // Vom Betreiber deaktivierter Zugang: sofort abmelden.
    if (current?.disabled_at) {
      await supabase.auth.signOut().catch(() => undefined);
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: false,
      user,
      email: user.email ?? null,
      fullName: ((profile && !profile.error ? profile.data : null) as any)?.full_name ?? null,
      hasOrg: rows ? rows.length > 0 : prev.hasOrg,
      isOwner: rows ? current?.role === 'org_owner' || current?.role === 'platform_admin' : prev.isOwner,
      isStaff: rows ? current?.role === 'staff' : prev.isStaff,
      allowedPages: Array.isArray(current?.allowed_pages) ? current.allowed_pages : null,
      allowedParkIds: parkIdsOf(user),
    }));
  }, []);

  useEffect(() => {
    if (PREVIEW) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) void loadProfile(session.user);
      else setState((prev) => ({ ...prev, loading: false }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (!session?.user) {
        setState({ ...initial, loading: false });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void loadProfile(session.user);
      }
    });

    // Notbremse: nie ewig laden.
    const timer = setTimeout(() => setState((prev) => (prev.loading ? { ...prev, loading: false } : prev)), 15000);
    return () => {
      active = false;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (state.user) await loadProfile(state.user);
      },
    }),
    [state, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth außerhalb von AuthProvider');
  return ctx;
}
