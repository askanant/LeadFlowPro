import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';

/**
 * Hook that proactively refreshes the JWT token before it expires.
 * This prevents users from being logged out unexpectedly.
 *
 * Refreshes the token when 5 minutes remain before expiry.
 */
export function useTokenRefresh() {
  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token, refreshToken, _hydrated } = useAuthStore();

  useEffect(() => {
    // Wait for hydration to complete before setting up refresh
    if (!_hydrated) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Only set up refresh if we have both tokens
    if (!token || !refreshToken) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Helper to schedule the next refresh
    const scheduleRefresh = () => {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Parse JWT to get expiry time
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Refresh 5 minutes before expiry (or immediately if already close)
        const refreshInMs = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000);

        refreshIntervalRef.current = setTimeout(async () => {
          try {
            const response = await api.post('/auth/refresh', {
              refreshToken,
            });

            const { accessToken: newToken, refreshToken: newRefreshToken } = response.data.data ?? response.data;
            useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user!, newRefreshToken);

            // Schedule the next refresh with the new token
            scheduleRefresh();
          } catch (error) {
            console.error('Token refresh failed:', error);
            // If refresh fails, the user will be logged out on the next API call
            // (handled by axios interceptor)
          }
        }, refreshInMs);
      } catch (error) {
        console.error('Failed to parse JWT:', error);
      }
    };

    scheduleRefresh();

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [token, refreshToken, _hydrated]);
}
