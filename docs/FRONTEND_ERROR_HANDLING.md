# Frontend Error Handling Guide

This guide covers the enhanced error handling system implemented in Phase 7 of the security hardening effort.

## Overview

The frontend error handling system provides:
- User-friendly error messages mapped from API error codes
- Automatic retry logic for transient errors (408, 429, 502, 503, 504)
- Enhanced Toast notifications with error codes for debugging
- Custom React Query hook for consistent mutation error handling
- Loading states and disabled buttons during operations

## Components & Files

### 1. Enhanced Toast Component (src/components/Toast.tsx)

The Toast component now supports:
- Error codes display for debugging
- Retry buttons for retryable errors
- Better styling with error context

#### Updated Toast Interface
```typescript
interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  errorCode?: string;
  retryFn?: () => void;
}
```

#### Usage Examples
```typescript
showError('Failed to create campaign');
showError('Failed to create campaign', 'VALIDATION_ERROR');
showError('Connection failed', 'TIMEOUT', () => {
  createMutation.mutate(formData);
});
showSuccess('Campaign created!');
showWarning('This action cannot be undone');
showInfo('Loading data...');
```

### 2. Enhanced API Client (src/api/client.ts)

The API client now provides:
- Automatic error code mapping to user-friendly messages
- Retryable error detection (408, 429, 502, 503, 504)
- Error metadata attachment to axios errors

#### Error Message Mapping
```typescript
const errorMessages: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'NOT_FOUND': 'The requested resource was not found.',
  'CONFLICT': 'This resource already exists.',
  'TOO_MANY_REQUESTS': 'Too many requests. Please wait a moment and try again.',
  'TIMEOUT': 'Request took too long. Please try again.',
  'INTERNAL_ERROR': 'An unexpected error occurred. Our team has been notified.',
};
```

#### Exported Utility Functions
```typescript
getErrorMessage(error);
getErrorCode(error);
isRetryable(error);
```

### 3. Custom Hook (src/hooks/useMutationWithErrorHandling.ts)

A React Query wrapper with integrated error handling for mutations.

## Implementation Examples

### Basic Form Submission with Error Handling

```typescript
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export function CreateCampaignForm() {
  const [formData, setFormData] = useState({ name: '', budget: 0 });
  
  const mutation = useMutationWithErrorHandling({
    mutationFn: (data) => api.post('/campaigns', data),
    successMessage: 'Campaign created successfully',
    errorPrefix: 'Failed to create campaign',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={mutation.isPending}
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-2"
      >
        {mutation.isPending && <LoadingSpinner className="w-4 h-4" />}
        {mutation.isPending ? 'Creating...' : 'Create Campaign'}
      </button>
    </form>
  );
}
```

## Best Practices

1. Always Provide Context with Errors
2. Use Loading States
3. Display Loading Indicators
4. Disable Form Inputs During Mutation
5. Show Error Feedback

## Error Codes Reference

- VALIDATION_ERROR: Please check your input and try again.
- UNAUTHORIZED: Your session has expired. Please log in again.
- FORBIDDEN: You do not have permission to perform this action.
- NOT_FOUND: The requested resource was not found.
- CONFLICT: This resource already exists.
- TOO_MANY_REQUESTS: Too many requests. Please wait a moment and try again.
- TIMEOUT: Request took too long. Please try again.
- INTERNAL_ERROR: An unexpected error occurred. Our team has been notified.

## Common Pitfalls

1. Not disabling inputs during mutation
2. Not showing loading feedback
3. Ignoring retryable errors
4. Showing technical error messages

See also: SECURITY.md, DEV_ADMIN_SETUP.md
