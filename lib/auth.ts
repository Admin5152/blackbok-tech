import { supabase, getSupabaseClient, isSupabaseConfigured } from './supabase';
import { authEmailConfirmRedirectUrl, authPasswordRecoveryRedirectUrl } from './siteUrl';
import type { User } from '../interface/interface';
import { normalizeCanonicalRole, type CanonicalAppRole, canAccessAdminDashboard } from './roles';
import { resolveUserDisplayName } from './userDisplayName';

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

export type RegistrationEmailState =
  | 'available'
  | 'active_account'
  | 'auth_without_profile'
  | 'profile_only'
  | 'deleted_account'
  | 'unknown';

export interface RegistrationEmailStatusResult {
  ok: boolean;
  state: RegistrationEmailState;
  exists_in_auth?: boolean;
  has_profile?: boolean;
  was_deleted?: boolean;
}

// Authentication Service
class AuthService {
  private static signupEmailStateAllowed(state: RegistrationEmailState): boolean {
    return state === 'available' || state === 'deleted_account';
  }

  private static resolveAppRole(role: unknown): CanonicalAppRole {
    return normalizeCanonicalRole(role);
  }

  /** Shown when a signed-in session is required (profile, checkout, delete account, etc.). */
  static messageSignedOut(action?: string): string {
    if (action) {
      return `You need to sign in ${action}. Use Sign in if you already have an account, or Sign up to create one.`;
    }
    return 'You are not signed in. Use Sign in if you have an account, or Sign up to register.';
  }

  /**
   * Maps raw Supabase / app auth strings to plain-language copy.
   * Use `context` so the same backend error reads correctly on login vs settings vs checkout.
   */
  static formatAuthError(
    message: string | undefined,
    context: 'login' | 'signup' | 'session' | 'password' | 'delete' | 'admin' = 'login'
  ): string {
    const m = (message || '').trim();

    if (!m) {
      switch (context) {
        case 'session':
          return 'Your session expired. Please sign in again.';
        case 'signup':
          return 'Registration could not complete. Check your details and try again.';
        case 'password':
          return 'Could not update your password. Try again or request a new reset link.';
        case 'delete':
          return this.messageSignedOut('to change account settings');
        case 'admin':
          return 'Admin sign-in required. Use an admin account or contact support.';
        default:
          return 'Sign in failed. Check your email and password, or create an account with Sign up.';
      }
    }

    if (/not authenticated|no authenticated|auth session missing|session missing|jwt expired|invalid jwt|refresh token|session not found/i.test(m)) {
      if (context === 'delete') {
        return 'Your session expired. Sign in again, then retry account deletion.';
      }
      if (context === 'password') {
        return 'This reset link expired or was already used. Go to Forgot password and request a new link.';
      }
      return 'Your session expired or you are not signed in. Please sign in again.';
    }

    if (/invalid api key|supabase is not configured|vite_supabase/i.test(m)) {
      return 'Sign-in is temporarily unavailable. Please try again later or contact BlackBox support.';
    }

    if (/too many requests|rate limit|email rate limit/i.test(m)) {
      return 'Too many attempts. Wait a few minutes, then try again.';
    }

    if (/network|fetch failed|failed to fetch|timeout/i.test(m)) {
      return 'Connection problem. Check your internet and try again.';
    }

    if (/user banned|banned/i.test(m)) {
      return 'This account cannot sign in. Contact BlackBox support for help.';
    }

    if (context === 'login') return this.formatLoginError(m);
    if (context === 'signup') return this.formatSignUpError(m);
    if (context === 'password') return this.formatPasswordError(m);
    if (context === 'delete' && /authentication error/i.test(m)) {
      return 'Could not verify your session. Sign in again and retry.';
    }

    return m;
  }

  /** User-facing copy for Supabase sign-in errors (before email-specific hints). */
  static formatLoginError(message: string | undefined): string {
    const m = (message || '').trim();
    if (!m) return 'Sign in failed. Check your email and password, or use Sign up if you are new.';
    if (/invalid login credentials|invalid credentials/i.test(m)) {
      return 'Email or password did not match. If you are new here, use Sign up first.';
    }
    if (/email not confirmed|confirm your email|email_not_confirmed/i.test(m)) {
      return 'Confirm your email using the link we sent you, then sign in again.';
    }
    if (/user not found/i.test(m)) {
      return 'No account exists for this email. Use Sign up to create one.';
    }
    return m;
  }

