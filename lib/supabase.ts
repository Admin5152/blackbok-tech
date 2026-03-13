import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// Create Supabase client with error handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper function to check if Supabase is available
export const isSupabaseConfigured = (): boolean => {
  return !!(supabase);
};

// Helper function to get Supabase client with error handling
export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check environment variables.');
  }
  return supabase;
};
