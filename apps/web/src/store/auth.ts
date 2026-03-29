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
  token: string | null;         // Kept for backward compat (WebSocket handshake needs token)
  refreshToken: string | null;  // Kept for backward compat (will be phased out as cookies take over)
  user: AuthUser | null;
  isAuthenticated: boolean;
  needsSetup: boolean;
  _hydrated: boolean;
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
      setAuth: (token, user, refreshToken) => set({
        token,         // Still stored for WebSocket auth handshake
        user,
        refreshToken: refreshToken || null,
        isAuthenticated: true,
      }),
      setNeedsSetup: (value) => set({ needsSetup: value }),
      logout: () => set({ token: null, refreshToken: null, user: null, isAuthenticated: false, needsSetup: false }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'leadflow-auth',
      // Only persist user info and auth state — tokens are stored in httpOnly cookies
      // token is persisted only for WebSocket handshake (Socket.IO can't send cookies)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        needsSetup: state.needsSetup,
      }),
      onRehydrateStorage: (store) => (storedState) => {
        store.setHydrated();
        if (storedState) {
          storedState.setHydrated?.();
        }
      },
    }
  )
);