  /** After invalid credentials, use registration_email_status when available for clearer guidance. */
  static async explainLoginFailure(email: string, rawMessage?: string): Promise<string> {
    const raw = (rawMessage || '').trim();
    const base = this.formatLoginError(raw);

    if (!/invalid login credentials|invalid credentials/i.test(raw)) {
      return base;
    }

    const hint = await this.registrationEmailStatus(email.trim());
    if (!hint?.ok) return base;

    switch (hint.state) {
      case 'available':
        return 'No BlackBox account exists for this email yet. Use Sign up below to create one, then sign in.';
      case 'active_account':
        return 'This email is registered. The password may be wrong — try again or use Forgot password.';
      case 'deleted_account':
        return 'This account was removed. Use Sign up with the same email to start fresh, then sign in.';
      case 'auth_without_profile':
        return 'This email still has a login but no active shop account. Try Forgot password, or contact support if you closed your account recently.';
      case 'profile_only':
        return 'We could not match this email to an active login. Contact BlackBox support so we can fix your account.';
      default:
        return base;
    }
  }

  /** Maps common GoTrue sign-up error strings to clearer copy. */
  static formatSignUpError(message: string | undefined): string {
    const m = (message || '').trim();
    if (!m) return 'Registration could not complete. Try again or contact support.';
    if (/user already registered|already registered|already exists|duplicate/i.test(m)) {
      return 'This email is already on file. Use Sign in or Forgot password, or read the message below if your account was removed.';
    }
    if (/password should be at least|weak password/i.test(m)) {
      return 'Choose a stronger password (at least 6 characters).';
    }
    if (/invalid email|unable to validate email/i.test(m)) {
      return 'Enter a valid email address.';
    }
    return m;
  }

  static formatPasswordError(message: string | undefined): string {
    const m = (message || '').trim();
    if (!m) return 'Password update failed. Try again.';
    if (/session|jwt|expired|not authenticated/i.test(m)) {
      return 'This reset link expired or was already used. Request a new link from Forgot password.';
    }
    if (/same password|should be different/i.test(m)) {
      return 'Choose a new password that is different from your old one.';
    }
    return m;
  }

  static formatPasswordResetRequestError(message: string | undefined): string {
    const m = (message || '').trim();
    if (!m) return 'Could not send reset email. Check the address and try again.';
    if (/user not found|no user/i.test(m)) {
      return 'If this email is registered, you will receive a reset link shortly. Otherwise use Sign up to create an account.';
    }
    return m;
  }

