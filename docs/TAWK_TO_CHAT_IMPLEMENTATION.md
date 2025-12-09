# Tawk.to Chat Implementation with Login Functionality

## Overview

This implementation provides a comprehensive Tawk.to chat widget integration with conversation history retrieval capabilities. The component prevents duplicate users across devices and enables users to access their previous chat conversations.

## Key Features

### 1. User Identification & Duplicate Prevention

- **Pre-widget configuration**: Sets up visitor identification before script loads
- **Unique user IDs**: Uses `customer.customer_account.id` for consistent identification
- **Cross-device persistence**: Same user won't be created as new contact on different devices

### 2. Conversation History Retrieval

- **Login functionality**: Uses Tawk.to's login API to authenticate users
- **Secure hash generation**: HMAC SHA256 hash created server-side for security
- **Automatic login**: Users are logged in when chat widget loads
- **Previous conversations**: Chat history is automatically retrieved and displayed

### 3. User Session Management

- **Logout handling**: Proper cleanup when users log out
- **User switching**: Supports switching between different users in same session
- **Session persistence**: Maintains state across navigation within user session

## Files Modified/Created

### 1. `/src/modules/common/components/tawk-to-chat/index.tsx`

**Enhanced TawkToChat component with:**

- `loginTawkUser()` function for secure authentication
- User session management with refs
- Comprehensive error handling and logging
- Support for user switching and logout cleanup

### 2. `/src/app/api/tawk-hash/route.ts`

**Server-side API route for hash generation:**

- Secure HMAC SHA256 hash generation
- Uses TAWK_API_KEY environment variable
- Validates input parameters
- Returns hash for client-side login

### 3. `.env.template`

**Added Tawk.to configuration variables:**

```env
NEXT_PUBLIC_TAWK_PROPERTY_ID=692400fe12586c1960a8d887
NEXT_PUBLIC_TAWK_WIDGET_ID=1jaqa7p8d
TAWK_API_KEY=your_tawk_api_key_here
```

## Setup Instructions

### 1. Environment Configuration

1. Copy values from `.env.template` to your `.env` file
2. Get your Tawk.to API key from Admin > Property Settings
3. Set `TAWK_API_KEY=your_actual_api_key_here`

### 2. Tawk.to Dashboard Setup

1. Ensure secure mode is enabled (if required)
2. Note your Property ID and Widget ID
3. Configure any additional settings in Tawk.to dashboard

## Technical Implementation

### User Login Flow

1. **Customer logs in** → Component detects customer change
2. **Hash generation** → `/api/tawk-hash` creates secure hash using userId + API key
3. **Tawk.to login** → `window.Tawk_API.login()` called with hash and user data
4. **Conversation retrieval** → Previous chat history automatically loaded
5. **Widget display** → Chat widget shows with full context

### User Logout Flow

1. **Customer logs out** → Component detects customer = null
2. **Tawk.to logout** → `window.Tawk_API.logout()` called
3. **Session cleanup** → Clear visitor attributes and end chat
4. **Widget hiding** → Chat widget hidden until next login

### User Switching Flow

1. **Different customer detected** → Component compares customer IDs
2. **Previous user logout** → Logout current Tawk.to session
3. **New user setup** → Configure visitor data for new user
4. **New user login** → Generate hash and login new user
5. **History retrieval** → Load conversation history for new user

## API Reference

### POST `/api/tawk-hash`

**Generates secure hash for Tawk.to login**

**Request:**

```json
{
  "userId": "customer_account_id",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "hash": "generated_hmac_sha256_hash"
}
```

**Error Responses:**

- `400`: Missing userId or email
- `500`: API key not configured or hash generation failed

## Security Considerations

1. **Server-side hash generation**: API key never exposed to client
2. **HMAC SHA256**: Industry-standard secure hash algorithm
3. **Input validation**: All parameters validated before processing
4. **Error handling**: Graceful degradation on API failures

## Debugging

### Console Logs

The component provides extensive logging with `[TawkToChat]` prefix:

- User state changes
- Login/logout operations
- Hash generation status
- Error conditions
- Session management

### Common Issues

1. **API key not set**: Check `TAWK_API_KEY` environment variable
2. **Hash generation fails**: Verify API key is correct
3. **Login not working**: Check Tawk.to secure mode settings
4. **Conversations not loading**: Verify hash generation and login success

## Benefits

1. **Seamless user experience**: Automatic conversation history retrieval
2. **No duplicate contacts**: Consistent user identification across devices
3. **Secure authentication**: Server-side hash generation
4. **Robust session management**: Handles login/logout/switching scenarios
5. **Cross-device continuity**: Same conversations accessible from any device

## Future Enhancements

1. **Custom attributes**: Add more customer metadata for better context
2. **Department routing**: Route users to specific departments based on data
3. **Proactive messaging**: Trigger messages based on user behavior
4. **Analytics integration**: Track chat engagement and satisfaction

This implementation provides a production-ready Tawk.to integration that maintains conversation continuity while ensuring security and preventing duplicate user creation.
