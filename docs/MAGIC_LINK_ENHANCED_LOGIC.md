# Enhanced Magic Link Logic Implementation

## Overview

The magic link authentication has been enhanced to intelligently handle session preservation based on customer account ID comparison between existing sessions and magic link tokens.

## 4-Scenario Decision Matrix

| Scenario | Session Status | Token Status | Customer ID Match | Action                                       |
| -------- | -------------- | ------------ | ----------------- | -------------------------------------------- |
| 1        | Valid          | Valid        | Same              | Keep existing session (ignore token)         |
| 2        | Valid          | Valid        | Different         | Switch to new user                           |
| 3        | Valid          | Expired      | Same              | Keep existing session (ignore expired token) |
| 4        | Valid          | Expired      | Different         | Logout current user                          |
| 5        | Invalid        | Valid        | N/A               | Login with token                             |
| 6        | Invalid        | Expired      | N/A               | Redirect to homepage without login           |

## Key Benefits

✅ **Session Preservation**: Users can safely reuse magic links for the same account without losing their session
✅ **Account Switching**: Allows legitimate switching between different user accounts
✅ **Security**: Prevents unauthorized access when different user tokens are used
✅ **User Experience**: No unexpected logouts for users clicking expired links for their current account

## Implementation Details

### Enhanced JWT Utilities (`src/lib/util/jwt-utils.ts`)

- `getCustomerAccountIdFromToken()`: Extracts customer_accountId from JWT tokens
- `validateTokenAndExtractCustomerId()`: Validates token expiration and extracts customer ID in one call
- Improved error handling and logging

### Enhanced Session Validation (`src/lib/util/session-validation.ts`)

- Modified `validateSession()` to return customer ID from existing session tokens
- Enhanced error handling to preserve customer ID even from invalid sessions for comparison

### Enhanced Magic Link Verification (`src/lib/data/customer.ts`)

- `verifyMagicLinkAction()`: Implements the complete 4-scenario decision matrix
- `performMagicLinkLogin()`: Separated login logic for cleaner code organization
- Comprehensive logging for debugging each scenario

## Usage Examples

### Scenario 1: Same User, Valid Token

```
User: john@company.com (logged in)
Magic Link: john@company.com (valid token)
Result: Keep existing session, ignore magic link
```

### Scenario 2: Different User, Valid Token

```
User: john@company.com (logged in)
Magic Link: jane@company.com (valid token)
Result: Switch to jane@company.com
```

### Scenario 3: Same User, Expired Token

```
User: john@company.com (logged in)
Magic Link: john@company.com (expired token)
Result: Keep existing session, ignore expired magic link
```

### Scenario 4: Different User, Expired Token

```
User: john@company.com (logged in)
Magic Link: jane@company.com (expired token)
Result: Logout john@company.com, redirect to login
```

## Testing Scenarios

To test all scenarios, you can:

1. **Login normally** and get a valid session
2. **Generate magic links** for the same and different users
3. **Wait for tokens to expire** or manipulate token expiration times
4. **Test each scenario** by clicking magic links in different states

## Error Handling

- All scenarios include comprehensive error logging
- Failed magic link verifications don't crash the application
- Graceful fallbacks ensure users always reach a predictable state
- Security-focused approach prevents information leakage

## Monitoring

The implementation includes detailed console logging for each scenario:

- `[Magic Link] Existing session status`
- `[Magic Link] Token validation`
- `[Magic Link] Scenario X: ...`
- `[performMagicLinkLogin] ...`

Monitor these logs to understand user behavior and debug any issues.
