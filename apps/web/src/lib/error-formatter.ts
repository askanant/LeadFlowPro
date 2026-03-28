/**
 * Error message formatter for providing contextual, user-friendly error messaging
 * Replaces generic error messages with specific, actionable guidance
 */

interface ErrorContext {
  action?: 'scoring' | 'loading' | 'saving' | 'deleting' | 'fetching';
  resource?: 'leads' | 'campaign' | 'workflow' | 'user' | 'company';
  retryable?: boolean;
}

export function formatErrorMessage(
  error: any,
  context?: ErrorContext
): { message: string; retryable: boolean } {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code || error?.code;
  const originalMessage = error?.response?.data?.error?.message || error?.message || '';

  // Network/Connection errors
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || originalMessage.includes('timeout')) {
      return {
        message: `The ${context?.action || 'request'} took too long. Please check your connection and try again.`,
        retryable: true,
      };
    }
    if (error?.code === 'ERR_NETWORK' || originalMessage.includes('Network')) {
      return {
        message: `Network error: Unable to reach the server. Please check your internet connection.`,
        retryable: true,
      };
    }
    return {
      message: `Connection failed. Please check your internet and try again.`,
      retryable: true,
    };
  }

  // Server errors with context
  const resource = context?.resource || 'resource';
  const action = context?.action || 'operation';

  switch (status) {
    case 400:
      return {
        message: `Invalid input. ${originalMessage || `Please check your ${resource} data and try again.`}`,
        retryable: false,
      };

    case 401:
      return {
        message: 'Your session has expired. Please log in again to continue.',
        retryable: false,
      };

    case 403:
      return {
        message: `You don't have permission to ${action} this ${resource}.`,
        retryable: false,
      };

    case 404:
      return {
        message: `The ${resource} you're looking for was not found. It may have been deleted.`,
        retryable: false,
      };

    case 408:
      return {
        message: `Request timeout. The server took too long to respond. Please try again.`,
        retryable: true,
      };

    case 409:
      return {
        message: `This ${resource} already exists. Please use a different name or ID.`,
        retryable: false,
      };

    case 422:
      const field = error?.response?.data?.error?.field;
      return {
        message: field
          ? `Invalid ${field}: ${originalMessage}`
          : `Invalid data provided. Please check and try again.`,
        retryable: false,
      };

    case 429:
      return {
        message: `Too many requests. Please wait a moment before trying again (rate limit).`,
        retryable: true,
      };

    case 500:
      return {
        message: `Server error while ${action}. Our team has been notified. Please try again shortly.`,
        retryable: true,
      };

    case 502:
    case 503:
    case 504:
      return {
        message: `Server is temporarily unavailable. Please try again in a few moments.`,
        retryable: true,
      };

    default:
      return {
        message: originalMessage || `Failed to ${action} ${resource}. Please try again.`,
        retryable: status && status >= 500,
      };
  }
}

/**
 * Format bulk operation errors (multiple items, partial failures)
 */
export function formatBulkErrorMessage(
  total: number,
  successful: number,
  failed: number,
  errors?: string[]
): { message: string; details: string } {
  const failureRate = ((failed / total) * 100).toFixed(0);

  if (successful === 0) {
    return {
      message: `Failed to process all ${total} items.`,
      details: `No items were successfully processed. ${
        errors?.[0] ? `Error: ${errors[0]}` : 'Please check your data and try again.'
      }`,
    };
  }

  if (failed === 0) {
    return {
      message: `Successfully processed all ${total} items!`,
      details: `All ${total} items completed successfully.`,
    };
  }

  return {
    message: `Partial success: ${successful}/${total} items processed.`,
    details: `${failed} items (${failureRate}%) failed. ${
      errors?.[0] ? `First error: ${errors[0]}` : 'Check the failed items and try again.'
    }`,
  };
}

/**
 * Get retry guidance based on error type
 */
export function getRetryGuidance(error: any): string | null {
  const status = error?.response?.status;
  const code = error?.code;

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return 'Try again in a moment. The server may be processing your request.';
  }

  if (status === 429) {
    return 'Wait a few moments and try again. The system is rate-limited.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Try again in a few moments.';
  }

  if (!error?.response) {
    return 'Check your internet connection and try again.';
  }

  return null;
}
