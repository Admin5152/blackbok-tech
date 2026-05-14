import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim();
const supabaseAnonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error(
      'Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Set them in your hosting environment (e.g. Vercel) and rebuild.'
    );
  }
  console.warn(
    'Supabase is not configured: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a root .env file and restart the dev server.'
  );
}

const _client: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const supabase: SupabaseClient = (_client ??
  new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
      );
    },
  })) as SupabaseClient;

export const isSupabaseConfigured = (): boolean => !!_client;

export const getSupabaseClient = (): SupabaseClient => {
  if (!_client) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return _client;
};

/** Project API URL (same origin as Edge Functions). */
export function getSupabaseProjectUrl(): string {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set.');
  }
  return supabaseUrl;
}

/** Public anon key (same as the JS client) for Edge Function fetch calls that need an `apikey` header. */
export const getSupabaseAnonKey = (): string => {
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not set.');
  }
  return supabaseAnonKey;
};
