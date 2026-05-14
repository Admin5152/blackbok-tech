import { supabase, getSupabaseClient, isSupabaseConfigured } from './supabase';
import { authEmailConfirmRedirectUrl } from './siteUrl';
import type { AuthUser } from './auth';

export interface EmailConfirmationStatus {
  isEmailConfirmed: boolean;
  email: string;
  createdAt?: string;
  lastSignInAt?: string;
  needsConfirmation: boolean;
}

export class EmailConfirmationService {
  // Check if email has been confirmed for a specific user
  static async checkEmailConfirmation(userId: string): Promise<EmailConfirmationStatus | null> {
    try {
      console.log('Checking email confirmation status for user:', userId);
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return null;
      }

      const client = getSupabaseClient();
      
      // Get user from Supabase Auth
      const { data: { user }, error } = await client.auth.getUser(userId);
      
      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      if (!user) {
        console.log('User not found');
        return null;
      }

      const status: EmailConfirmationStatus = {
        isEmailConfirmed: user.email_confirmed_at ? true : false,
        email: user.email || '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        needsConfirmation: !user.email_confirmed_at
      };

      console.log('Email confirmation status:', status);
      return status;
    } catch (error) {
      console.error('Error checking email confirmation:', error);
      return null;
    }
  }

  // Check email confirmation for the **current browser session** only.
  // The anon client cannot look up arbitrary emails; after the user clicks
  // the Supabase link, `getSession()` exposes their user (including
  // `email_confirmed_at`) so "Check status" and polling can work.
  static async checkEmailConfirmationByEmail(email: string): Promise<EmailConfirmationStatus | null> {
    try {
      console.log('Checking email confirmation status for email:', email);

      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return null;
      }

      const client = getSupabaseClient();
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        console.error('Error reading session:', error);
        return null;
      }

      const user = session?.user;
      if (!user) {
        console.log('No active session — user has not opened the confirmation link in this browser yet');
        return null;
      }

      const sessionEmail = (user.email || '').trim().toLowerCase();
      const target = (email || '').trim().toLowerCase();
      if (target && sessionEmail !== target) {
        console.log('Session email does not match confirmation page email');
        return null;
      }

      const status: EmailConfirmationStatus = {
        isEmailConfirmed: Boolean(user.email_confirmed_at),
        email: user.email || '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        needsConfirmation: !user.email_confirmed_at,
      };

      console.log('Email confirmation status:', status);
      return status;
    } catch (error) {
      console.error('Error checking email confirmation by email:', error);
      return null;
    }
  }

  // Check current user's email confirmation status
  static async checkCurrentUserEmailConfirmation(): Promise<EmailConfirmationStatus | null> {
    try {
      console.log('Checking current user email confirmation status');
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return null;
      }

      const client = getSupabaseClient();
      
      // Get current user
      const { data: { user }, error } = await client.auth.getUser();
      
      if (error) {
        console.error('Error fetching current user:', error);
        return null;
      }
      
      if (!user) {
        console.log('No current user found');
        return null;
      }

      return await this.checkEmailConfirmation(user.id);
    } catch (error) {
      console.error('Error checking current user email confirmation:', error);
      return null;
    }
  }

  // Resend confirmation email
  static async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Resending confirmation email to:', email);
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      const client = getSupabaseClient();

      // Anchor the redirect at site root (not `window.location.pathname`)
      // so we don't land on a path the host returns 404 for before the
      // SPA boots — same fix applied to signUp in lib/auth.ts.
      const emailRedirectTo = authEmailConfirmRedirectUrl();
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo
        }
      });

      if (error) {
        console.error('Error resending confirmation email:', error);
        return { success: false, error: error.message };
      }

      console.log('Confirmation email resent successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      return { success: false, error: error.message || 'Failed to resend confirmation email' };
    }
  }

  // Best-effort: Supabase may put tokens in `search`, in the hash before the
  // router path (`#access_token=...`), or after it (`#/route?...`).
  static checkConfirmationClickFromUrl(): { confirmed: boolean; email?: string } {
    try {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const urlParams = new URLSearchParams(search);
      const confirmed = urlParams.get('confirmed');
      const accessInSearch = urlParams.get('access_token');
      const accessInHash = /access_token=/.test(hash);
      const looksLikeSignup =
        /(^|[?&#])type=signup(?:&|$)/i.test(search + '&' + hash) ||
        /(^|[?&#])type=email_confirm(?:&|$)/i.test(search + '&' + hash);

      console.log('Checking URL for confirmation params:', {
        confirmed,
        hasAccessTokenSearch: !!accessInSearch,
        hasAccessTokenHash: accessInHash,
        looksLikeSignup,
      });

      if (confirmed === 'true' && accessInSearch) {
        return { confirmed: true };
      }
      if (accessInSearch && looksLikeSignup) {
        return { confirmed: true };
      }
      if (accessInHash && looksLikeSignup) {
        return { confirmed: true };
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Error checking confirmation from URL:', error);
      return { confirmed: false };
    }
  }

  // Monitor email confirmation status changes
  static async monitorEmailConfirmation(
    userId: string,
    onConfirmed: (status: EmailConfirmationStatus) => void,
    intervalMs: number = 5000
  ): Promise<{ stop: () => void }> {
    console.log('Starting email confirmation monitoring for user:', userId);
    
    let intervalId: NodeJS.Timeout;
    let isMonitoring = true;
    
    const checkStatus = async () => {
      if (!isMonitoring) return;
      
      const status = await this.checkEmailConfirmation(userId);
      
      if (status && status.isEmailConfirmed) {
        console.log('Email confirmed! Stopping monitoring.');
        onConfirmed(status);
        this.stopMonitoring(intervalId);
      }
    };
    
    // Initial check
    await checkStatus();
    
    // Start periodic checking
    intervalId = setInterval(checkStatus, intervalMs);
    
    return {
      stop: () => this.stopMonitoring(intervalId)
    };
  }
  
  private static stopMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('Email confirmation monitoring stopped');
  }
}
