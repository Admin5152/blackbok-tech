import { getSupabaseAnonKey, getSupabaseClient, getSupabaseProjectUrl, isSupabaseConfigured } from './supabase';

function edgeFunctionsBaseUrl(): string {
  return getSupabaseProjectUrl();
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  requiresPassword?: boolean;
}

export class DeleteAccountService {
  // Delete user account and all associated data
  static async deleteAccount(password?: string): Promise<DeleteAccountResult> {
    try {
      console.log('Starting account deletion process...');
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return { success: false, error: 'Service not available' };
      }

      const client = getSupabaseClient();
      
      // Get current user
      const { data: { user }, error: userError } = await client.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        return { success: false, error: 'Authentication error' };
      }
      
      if (!user) {
        console.error('No user found');
        return { success: false, error: 'Not authenticated' };
      }

      console.log('Deleting account for user:', user.email);

      if (password && user.email) {
        const { error: reauthError } = await client.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (reauthError) {
          return { success: false, error: 'Incorrect password. Try again or use “Forgot password” first.' };
        }
      }

      const { data: profileRow } = await client
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle();

      const logEmail = (profileRow?.email || user.email || '').trim();
      if (logEmail) {
        const { error: deletionLogError } = await client.from('account_deletions').insert({
          user_id: user.id,
          email: logEmail,
          display_name: profileRow?.name?.trim() || null,
        });
        if (deletionLogError) {
          console.warn('Could not append account_deletions row (migration may be pending):', deletionLogError);
        }
      }

      // Delete user profile from profiles table
      const { error: profileError } = await client
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.warn('Error deleting profile (may not exist):', profileError);
        // Continue even if profile deletion fails
      }

      // Delete user's orders
      const { error: ordersError } = await client
        .from('orders')
        .delete()
        .eq('user_id', user.id);

      if (ordersError) {
        console.warn('Error deleting orders:', ordersError);
        // Continue even if orders deletion fails
      }

      const { error: repairsError } = await client
        .from('repair_requests')
        .delete()
        .eq('user_id', user.id);

      if (repairsError) {
        console.warn('Error deleting repair_requests:', repairsError);
      }

      const { error: tradesError } = await client
        .from('trade_in_requests')
        .delete()
        .eq('user_id', user.id);

      if (tradesError) {
        console.warn('Error deleting trade_in_requests:', tradesError);
      }

      for (const tbl of ['cart_items', 'wishlist_items'] as const) {
        const { error: delErr } = await client.from(tbl).delete().eq('user_id', user.id);
        if (delErr) console.warn(`delete ${tbl}:`, delErr);
      }

      // Call the Supabase Edge Function to delete the user's authentication account
      const { data: { session } } = await client.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'No active session found for deletion' };
      }

      const fnUrl = `${edgeFunctionsBaseUrl().replace(/\/$/, '')}/functions/v1/delete-account`;
      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: getSupabaseAnonKey(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Error deleting user account via Edge Function:', response.status, errorText);
        if (response.status === 404) {
          return {
            success: false,
            error:
              'Delete service is not available (Edge Function not deployed). Deploy `delete-account` in the Supabase project or contact support.',
          };
        }
        return {
          success: false,
          error: `Could not complete account deletion (${response.status}). ${errorText || response.statusText}`.trim(),
        };
      }

      console.log('✅ Account deleted successfully via Edge Function');
      return { success: true };

    } catch (error: any) {
      console.error('Error during account deletion:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }
  }

  // Check if user needs password confirmation for deletion
  static async checkPasswordRequirement(): Promise<DeleteAccountResult> {
    try {
      console.log('Checking password requirement for account deletion...');
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return { success: false, error: 'Service not available' };
      }

      const client = getSupabaseClient();
      
      // Get current user
      const { data: { user }, error: userError } = await client.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        return { success: false, error: 'Authentication error' };
      }
      
      if (!user) {
        console.error('No user found');
        return { success: false, error: 'Not authenticated' };
      }

      // Check if user has email/password authentication (vs OAuth)
      const { data: idData, error: idError } = await client.auth.getUserIdentities();

      if (idError || !idData?.identities) {
        return {
          success: true,
          requiresPassword: true,
        };
      }

      const hasEmailAuth = idData.identities.some((identity) => identity.provider === 'email');

      console.log('User has email authentication:', hasEmailAuth);

      return { 
        success: true, 
        requiresPassword: hasEmailAuth 
      };

    } catch (error: any) {
      console.error('Error checking password requirement:', error);
      return { success: false, error: error.message || 'Failed to check requirements' };
    }
  }

  // Get user data for confirmation display
  static async getUserDataForDeletion(): Promise<{
    email: string;
    name: string;
    createdAt: string;
    orderCount: number;
    repairCount: number;
    tradeCount: number;
  } | null> {
    try {
      console.log('Getting user data for deletion confirmation...');
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return null;
      }

      const client = getSupabaseClient();
      
      // Get current user
      const { data: { user }, error: userError } = await client.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        return null;
      }

      // Get user profile
      const { data: profile } = await client
        .from('profiles')
        .select('name, created_at')
        .eq('id', user.id)
        .single();

      // Count user's data
      const { count: orderCount } = await client
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: repairCount } = await client
        .from('repair_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: tradeCount } = await client
        .from('trade_in_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        email: user.email || '',
        name: profile?.name || 'Unknown',
        createdAt: profile?.created_at || user.created_at || '',
        orderCount: orderCount || 0,
        repairCount: repairCount || 0,
        tradeCount: tradeCount || 0
      };

    } catch (error) {
      console.error('Error getting user data for deletion:', error);
      return null;
    }
  }
}
