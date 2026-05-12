import { supabase, getSupabaseClient, isSupabaseConfigured } from './supabase';
import type { User } from '../interface/interface';
import { normalizeCanonicalRole, type CanonicalAppRole } from './roles';

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: CanonicalAppRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error?: string;
}

// Authentication Service
class AuthService {
  private static readonly ADMIN_EMAILS = new Set(['blackbox@gmail.com']);

  private static resolveAppRole(role: unknown, email?: string | null): CanonicalAppRole {
    const fromDb = normalizeCanonicalRole(role);
    return this.isAdminEmail(email) ? 'admin' : fromDb;
  }

  private static isAdminEmail(email?: string | null): boolean {
    return !!email && this.ADMIN_EMAILS.has(email.toLowerCase());
  }

  // Sign In
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('=== SIGN IN ATTEMPT ===');
      console.log('Credentials:', { email: credentials.email, password: '***' });
      
      // Check if Supabase is configured
      const configured = isSupabaseConfigured();
      console.log('Supabase configured:', configured);
      
      if (!configured) {
        console.error(' Supabase is not configured');
        return {
          user: null,
          error:
            'Supabase is not configured. Create a `.env` file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
        };
      }

      // Get Supabase client with error handling
      try {
        const client = getSupabaseClient();
        console.log(' Supabase client obtained');
        
        // Authenticate with Supabase
        console.log(' Attempting Supabase authentication...');
        const { data, error } = await client.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });
        
        console.log(' Supabase response:', { 
          hasData: !!data, 
          hasUser: !!data?.user,
          error: error?.message 
        });
        
        if (error) {
          console.error(' Supabase auth error:', error);
          return { user: null, error: error.message };
        }
        
        if (data.user) {
          console.log(' Supabase auth successful, user:', data.user);
          
          // Get user profile from Supabase
          const profile = await this.getUserProfile(data.user.id);
          console.log(' User profile:', profile);
          
          // Get user role from user_roles table
          const { data: roles } = await client
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          const finalRole = this.resolveAppRole(
            roles?.role ?? profile?.role ?? data.user.app_metadata?.role ?? data.user.user_metadata?.role,
            data.user.email
          );
          console.log(' User role resolved:', finalRole);
          
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: profile?.name || data.user.email?.split('@')[0] || 'User',
            role: finalRole
          };
          
          console.log(' Final auth user:', authUser);
          return { user: authUser };
        }
        
        console.log(' No user data returned from Supabase');
        return { user: null, error: 'Authentication failed - no user data returned' };
      } catch (clientError: any) {
        console.error(' Error getting Supabase client:', clientError);
        return { user: null, error: 'Database client error: ' + clientError.message };
      }
    } catch (error: any) {
      console.error(' Sign in error:', error);
      return { user: null, error: error.message || 'Authentication failed' };
    }
  }

  // Sign Up
  static async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      console.log('=== SIGN UP ATTEMPT ===');
      console.log('Credentials:', { email: credentials.email, name: credentials.name, password: '***' });
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.error('❌ Supabase is not configured');
        return { user: null, error: 'Database connection error. Please try again later.' };
      }

      // Get Supabase client with error handling
      try {
        const client = getSupabaseClient();
        console.log('✅ Supabase client obtained');

        // Create user with Supabase Auth.
        //
        // emailRedirectTo: always anchor to the site root (`/`) instead of
        // `window.location.pathname`. The previous build included whatever
        // path the user happened to be on (e.g. `/auth`), and many static
        // hosts return 404 for unknown paths before the SPA can boot. The
        // `?type=email_confirm` query parameter is a defensive marker the
        // App.tsx listener picks up if the hash fragment gets stripped.
        console.log('🔄 Attempting Supabase registration...');
        const emailRedirectTo = `${window.location.origin}/?type=email_confirm#/emailconfirm`;
        const { data, error } = await client.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            emailRedirectTo,
            data: { name: credentials.name },
          }
        });

        console.log('📊 Supabase signup response:', {
          hasData: !!data,
          hasUser: !!data?.user,
          identitiesLength: data?.user?.identities?.length,
          error: error?.message,
        });

        if (error) {
          console.error('❌ Supabase signup error:', error);
          return { user: null, error: error.message };
        }

        // Anti-enumeration: Supabase's default behavior for `signUp` with an
        // already-registered email is to return a user object with NO error
        // and an empty `identities` array (instead of a clear duplicate
        // error). Detect that case explicitly so the UI can show the right
        // message. See https://supabase.com/docs/reference/javascript/auth-signup
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          console.warn('⚠️ Sign-up attempted with an email that already exists.');
          return {
            user: null,
            error: 'An account with this email already exists. Please log in instead.',
          };
        }

        if (data.user) {
          console.log('✅ Supabase signup successful, user created but not confirmed');
          
          // Create user profile with safe method (won't fail if RLS blocks it)
          const profile = await this.createUserProfileSafe(data.user.id, credentials.email, 'user', credentials.name);
          
          if (profile) {
            console.log('✅ Profile created successfully');
          } else {
            console.warn('⚠️ Profile creation skipped, but user was created successfully');
            console.log('ℹ️ Profile will be created when user confirms email and logs in');
          }
          
          // Return user info but don't log them in - they need to confirm email first
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: credentials.name || data.user.email?.split('@')[0] || 'User',
            role: 'user'
          };
          
          console.log('✅ User created successfully, awaiting email confirmation:', authUser);
          return { user: authUser };
        }

        console.log('❌ No user data returned from Supabase');
        return { user: null, error: 'Registration failed - no user data returned' };
      } catch (clientError: any) {
        console.error('❌ Error getting Supabase client:', clientError);
        return { user: null, error: 'Database client error: ' + clientError.message };
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      return { user: null, error: error.message || 'Registration failed' };
    }
  }

  // Sign Out
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting sign out...');
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, skipping sign out');
        return { success: true };
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      const { error } = await client.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Sign out successful');
      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message || 'Sign out failed' };
    }
  }

  // Get Current User
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('Getting current user...');
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, cannot get current user');
        return null;
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      const { data: { user } } = await client.auth.getUser();
      console.log('Current user from Supabase:', user);
      
      if (!user) {
        console.log('No current user found');
        return null;
      }

      // Try to get user profile
      let profile = await this.getUserProfile(user.id);
      
      // If profile doesn't exist, create it
      if (!profile) {
        console.log('Profile not found, creating one for user:', user.id);
        profile = await this.createUserProfileSafe(
          user.id, 
          user.email || '', 
          'user', 
          user.email?.split('@')[0]
        );
      }
      
      console.log('User profile:', profile);
      
      // Get user role from user_roles table
      const { data: roles } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const finalRole = this.resolveAppRole(
        roles?.role ?? profile?.role ?? user.app_metadata?.role ?? user.user_metadata?.role,
        user.email
      );
      console.log('User role resolved:', finalRole);
      
      return {
        id: user.id,
        email: user.email || '',
        name: profile?.name || user.email?.split('@')[0] || 'User',
        role: finalRole
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Get User Profile
  static async getUserProfile(userId: string) {
    try {
      console.log('Getting user profile for:', userId);
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, cannot get user profile');
        return null;
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile query result:', { data, error });

      if (error) {
        console.error('Profile query error:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // Create User Profile
  static async createUserProfile(userId: string, email: string, role: CanonicalAppRole = 'user', name?: string) {
    try {
      console.log('Creating user profile:', { userId, email, role, name });
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, cannot create user profile');
        return null;
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('profiles')
        .insert({
          id: userId,
          name: name || email.split('@')[0],
          email,
          role
        })
        .select()
        .single();

      console.log('Profile creation result:', { data, error });

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Create user profile error:', error);
      throw error;
    }
  }

  // Create User Profile with Admin Bypass (for new registrations)
  static async createUserProfileSafe(userId: string, email: string, role: CanonicalAppRole = 'user', name?: string) {
    try {
      console.log('Creating user profile safely:', { userId, email, role, name });
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, cannot create user profile');
        return null;
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      // Use service role key to bypass RLS (if available)
      // For now, try regular insert with better error handling
      const profileData = {
        id: userId,
        name: name || email.split('@')[0],
        email,
        role
      };

      console.log('Profile data to insert:', profileData);
      
      const { data, error } = await client
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.warn('Profile creation failed (this is ok for new users):', error);
        return null; // Return null instead of throwing
      }
      
      console.log('✅ Profile created successfully:', data);
      return data;
    } catch (error) {
      console.warn('Profile creation failed (this is ok for new users):', error);
      return null; // Return null instead of throwing
    }
  }

  // Request Password Reset Email
  static async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase is not configured.' };
      }

      const client = getSupabaseClient();
      // Defense in depth: include BOTH a query parameter (Supabase preserves
      // these reliably across the redirect) AND the hash route (used if the
      // host happens to forward fragments cleanly). Anchor to the site root
      // (`/`) rather than `window.location.pathname` so the redirect can't
      // land on a path the host returns 404 for before the SPA boots.
      // The App.tsx recovery listener routes to /reset-password whichever
      // way the URL lands.
      const redirectTo = `${window.location.origin}/?type=recovery#/reset-password`;

      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to send password reset email.' };
    }
  }

  // Reset password after recovery link
  static async resetPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase is not configured.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to reset password.' };
    }
  }

  // Validate Input
  static validateCredentials(credentials: LoginCredentials): { isValid: boolean; error?: string } {
    console.log('Validating credentials:', credentials);
    
    if (!credentials.email || !credentials.password) {
      return { isValid: false, error: 'All fields are required' };
    }

    if (!credentials.email.includes('@')) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    if (credentials.password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }

    console.log('Validation passed');
    return { isValid: true };
  }
}

export default AuthService;
