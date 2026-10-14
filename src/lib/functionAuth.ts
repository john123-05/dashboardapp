import { supabase } from './supabase';

export function getFunctionSession() {
  return supabase.auth.getSession();
}
