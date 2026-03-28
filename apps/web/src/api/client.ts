import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout for all requests
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Map API error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'NOT_FOUND': 'The requested resource was not found.',
  'CONFLICT': 'This resource already exists.',
  'TOO_MANY_REQUESTS': 'Too many requests. Please wait a moment and try again.',
  'TIMEOUT': 'Request took too long. Please try again.',
  'NETWORK_ERROR': 'Network connection failed. Please check your internet and try again.',
  'INTERNAL_ERROR': 'An unexpected error occurred. Our team has been notified.',
  'UNHANDLED_ERROR': 'An unexpected error occurred. Please try again.',
  'BULK_SCORE_ERROR': 'Failed to score leads. Please check your data and try again.',
  'SERVICE_UNAVAILABLE': 'Server is temporarily unavailable. Please try again shortly.',
  'OFFLINE_ERROR': 'You appear to be offline. Please check your internet connection.',
};

// Determine if an error is retryable
function isRetryableError(status: number | undefined): boolean {
  if (!status) return false;
  return [408, 429, 502, 503, 504].includes(status);
}

// Determine if error is due to network issue (not server error)
function isNetworkError(error: any): boolean {
  const code = error.code;
  const message = error.message || '';
  return (
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    code === 'ENOTFOUND' ||
    message.includes('timeout') ||
    message.includes('Network') ||
    !error.response // No response from server
  );
}

api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const errorCode = err.response?.data?.error?.code;
    const errorStatus = err.response?.status;
    const userMessage = errorMessages[errorCode] || err.response?.data?.error?.message || 'An error occurred';

    // Only try to refresh if it's a 401, not an auth endpoint, and we haven't already retried
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
    if (errorStatus === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshSubscribers = [];

        try {
          // Try to refresh the token using the refresh endpoint
          // Note: This requires storing refreshToken in auth store
          const state = useAuthStore.getState();

          // If we don't have a refresh token, log out
          if (!state.refreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshResponse = await axios.post('/api/v1/auth/refresh', {
            refreshToken: state.refreshToken,
          });

          const { accessToken, refreshToken } = refreshResponse.data.data;

          // Update the auth store with new tokens
          state.setAuth(accessToken, state.user!, refreshToken);

          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Notify all waiting requests with new token
          onRefreshed(accessToken);

          isRefreshing = false;

          // Retry the original request with new token
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, log out user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          isRefreshing = false;
          return Promise.reject(refreshError);
        }
      } else {
        // If already refreshing, queue this request to retry after refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
    }

    // Handle 401 errors for non-refresh requests
    if (errorStatus === 401 && originalRequest._retry) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }

    // Detect and flag network errors
    if (isNetworkError(err)) {
      err.isNetworkError = true;
      err.isRetryable = true;
    }

    // For retryable errors, flag them
    if (isRetryableError(errorStatus)) {
      err.isRetryable = true;
    }

    // Attach error code for use in catch handlers
    if (errorCode) {
      err.errorCode = errorCode;
      err.userMessage = userMessage;
    }

    return Promise.reject(err);
  }
);

// Export error utilities for use in components
export function getErrorMessage(error: any): string {
  return error?.userMessage || error?.response?.data?.error?.message || 'An error occurred';
}

export function getErrorCode(error: any): string | undefined {
  return error?.errorCode || error?.response?.data?.error?.code;
}

export function isRetryable(error: any): boolean {
  return error?.isRetryable || isRetryableError(error?.response?.status);
}
