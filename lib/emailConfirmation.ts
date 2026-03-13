import { supabase, getSupabaseClient, isSupabaseConfigured } from './supabase';
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

  // Check email confirmation by email address
  static async checkEmailConfirmationByEmail(email: string): Promise<EmailConfirmationStatus | null> {
    try {
      console.log('Checking email confirmation status for email:', email);
      
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        return null;
      }

      const client = getSupabaseClient();
      
      // Find user by email - use a different approach since admin.listUsers might not be available
      const { data: { user }, error } = await client.auth.getUser();
      
      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      if (!user || user.email !== email) {
        console.log('User not found with email:', email);
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
      
      // Resend confirmation email
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email,
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

  // Check if user clicked confirmation link in current session
  static checkConfirmationClickFromUrl(): { confirmed: boolean; email?: string } {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const confirmed = urlParams.get('confirmed');
      const access_token = urlParams.get('access_token');
      const refresh_token = urlParams.get('refresh_token');
      
      console.log('Checking URL for confirmation params:', { confirmed, hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token });
      
      if (confirmed === 'true' && access_token) {
        // Extract email from token or get from current user
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
