import { supabase, getSupabaseClient, isSupabaseConfigured } from './supabase';
import type { User } from '../interface/interface';

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error?: string;
}

// Authentication Service
class AuthService {
  // Sign In
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting sign in with:', credentials.email);
      
      // Check for admin credentials first
      if (credentials.email === 'BlackBox@gmail.com' && credentials.password === 'BlackBox') {
        console.log('Admin credentials detected');
        const adminUser: AuthUser = {
          id: 'admin-001',
          email: 'BlackBox@gmail.com',
          name: 'Admin User',
          role: 'admin'
        };
        return { user: adminUser };
      }

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.error('Supabase is not configured');
        return { user: null, error: 'Database connection error. Please try again later.' };
      }

      // Get Supabase client with error handling
      const client = getSupabaseClient();
      
      // Authenticate with Supabase
      console.log('Attempting Supabase authentication...');
      const { data, error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        console.log('Supabase auth successful, user:', data.user);
        
        // Get user profile from Supabase
        const profile = await this.getUserProfile(data.user.id);
        console.log('User profile:', profile);
        
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: profile?.name || data.user.email?.split('@')[0] || 'User',
          role: profile?.role || 'user'
        };
        
        console.log('Final auth user:', authUser);
        return { user: authUser };
      }

      return { user: null, error: 'Authentication failed' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { user: null, error: error.message || 'Authentication failed' };
    }
  }

  // Sign Up
  static async signUp(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting sign up with:', credentials.email);
      
      const client = getSupabaseClient();
      
      const { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('Supabase signup response:', { data, error });

      if (error) {
        console.error('Supabase signup error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        console.log('Supabase signup successful, creating profile...');
        
        // Create user profile
        await this.createUserProfile(data.user.id, credentials.email);
        
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.email?.split('@')[0] || 'User',
          role: 'user'
        };
        
        console.log('Final auth user after signup:', authUser);
        return { user: authUser };
      }

      return { user: null, error: 'Registration failed' };
    } catch (error: any) {
      console.error('Sign up error:', error);
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

      const profile = await this.getUserProfile(user.id);
      console.log('User profile:', profile);
      
      return {
        id: user.id,
        email: user.email || '',
        name: profile?.name || user.email?.split('@')[0] || 'User',
        role: profile?.role || 'user'
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
  static async createUserProfile(userId: string, email: string, role: 'user' | 'admin' = 'user') {
    try {
      console.log('Creating user profile:', { userId, email, role });
      
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
          name: email.split('@')[0],
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
