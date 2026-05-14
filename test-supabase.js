/**
 * Quick connectivity check. Run with env vars set, e.g. PowerShell:
 *   $env:VITE_SUPABASE_URL="https://....supabase.co"; $env:VITE_SUPABASE_ANON_KEY="..."; node test-supabase.js
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  try {
    const { error } = await supabase.from('products').select('count').single();
    if (error) {
      console.error('Connection failed:', error.message);
      return;
    }
    console.log('Connection OK.');

    const { data: products, error: productError } = await supabase.from('products').select('*').limit(3);

    if (productError) {
      console.error('Product fetch failed:', productError.message);
      return;
    }

    console.log(`Sample products: ${products?.length ?? 0}`);
    const { data: authData } = await supabase.auth.getSession();
    console.log('Auth client ready.', authData?.session ? 'Active session.' : 'No session.');
    console.log('\nDone.');
  } catch (error) {
    console.error('Test failed:', error?.message ?? error);
  }
}

testConnection();