  /**
   * Cross-checks `auth.users`, `public.profiles`, and `public.account_deletions`
   * (see migrations `2026_05_registration_email_status.sql` and `2026_05_account_deletions.sql`).
   * Returns null if the RPC is missing or fails — signup still works without it, with generic errors.
   */
  static async registrationEmailStatus(email: string): Promise<RegistrationEmailStatusResult | null> {
    if (!isSupabaseConfigured()) return null;
    const trimmed = email.trim();
    if (!trimmed) return null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('registration_email_status', { p_email: trimmed });
      if (error) {
        console.warn('registration_email_status:', error.message);
        return null;
      }
      const row = data as {
        ok?: boolean;
        error?: string;
        state?: string;
        exists_in_auth?: boolean;
        has_profile?: boolean;
        was_deleted?: boolean;
      } | null;
      if (!row || row.ok === false) return null;
      const state = (row.state as RegistrationEmailState) || 'unknown';
      return {
        ok: true,
        state,
        exists_in_auth: row.exists_in_auth,
        has_profile: row.has_profile,
        was_deleted: row.was_deleted,
      };
    } catch (e) {
      console.warn('registration_email_status:', e);
      return null;
    }
  }

  /** Human-readable explanation for duplicate / blocked registration. */
  static explainRegistrationState(state: RegistrationEmailState): string {
    switch (state) {
      case 'available':
        return 'This email is not taken on our login system. You can use it to register.';
      case 'active_account':
        return 'This email already has an active BlackBox account. Use Sign in, or Forgot password if you forgot your password.';
      case 'auth_without_profile':
        return 'This email is still tied to a login (for example after shop data was removed but the login was not). You cannot register again with the same email until that login is cleared. Try Sign in or Forgot password. If you closed your account and still see this, contact support to remove the leftover login, then use Sign up.';
      case 'profile_only':
        return 'This email appears in shop records without a matching login. Contact support so we can fix or release this email.';
      case 'deleted_account':
        return 'This email was used on a BlackBox account that was removed. You can use Sign up again with the same email to start fresh.';
      default:
        return 'This email cannot be used for a new registration right now. Try Sign in or Forgot password.';
    }
  }

  private static async duplicateSignupUserMessage(email: string): Promise<string> {
    const hint = await this.registrationEmailStatus(email);
    if (hint?.ok && !this.signupEmailStateAllowed(hint.state)) {
      return this.explainRegistrationState(hint.state);
    }
    return 'This email is already registered in the login system. Use Sign in or Forgot password.';
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
          const errorMessage = await this.explainLoginFailure(
            credentials.email,
            error.message
          );
          return { user: null, error: errorMessage };
        }
        
        if (data.user) {
          console.log(' Supabase auth successful, user:', data.user);
          
          // Get user profile from Supabase
          const profile = await this.getUserProfile(data.user.id);
          console.log(' User profile:', profile);

          // Must have a real app account row (handle_new_user). No profile =
          // deleted / never provisioned — do not treat as logged in.
          // Brief retries cover the rare race where the profile trigger lags behind auth.
          let profileRow = profile;
          if (!profileRow) {
            for (let i = 0; i < 5 && !profileRow; i++) {
              await new Promise((r) => setTimeout(r, 280));
              profileRow = await this.getUserProfile(data.user.id);
            }
          }

          if (!profileRow) {
            console.warn('Sign-in rejected: no profiles row for auth user', data.user.id);
            await client.auth.signOut();
            return {
              user: null,
              error:
                'No active account was found for this sign-in. If you never registered, use Sign up. If your account was deleted, create a new account with Sign up.',
            };
          }
          
          const { data: roleRows, error: rolesErr } = await client
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id);
          if (rolesErr) {
            console.warn('user_roles read on sign-in:', rolesErr.message);
          }
          const finalRole = this.resolveRoleFromUserRolesRows(
            roleRows as { role: string }[] | undefined,
            profileRow?.role,
            data.user.user_metadata?.role,
            data.user.app_metadata?.role
          );
          console.log(' User role resolved:', finalRole);
          
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: resolveUserDisplayName(profileRow?.name, data.user),
            role: finalRole
          };
          
          console.log(' Final auth user:', authUser);
          return { user: authUser };
        }
        
        console.log(' No user data returned from Supabase');
        return {
          user: null,
          error: 'Sign in did not complete. Check your email and password, or use Sign up if you are new.',
        };
      } catch (clientError: any) {
        console.error(' Error getting Supabase client:', clientError);
        return {
          user: null,
          error: this.formatAuthError(clientError?.message, 'login'),
        };
      }
    } catch (error: any) {
      console.error(' Sign in error:', error);
      return { user: null, error: this.formatAuthError(error?.message, 'login') };
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
        const emailRedirectTo = authEmailConfirmRedirectUrl();
        const trimmedName = credentials.name.trim();
        const emailTrim = credentials.email.trim();
        const metaPayload = {
          name: trimmedName,
          full_name: trimmedName,
          display_name: trimmedName,
        };

        const preStatus = await this.registrationEmailStatus(emailTrim);
        if (preStatus?.ok && !this.signupEmailStateAllowed(preStatus.state)) {
          return { user: null, error: this.explainRegistrationState(preStatus.state) };
        }

        const { data, error } = await client.auth.signUp({
          email: emailTrim,
          password: credentials.password,
          options: {
            emailRedirectTo,
            data: metaPayload,
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
          const hint = await this.registrationEmailStatus(emailTrim);
          if (hint?.ok && !this.signupEmailStateAllowed(hint.state)) {
            return { user: null, error: this.explainRegistrationState(hint.state) };
          }
          return { user: null, error: this.formatSignUpError(error.message) };
        }

        // Anti-enumeration: Supabase's default behavior for `signUp` with an
        // already-registered email is to return a user object with NO error
        // and an empty `identities` array (instead of a clear duplicate
        // error). Detect that case explicitly so the UI can show the right
        // message. See https://supabase.com/docs/reference/javascript/auth-signup
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          console.warn('⚠️ Sign-up attempted with an email that already exists (empty identities).');
          const msg = await this.duplicateSignupUserMessage(emailTrim);
          return { user: null, error: msg };
        }

        if (data.user) {
          console.log('✅ Supabase signup successful, user created but not confirmed');
          
          // Create user profile with safe method (won't fail if RLS blocks it)
          const profile = await this.createUserProfileSafe(data.user.id, emailTrim, 'user', trimmedName);

          // If signup returned a session, sync profile name (trigger may have raced or used empty meta).
          if (data.session && trimmedName) {
            const letter = trimmedName.charAt(0).toUpperCase();
            const { error: syncErr } = await client
              .from('profiles')
              .update({ name: trimmedName, avatar_letter: letter })
              .eq('id', data.user.id);
            if (syncErr) {
              console.warn('Profile name sync after signup skipped:', syncErr.message);
            }
          }
          
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
            name: resolveUserDisplayName(trimmedName, data.user),
            role: 'user'
          };
          
          console.log('✅ User created successfully, awaiting email confirmation:', authUser);
          return { user: authUser };
        }

        console.log('❌ No user data returned from Supabase');
        return {
          user: null,
          error: 'Registration did not complete. Check your email and try again.',
        };
      } catch (clientError: any) {
        console.error('❌ Error getting Supabase client:', clientError);
        return { user: null, error: this.formatAuthError(clientError?.message, 'signup') };
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      return { user: null, error: this.formatAuthError(error?.message, 'signup') };
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

  /**
   * Resolve canonical role from user_roles rows (admin > staff > user).
   * Avoids maybeSingle() failing when multiple rows exist.
   */
  private static resolveRoleFromUserRolesRows(
    rows: { role: string }[] | null | undefined,
    profileRole: unknown,
    userMetaRole: unknown,
    appMetaRole: unknown
  ): CanonicalAppRole {
    const list = (rows ?? [])
      .map((r) => String(r.role ?? '').toLowerCase())
      .filter(Boolean);
    if (list.includes('admin')) return 'admin';
    if (list.includes('staff')) return 'staff';
    if (list.length > 0) return this.resolveAppRole(list[0]);
    return this.resolveAppRole(
      profileRole ?? userMetaRole ?? appMetaRole
    );
  }

  /**
   * True only when Supabase has validated the JWT and the user is allowed
   * to open the admin dashboard (admin or staff).
   */
  static async verifyLiveAdminOrStaffSession(): Promise<AuthUser | null> {
    const u = await this.getCurrentUser();
    if (!u || !canAccessAdminDashboard(u.role)) return null;
    return u;
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
      
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) {
        console.warn('auth.getUser() failed or empty:', error?.message ?? 'no user');
        return null;
      }
      const user = data.user;
      console.log('Current user from Supabase:', user);

      const profile = await this.getUserProfile(user.id);
      if (!profile) {
        console.warn('Session cleared: auth user has no profiles row (deleted or invalid).', user.id);
        await client.auth.signOut();
        return null;
      }
      
      console.log('User profile:', profile);
      
      const { data: roleRows, error: rolesErr } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesErr) {
        console.warn('user_roles read error (falling back to profile):', rolesErr.message);
      }

      const finalRole = this.resolveRoleFromUserRolesRows(
        roleRows as { role: string }[] | undefined,
        profile?.role,
        user.user_metadata?.role,
        user.app_metadata?.role
      );
      console.log('User role resolved:', finalRole);
      
      return {
        id: user.id,
        email: user.email || '',
        name: resolveUserDisplayName(profile?.name, user),
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

  /** Resend signup / email confirmation (for users with unconfirmed email). */
  static async resendEmailConfirmation(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase is not configured.' };
      }
      if (!email?.trim()) {
        return { success: false, error: 'No email address on file.' };
      }
      const client = getSupabaseClient();
      const emailRedirectTo = authEmailConfirmRedirectUrl();
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to send verification email.' };
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
      const redirectTo = authPasswordRecoveryRedirectUrl();

      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        return { success: false, error: this.formatPasswordResetRequestError(error.message) };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.formatPasswordResetRequestError(error?.message),
      };
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
        return { success: false, error: this.formatPasswordError(error.message) };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.formatPasswordError(error?.message) };
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
