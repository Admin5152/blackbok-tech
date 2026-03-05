// Mobile navigation utilities for better back button handling
export const setupMobileBackButton = () => {
  // Handle Android hardware back button
  const handleBackButton = (event: PopStateEvent) => {
    console.log('Browser back button pressed');
    // Allow default browser behavior
  };

  // Listen for browser back button events
  window.addEventListener('popstate', handleBackButton);

  // Cleanup function
  return () => {
    window.removeEventListener('popstate', handleBackButton);
  };
};

// Prevent app from closing on back button when there's history
export const preventAppClose = () => {
  // Add a small history entry to prevent immediate app close
  if (window.history.length === 1) {
    window.history.pushState({}, '', window.location.href);
  }
};

// Handle mobile viewport issues
export const setupMobileViewport = () => {
  // Prevent zoom on mobile
  const metaViewport = document.querySelector('meta[name="viewport"]');
  if (metaViewport) {
    metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
};
