import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  needsSetup: boolean;
  _hydrated: boolean; // Track if hydration from localStorage is complete
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void;
  setNeedsSetup: (value: boolean) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      needsSetup: false,
      _hydrated: true,
      setAuth: (token, user, refreshToken) => set({ token, user, refreshToken: refreshToken || null, isAuthenticated: true }),
      setNeedsSetup: (value) => set({ needsSetup: value }),
      logout: () => set({ token: null, refreshToken: null, user: null, isAuthenticated: false, needsSetup: false }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'leadflow-auth',
      onRehydrateStorage: (store) => (storedState) => {
        // Mark hydration complete even if there is no stored state (fresh install)
        store.setHydrated();

        if (storedState) {
          storedState.setHydrated?.();
        }
      },
    }
  )
);
