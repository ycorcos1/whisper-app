# Unread Message Indicator Implementation

## Overview

Implemented a per-user unread message indicator for the Conversations screen. Each conversation now displays a small circular dot when the current user has unread messages in that thread.

## Features

- ✅ **Per-user tracking**: Each user has their own read status for each conversation
- ✅ **Real-time updates**: Indicators update immediately as messages arrive
- ✅ **Automatic clearing**: Dot disappears when user opens the conversation
- ✅ **Smart detection**: Only shows unread indicator for messages sent by others
- ✅ **Clean design**: Minimal 8px circular dot using the app's accent color (amethystGlow)
- ✅ **Perfect positioning**: Located under the timestamp, aligned with the last message preview

## Implementation Details

### 1. Database Schema Changes

#### Firestore Conversations Collection

Added `lastReadAt` field to track when each user last read a conversation:

```typescript
{
  lastReadAt?: { [userId: string]: Timestamp }
}
```

**Example:**

```json
{
  "members": ["user1", "user2"],
  "lastMessage": {
    "text": "Hello!",
    "senderId": "user2",
    "timestamp": "2025-10-22T10:30:00Z"
  },
  "lastReadAt": {
    "user1": "2025-10-22T10:25:00Z", // User1 has unread messages
    "user2": "2025-10-22T10:30:00Z" // User2 is up to date
  }
}
```

### 2. API Changes

#### `src/features/conversations/api.ts`

**New Function:**

```typescript
markConversationAsRead(conversationId: string)
```

- Updates the current user's `lastReadAt` timestamp to now
- Called when user opens a conversation or views new messages

**Updated Interface:**

```typescript
interface ConversationDoc {
  // ... existing fields
  lastReadAt?: { [userId: string]: Timestamp | FieldValue };
}

interface ConversationListItem {
  // ... existing fields
  hasUnread?: boolean;
}
```

**Enhanced Logic:**

- `subscribeToUserConversations` now calculates `hasUnread` for each conversation
- Compares `lastMessage.timestamp` with `lastReadAt[currentUserId]`
- Only shows unread if message was sent by someone else

### 3. UI Components

#### `src/screens/ConversationsScreen.tsx`

**Visual Changes:**

- Added `timestampContainer` to hold timestamp and unread dot
- Added `unreadDot` - small 8px circular indicator
- Positioned under timestamp, aligned center
- Uses `theme.colors.amethystGlow` for consistency

**Styling:**

```typescript
timestampContainer: {
  alignItems: "center",
}
unreadDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.colors.amethystGlow,
  marginTop: 4,
}
```

#### `src/screens/ChatScreen.tsx`

**Behavior:**

- Marks conversation as read immediately when opened
- Updates `lastReadAt` again when new messages arrive (after 1 second delay)
- Ensures indicator clears in real-time across all devices

### 4. Security Rules

#### `firestore.rules`

Updated conversation rules to allow `lastReadAt` updates:

```javascript
allow create: if isAuthenticated() && request.auth.uid in request.resource.data.members
  && request.resource.data.diff({}).changedKeys().hasOnly([
    'members','type','dmKey','updatedAt','groupName','clearedAt','lastMessage','lastReadAt'
  ]);

allow update: if isAuthenticated() && isMember(resource.data)
  && request.resource.data.diff(resource.data).changedKeys().hasOnly([
    'lastMessage','updatedAt','groupName','members','clearedAt','lastReadAt'
  ]);
```

## How It Works

### Unread Detection Logic

```typescript
// In subscribeToUserConversations:
const lastReadAtMillis = lastReadAtRaw?.toMillis?.() ?? 0;
const lastMessageMillis = lastMessageTimestampRaw?.toMillis?.() ?? 0;

hasUnread =
  lastMessageMillis > 0 &&
  lastMessageMillis > lastReadAtMillis &&
  data.lastMessage.senderId !== currentUser.uid;
```

**A conversation shows an unread indicator if:**

1. There is a last message (`lastMessageMillis > 0`)
2. The last message is newer than the user's last read timestamp (`lastMessageMillis > lastReadAtMillis`)
3. The message was sent by someone else (`senderId !== currentUser.uid`)

### Read Status Update Flow

**When user opens a conversation:**

1. `ChatScreen` mounts
2. `markConversationAsRead(conversationId)` is called immediately
3. Firestore updates `conversations/{conversationId}/lastReadAt/{userId}` to server timestamp
4. All subscribed clients receive the update via `onSnapshot`
5. `ConversationsScreen` recalculates `hasUnread` → becomes `false`
6. Unread dot disappears from UI

