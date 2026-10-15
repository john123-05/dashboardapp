import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Betreiber-Projekt: Anmeldung, Park-Zugang, Mitgliedschaften (wie im Web-Dashboard).
export const SUPABASE_URL = 'https://xcrxltiiovpoladpaewd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjcnhsdGlpb3Zwb2xhZHBhZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTIxODEsImV4cCI6MjA4MjQ4ODE4MX0.qScZ_Uk6q68KHd35VloDuwb3DnC9iAktMx6xt17YWoQ';

// Geteiltes Projekt: Automaten, Verkäufe, Fotos (Functions prüfen dort das Betreiber-Token).
export const EXTERNAL_SUPABASE_URL = 'https://kvpcwlcfgmsmarjtwpsx.supabase.co';
export const EXTERNAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cGN3bGNmZ21zbWFyanR3cHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDczODEsImV4cCI6MjA4NjA4MzM4MX0.KiMNRutSws--fAxKnSRJgmoq3UiqoyfPowKiPWVs-A0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Nur-Lese-Zugriff auf das geteilte Projekt ohne Anmeldung (wie externalSupabase im Web).
export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
