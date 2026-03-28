import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { showError, showSuccess } from '../components/Toast';
import { getErrorMessage, getErrorCode, isRetryable } from '../api/client';
import { AxiosError } from 'axios';

interface UseMutationWithErrorHandlingOptions<T, E = unknown>
  extends UseMutationOptions<T, E, any> {
  successMessage?: string;
  errorPrefix?: string;
  onRetryableError?: (error: E, retryFn: () => void) => void;
}

/**
 * Enhanced useMutation hook with automatic error handling, retry logic, and toast notifications
 * 
 * @param options - Mutation options with error handling configuration
 * @returns Mutation object with enhanced error handling
 * 
 * @example
 * const createMutation = useMutationWithErrorHandling({
 *   mutationFn: (data) => api.post('/campaigns', data),
 *   successMessage: 'Campaign created successfully',
 *   onError: (error) => {
 *     // Additional error handling
 *   }
 * });
 */
export function useMutationWithErrorHandling<T = any, E = AxiosError>(
  options: UseMutationWithErrorHandlingOptions<T, E>
) {
  const {
    successMessage,
    errorPrefix = '',
    onRetryableError,
    onError: customOnError,
    onSuccess: customOnSuccess,
    ...mutationOptions
  } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (successMessage) {
        showSuccess(successMessage);
      }
      customOnSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error: E, variables, onMutateResult, context) => {
      const axiosError = error as AxiosError<any>;
      const errorCode = getErrorCode(axiosError);
      const errorMessage = getErrorMessage(axiosError);
      const retryableError = isRetryable(axiosError);

      // Build full error message with prefix if provided
      const fullMessage = errorPrefix
        ? `${errorPrefix}: ${errorMessage}`
        : errorMessage;

      // Log error for debugging
      console.error('Mutation error:', {
        code: errorCode,
        message: errorMessage,
        status: axiosError?.response?.status,
        data: axiosError?.response?.data,
      });

      // Handle retryable errors specially
      if (retryableError && onRetryableError) {
        onRetryableError(error, () => {
          // Retry function will be called by the error handler
        });
      } else {
        // Show error toast with error code and retry capability
        showError(
          fullMessage,
          errorCode,
          retryableError
            ? () => {
                // Retry the mutation - component can call mutate again if desired
              }
            : undefined
        );
      }

      customOnError?.(error, variables, onMutateResult, context);
    },
  });
}