**When new messages arrive:**

1. User is viewing `ChatScreen`
2. `messages.length` changes (triggers useEffect)
3. After 1 second delay, `markConversationAsRead` is called again
4. Updates user's `lastReadAt` to current time
5. Ensures dot stays cleared even as new messages arrive while viewing

## Testing Guide

### Test Case 1: Basic Unread Indicator

1. **Setup**: Have two users (User A and User B)
2. User A sends a message to User B
3. **Expected**: User B sees unread dot on the conversation
4. **Expected**: User A does NOT see unread dot (own message)

### Test Case 2: Opening Conversation Clears Indicator

1. User B has unread messages (dot visible)
2. User B opens the conversation
3. **Expected**: Dot disappears immediately
4. **Expected**: On all User B's devices, the dot disappears

### Test Case 3: Real-time Updates

1. User B is on Conversations screen
2. User A sends a new message
3. **Expected**: Dot appears in real-time on User B's screen
4. **Expected**: No app refresh needed

### Test Case 4: Multiple Conversations

1. User A sends messages to User B in 3 different conversations
2. **Expected**: User B sees unread dots on all 3 conversations
3. User B opens Conversation 1
4. **Expected**: Only Conversation 1's dot disappears
5. **Expected**: Conversations 2 and 3 still show dots

### Test Case 5: Group Conversations

1. User A, User B, and User C are in a group
2. User A sends a message
3. **Expected**: User B and User C see unread dots
4. **Expected**: User A does NOT see unread dot
5. User B opens the conversation
6. **Expected**: Dot clears for User B only
7. **Expected**: User C still sees the dot

### Test Case 6: Staying in Conversation

1. User B is viewing a chat with User A
2. User A sends a new message
3. **Expected**: Message appears in chat
4. After 1 second delay:
   - User B's `lastReadAt` updates
   - If User B goes back to Conversations, no dot appears
5. **Expected**: Real-time read status maintained

### Test Case 7: Multiple Devices

1. User B logged in on Device 1 and Device 2
2. Both devices on Conversations screen
3. User A sends a message
4. **Expected**: Both devices show unread dot
5. User B opens conversation on Device 1
6. **Expected**: Dot disappears on both Device 1 and Device 2 simultaneously

## Visual Design

```
┌─────────────────────────────────────────┐
│  👤  Alice                    10:30 AM  │
│      Hey, how are you?               ● │  ← Unread dot (8px, amethystGlow)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  👤  Bob                      09:15 AM  │
│      See you tomorrow!                  │  ← No dot (already read)
└─────────────────────────────────────────┘
```

**Design Specs:**

- **Size**: 8px × 8px circle
- **Color**: `theme.colors.amethystGlow` (#9C7AFF)
- **Position**: 4px below timestamp
- **Alignment**: Horizontally centered under timestamp
- **Border radius**: 4px (perfect circle)

## Deployment

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Update App

- No database migration needed (field is optional)
- Existing conversations work without `lastReadAt`
- Field is created automatically when users open conversations

### 3. Verification

After deployment, verify:

- ✅ Users can see unread indicators
- ✅ Indicators clear when opening conversations
- ✅ No console errors related to Firestore rules
- ✅ Real-time updates work across devices

## Edge Cases Handled

1. **First message in conversation**: No `lastReadAt` exists → shows as unread
2. **User's own message**: Never shows as unread
3. **Conversation with no messages**: No unread indicator
4. **Cleared conversations**: Still tracks read status correctly
5. **Missing timestamps**: Falls back to 0, prevents crashes
6. **Network delays**: Uses optimistic UI, updates when connection restored

## Files Modified

```
src/features/conversations/api.ts         (Enhanced with read tracking)
src/screens/ChatScreen.tsx                (Calls markConversationAsRead)
src/screens/ConversationsScreen.tsx       (Displays unread dot)
firestore.rules                           (Allows lastReadAt writes)
```

## Future Enhancements (Optional)

- Add unread message count badge (e.g., "3" instead of just a dot)
- Add "Mark all as read" bulk action
- Add settings to customize indicator appearance
- Track unread count in app badge/notification count
- Add "Unread" filter in conversations list

## Summary

The unread indicator feature is now fully implemented with:

- ✅ Per-user, per-conversation read tracking
- ✅ Real-time updates across all devices
- ✅ Automatic clearing when opening conversations
- ✅ Clean, minimal UI that matches the app aesthetic
- ✅ Secure Firestore rules
- ✅ Comprehensive edge case handling

Users can now easily see which conversations have new messages without opening each one individually!
