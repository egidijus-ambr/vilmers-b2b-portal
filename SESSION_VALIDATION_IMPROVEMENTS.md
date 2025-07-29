# Session Validation Improvements

## Overview

This document outlines the improvements made to the session validation system to properly handle JWT token expiration and prevent the issue where users see both the account profile page and login button simultaneously.

## Problems Identified

1. **No JWT Token Validation**: The system only checked if a JWT token existed in cookies but didn't validate if it was still valid or expired.

2. **No Error Handling for Invalid Tokens**: When `getMe()` failed due to an invalid/expired token, the error was caught and `null` was returned, but the invalid token remained in cookies.

3. **Cache Issues**: The Apollo client cache might return stale data even when tokens were invalid.

4. **No Automatic Token Cleanup**: Invalid tokens were not automatically removed from cookies.

5. **Inconsistent UI State**: The navigation showed login buttons even when customer data was available but tokens were expired.

## Solutions Implemented

### 1. Server-Side Session Validation (`src/lib/util/session-validation.ts`)

Created a comprehensive session validation system that:

- **Validates JWT Token Expiration**: Checks if the token is expired by decoding the JWT payload
- **Attempts Customer Data Fetch**: Tries to fetch customer data to validate token validity
- **Automatic Cleanup**: Removes invalid tokens and clears cache when authentication fails
- **Error Handling**: Properly categorizes authentication errors and handles them appropriately

Key functions:

- `validateSession()`: Main validation function that checks both token expiration and API connectivity
- `cleanupInvalidSession()`: Removes invalid tokens and clears cache
- `isTokenExpired()`: Client-side JWT expiration check
- `getValidatedAuthHeaders()`: Enhanced auth headers getter with validation

### 2. Client-Side Session Validation Hook (`src/lib/hooks/use-session-validation.tsx`)

Created a React hook for client-side token validation that:

- **No API Calls**: Checks JWT token expiration without making API calls
- **Periodic Validation**: Automatically checks token expiration every 5 minutes
- **Cross-Tab Synchronization**: Listens for token changes in other browser tabs
- **Automatic Refresh**: Triggers page refresh when expired tokens are detected

Key features:

- `useSessionValidation()`: Main hook for session state management
- `withSessionValidation()`: HOC for protecting authenticated routes
- Automatic cleanup when tokens expire
- Real-time session state updates

### 3. Updated Customer Data Retrieval (`src/lib/data/customer.ts`)

Modified the `retrieveCustomer()` function to:

- Use the new session validation system
- Properly handle token expiration
- Automatically clean up invalid sessions
- Provide better error logging and debugging

### 4. Enhanced Navigation Component (`src/modules/layout/templates/nav/index.tsx`)

Updated the navigation to:

- Use client-side session validation alongside server-side customer data
- Show login button only when session is truly invalid
- Show account dropdown only when both customer data exists and token is valid
- Handle loading states properly

Key logic:

```typescript
const isLoggedIn = customer && isSessionValid && !isSessionLoading
```

## How It Works

### Server-Side Flow

1. **Page Load**: `retrieveCustomer()` is called during server-side rendering
2. **Session Validation**: `validateSession()` checks token validity and fetches customer data
3. **Token Expiration Check**: JWT payload is decoded to check expiration time
4. **API Validation**: Attempts to fetch customer data to validate token with backend
5. **Cleanup**: If validation fails, removes invalid tokens and clears cache
6. **Return Result**: Returns customer data if valid, null if invalid

### Client-Side Flow

1. **Component Mount**: `useSessionValidation()` hook initializes
2. **Token Check**: Reads JWT from cookies and checks expiration
3. **Periodic Validation**: Sets up 5-minute interval for token checking
4. **Cross-Tab Sync**: Listens for storage events to sync across tabs
5. **UI Updates**: Updates navigation state based on session validity
6. **Auto Refresh**: Triggers page refresh when expired tokens are detected

### Navigation Logic

The navigation component now uses a combined approach:

```typescript
// Server-side customer data + Client-side token validation
const isLoggedIn = customer && isSessionValid && !isSessionLoading

// Show appropriate UI based on login state
{
  isLoggedIn ? <AccountDropdown customer={customer} /> : <LoginButton />
}
```

## Benefits

1. **Proper Token Validation**: JWT tokens are now properly validated for expiration
2. **Automatic Cleanup**: Invalid tokens are automatically removed
3. **Consistent UI State**: Navigation always shows the correct login/logout state
4. **Better User Experience**: Users are automatically redirected when sessions expire
5. **Security**: Expired tokens can't be used to access protected resources
6. **Performance**: Client-side validation reduces unnecessary API calls
7. **Real-time Updates**: Session state updates across browser tabs

## Testing

To test the improvements:

1. **Login**: Verify that login works and shows account dropdown
2. **Token Expiration**: Wait for token to expire or manually modify token expiration
3. **UI Update**: Verify that navigation switches to login button when token expires
4. **Auto Cleanup**: Check that expired tokens are removed from cookies
5. **Cross-Tab**: Open multiple tabs and verify session state syncs
6. **Page Refresh**: Verify that expired sessions are cleaned up on page refresh

## Configuration

The session validation system can be configured by modifying:

- **Validation Interval**: Change the 5-minute interval in `useSessionValidation()`
- **Token Cookie Name**: Update `_furni_jwt` cookie name if needed
- **Cache Cleanup**: Modify cache invalidation logic in `cleanupInvalidSession()`
- **Error Handling**: Customize error messages and handling logic

## Future Improvements

1. **Token Refresh**: Implement automatic token refresh before expiration
2. **Session Warnings**: Show warnings before session expires
3. **Background Validation**: Validate tokens in background workers
4. **Enhanced Security**: Add additional security checks and validation
5. **Metrics**: Add session validation metrics and monitoring
