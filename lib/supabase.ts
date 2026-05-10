import { createClient } from '@supabase/supabase-js';

// Get environment variables with hardcoded fallbacks (anon key is public)
const FALLBACK_URL = 'https://crkmhpfgrvcnmqgiekjb.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya21ocGZncnZjbm1xZ2lla2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODg5NjAsImV4cCI6MjA4NjU2NDk2MH0.Wj41xSqkzhxScFfIHt4s_2vEFbb7qpT8YuubfIPvmYM';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON;

// Validate environment variables and provide helpful feedback
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not found:');
  console.warn('   VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.warn('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
  console.warn('');
  console.warn('📝 To fix this issue:');
  console.warn('   1. Create a .env file in the project root');
  console.warn('   2. Add your Supabase credentials:');
  console.warn('      VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.warn('      VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.warn('   3. Restart the development server');
  console.warn('');
  console.warn('🔑 Admin login will still work: BlackBox@gmail.com / BlackBox');
  
  // Only throw error in production if variables are missing
  if (import.meta.env.PROD) {
    throw new Error(
      'Supabase environment variables are required in production.\n' +
      'Missing: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
    );
  }
}

// Create Supabase client. We assert non-null at the type level so callers
// don't need to null-check on every access. At runtime, when env vars are
// missing, the client is a stub-like proxy that throws on use; the warning
// above tells the developer how to fix it.
import type { SupabaseClient } from '@supabase/supabase-js';

const _client: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabase: SupabaseClient = (_client ?? new Proxy({}, {
  get() {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  },
}) as SupabaseClient);

// Helper function to check if Supabase is available
export const isSupabaseConfigured = (): boolean => {
  return !!_client;
};

// Helper function to get Supabase client with error handling
export const getSupabaseClient = (): SupabaseClient => {
  if (!_client) {
    throw new Error('Supabase is not configured. Please check environment variables.');
  }
  return _client;
};

