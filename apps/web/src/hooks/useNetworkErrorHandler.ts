import { useCallback } from 'react';
import { showError } from '../components/Toast';

/**
 * Hook for handling network errors with appropriate user-friendly messages
 * Detects timeout, offline, and transient errors
 */
export function useNetworkErrorHandler() {
  const handleNetworkError = useCallback(
    (error: any, context?: { action?: string; resource?: string }) => {
      const axiosError = error;
      const status = axiosError?.response?.status;
      const message = axiosError?.message || '';
      const code = axiosError?.code;

      let userMessage = 'An error occurred. Please try again.';
      let errorCode = 'UNKNOWN_ERROR';
      let isRetryable = false;

      // Network/Connection errors
      if (!axiosError?.response) {
        if (code === 'ECONNABORTED' || message.includes('timeout')) {
          userMessage = `Request timed out. ${context?.action || 'Please try again'}.`;
          errorCode = 'TIMEOUT_ERROR';
          isRetryable = true;
        } else if (code === 'ERR_NETWORK' || message.includes('Network')) {
          userMessage = 'Network error. Please check your connection and try again.';
          errorCode = 'NETWORK_ERROR';
          isRetryable = true;
        } else if (navigator.onLine === false) {
          userMessage = 'You are offline. Please check your internet connection.';
          errorCode = 'OFFLINE_ERROR';
          isRetryable = true;
        } else {
          userMessage = `Failed to connect to server. ${context?.action || 'Please try again'}.`;
          errorCode = 'CONNECTION_ERROR';
          isRetryable = true;
        }
      }
      // Server/HTTP errors
      else if (status) {
        switch (status) {
          case 400:
            userMessage = axiosError?.response?.data?.error?.message || 'Invalid input. Please check your data.';
            errorCode = 'VALIDATION_ERROR';
            break;

          case 401:
            userMessage = 'Your session has expired. Please log in again.';
            errorCode = 'UNAUTHORIZED';
            break;

          case 403:
            userMessage = 'You do not have permission to perform this action.';
            errorCode = 'FORBIDDEN';
            break;

          case 404:
            userMessage = `${context?.resource || 'Resource'} not found. It may have been deleted.`;
            errorCode = 'NOT_FOUND';
            break;

          case 408:
            userMessage = 'Request timed out. Please try again.';
            errorCode = 'TIMEOUT_ERROR';
            isRetryable = true;
            break;

          case 409:
            userMessage = axiosError?.response?.data?.error?.message || 'This resource already exists.';
            errorCode = 'CONFLICT';
            break;

          case 422:
            const field = axiosError?.response?.data?.error?.field;
            const detail = axiosError?.response?.data?.error?.message;
            userMessage = field ? `Invalid ${field}: ${detail}` : detail || 'Invalid data provided.';
            errorCode = 'UNPROCESSABLE_ENTITY';
            break;

          case 429:
            userMessage = 'Too many requests. Please wait a moment before trying again.';
            errorCode = 'RATE_LIMITED';
            isRetryable = true;
            break;

          case 500:
            userMessage = 'Server error. Our team has been notified. Please try again in a moment.';
            errorCode = 'INTERNAL_SERVER_ERROR';
            isRetryable = true;
            break;

          case 502:
          case 503:
          case 504:
            userMessage = 'Server is temporarily unavailable. Please try again shortly.';
            errorCode = 'SERVICE_UNAVAILABLE';
            isRetryable = true;
            break;

          default:
            userMessage = axiosError?.response?.data?.error?.message || `Error (${status}). Please try again.`;
            errorCode = axiosError?.response?.data?.error?.code || 'HTTP_ERROR';
            isRetryable = status >= 500;
        }
      }

      return {
        userMessage,
        errorCode,
        isRetryable,
        originalError: error,
      };
    },
    []
  );

  const showNetworkError = useCallback(
    (error: any, retryFn?: () => void, context?: { action?: string; resource?: string }) => {
      const { userMessage, errorCode, isRetryable } = handleNetworkError(error, context);

      showError(userMessage, errorCode, isRetryable && retryFn ? retryFn : undefined);
    },
    [handleNetworkError]
  );

  return { handleNetworkError, showNetworkError };
}
