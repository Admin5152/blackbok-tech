import AuthService from './auth';
import type { User } from '../interface/interface';

// Sign Out Handler
export const handleSignOut = async (
  setUser: (user: User | null) => void, 
  navigateTo: (view: string) => void,
  notify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
): Promise<void> => {
  try {
    console.log('Starting sign out process...');
    
    const result = await AuthService.signOut();
    
    if (result.success) {
      console.log('Sign out successful, clearing user state');
      
      // Clear local user state
      setUser(null);
      
      // Show success notification if notify function provided
      if (notify) {
        notify('Successfully signed out', 'success');
      }
      
      // Navigate to home
      navigateTo('home');
    } else {
      console.error('Sign out failed:', result.error);
      
      // Handle sign out error
      if (notify) {
        notify(result.error || 'Failed to sign out', 'error');
      }
      
      // Still clear local state even on error
      console.log('Clearing user state despite error');
      setUser(null);
      navigateTo('home');
    }
  } catch (error: any) {
    console.error('Sign out handler error:', error);
    
    // Always clear local state on error
    setUser(null);
    navigateTo('home');
    
    if (notify) {
      notify('An error occurred during sign out', 'error');
    }
  }
};

// Quick Sign Out (for emergency cases)
export const quickSignOut = (
  setUser: (user: User | null) => void, 
  navigateTo: (view: string) => void
): void => {
  console.log('Performing quick sign out (emergency)');
  
  // Immediately clear local state without API call
  setUser(null);
  navigateTo('home');
};

export default handleSignOut;
