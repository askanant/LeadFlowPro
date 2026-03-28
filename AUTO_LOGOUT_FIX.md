# Auto-Logout Fix - Complete Solution

## Problem
Users were being logged out automatically after 15 minutes of inactivity or while navigating the app, causing frustration and loss of productivity.

## Root Cause
1. **JWT Access Token Expiry**: Set to only 15 minutes (JWT_EXPIRES_IN="15m")
2. **No Automatic Token Refresh**: When the accessToken expired, the next API request would return 401, triggering immediate logout
3. **No Refresh Token Storage**: The frontend wasn't storing the refreshToken needed to get a new accessToken

## Solution Implemented

### 1. **Increased JWT Access Token Lifetime**
- **File**: `apps/api/.env`
- **Change**: `JWT_EXPIRES_IN` from "15m" to "2h"
- **Impact**: Users can work for 2 hours before needing to refresh token
- **Refresh Token**: Still valid for 7 days (no change needed)

### 2. **Implemented Automatic Token Refresh in Axios Interceptor**
- **File**: `apps/web/src/api/client.ts`
- **Changes**:
  - When a 401 response occurs, automatically call `/api/v1/auth/refresh`
  - Use the stored `refreshToken` to get a new `accessToken`
  - Retry the original request with new token
  - Handle concurrent requests by queueing them while refresh is in progress
  - Only log out if refresh fails (e.g., refreshToken expired)

**How it works**:
```
User Request → API returns 401 (token expired)
    ↓
Axios Interceptor catches 401
    ↓
Automatically calls POST /api/v1/auth/refresh
    ↓
Gets new accessToken & refreshToken
    ↓
Retries original request with new token
    ↓
Request succeeds (user doesn't see logout)
```

### 3. **Updated Auth Store to Store Refresh Token**
- **File**: `apps/web/src/store/auth.ts`
- **Changes**:
  - Added `refreshToken: string | null` field to AuthState
  - Updated `setAuth()` to accept optional refreshToken parameter
  - Updated `logout()` to clear refreshToken too

### 4. **Updated Auth API Calls**
- **File**: `apps/web/src/api/auth.ts`
- **Changes**:
  - `login()` now passes `refreshToken` to `setAuth()`
  - `register()` now passes `refreshToken` to `setAuth()`
  - Ensures refreshToken is stored whenever user logs in

### 5. **Implemented Proactive Token Refresh**
- **File**: `apps/web/src/hooks/useTokenRefresh.ts` (NEW)
- **Feature**: Automatically refreshes token 5 minutes BEFORE it expires
- **Benefits**:
  - Users never see expiration errors
  - Completely seamless experience
  - Background operation doesn't interrupt user
- **How it works**:
  1. Parse JWT to extract expiry time
  2. Schedule refresh to occur 5 minutes before expiry
  3. When scheduled time arrives, refresh the token
  4. Schedule next refresh with new token
  5. Repeat until user logs out

### 6. **Integrated Token Refresh Hook into App**
- **File**: `apps/web/src/App.tsx`
- **Changes**:
  - Imported `useTokenRefresh` hook
  - Created `AppRoutes` wrapper component that calls the hook
  - Hook runs automatically whenever user is authenticated
  - Stops running when user logs out

## User Experience After Fix

### Before
- User works for 15 minutes
- Token expires
- User tries to click something
- Suddenly redirected to login ❌

### After
- User works for 2 hours without worrying about token expiry
- At 1h 55m, token is automatically refreshed in background (user doesn't notice)
- User can continue working indefinitely (as long as 7-day refresh token is valid)
- Only logs out if refresh token expires or user explicitly logs out ✅

## Technical Details

### Token Lifecycle
- **Access Token**: 2 hours
  - Used for API requests (sent as Bearer token in header)
  - Automatically refreshed 5 minutes before expiry

- **Refresh Token**: 7 days
  - Stored securely in localStorage (via Zustand persist)
  - Only sent to `/api/v1/auth/refresh` endpoint
  - If expired, user must log in again

- **Refresh Process**: Happens automatically, no user action needed

### Error Handling
- If refresh succeeds: Original request retried automatically
- If refresh fails: User is logged out and redirected to login
- Concurrent requests: Queued and retried together after refresh

### Security
- Refresh token only sent to `/api/v1/auth/refresh` endpoint
- Axios interceptor prevents multiple simultaneous refresh calls
- Original request retried only after refresh completes
- Malformed tokens cause graceful logout, not crash

## Testing the Fix

### Manual Test
1. Log in to the application
2. Navigate around (campaigns, leads, etc.)
3. Wait 2 hours - token should still be valid
4. At the 1h 55m mark, refresh happens automatically in background
5. Observe: No logout, seamless experience

### Simulated Expiry Test
1. In browser DevTools, modify JWT token to an expired one
2. Try to make an API request
3. Observe: Token automatically refreshes and request succeeds

## Files Modified
1. `apps/api/.env` - Increased JWT_EXPIRES_IN to 2h
2. `apps/web/src/api/client.ts` - Added automatic refresh on 401
3. `apps/web/src/store/auth.ts` - Added refreshToken field
4. `apps/web/src/api/auth.ts` - Pass refreshToken to setAuth()
5. `apps/web/src/App.tsx` - Integrated token refresh hook
6. `apps/web/src/hooks/useTokenRefresh.ts` - NEW: Proactive refresh hook

## Future Improvements (Optional)
- Add "Remember Me" checkbox to extend refresh token validity
- Add logout warning when approaching token expiry
- Add automatic session timeout (different from token expiry)
- Store refresh token in secure HTTP-only cookie (requires backend change)
- Implement token rotation (issue new refresh token on each refresh)
