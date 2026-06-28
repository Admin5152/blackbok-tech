import { useIdleLogout } from '../hooks/useIdleLogout';

/**
 * Mount once inside `AppContext.Provider` (RootComponent) so idle logout has
 * access to live auth state and navigation. Renders no UI — optional warning
 * modal can be added here later using `IDLE_WARNING_BEFORE_MS`.
 */
export function SessionTimeoutProvider(): null {
  useIdleLogout();
  return null;
}
