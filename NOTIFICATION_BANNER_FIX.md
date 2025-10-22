# Notification Banner Fix - Messages Only

## Summary

Fixed notification banners appearing for non-message events (group name changes, conversation deletions, member additions/removals). Notifications now only appear for actual new messages.

## Problem

Notification banners were appearing when:

- A user changed a group chat name
- A user deleted a conversation (for themselves)
- Members were added to or removed from a group
- Any other conversation metadata change

The banners should ONLY appear for new messages.

## Root Cause

The notification detection logic in `NotificationContext.tsx` was using `conversation.updatedAt` to detect changes:

```typescript
const isNewMessage =
  !lastSeen ||
  conv.updatedAt.getTime() > lastSeen.timestamp.getTime() || // ❌ Wrong!
  conv.lastMessageText !== lastSeen.text;
```

**The Problem:**

- `updatedAt` changes for ANY conversation update (name changes, member changes, etc.)
- Not just for new messages
- This caused false positives

**Example Scenario:**

1. User A changes group name
2. Firestore updates `conversation.updatedAt`
3. All users' apps see `updatedAt` changed
4. Notification system thinks it's a new message
5. Everyone sees a banner with the old last message 🐛

## Solution

### 1. Added `lastMessageTimestamp` to `ConversationListItem`

**File**: `src/features/conversations/api.ts`

```typescript
export interface ConversationListItem {
  id: string;
  name: string;
  lastMessageText: string;
  updatedAt: Date;
  lastMessageTimestamp?: Date; // ✅ New! Specific to messages
  otherUserId?: string;
}
```

This field specifically tracks when the last MESSAGE was sent, separate from general conversation updates.

### 2. Populated the Field in Subscription

```typescript
// Get last message timestamp for notification filtering
const lastMessageTimestampRaw = data.lastMessage?.timestamp as
  | Timestamp
  | undefined;
const lastMessageTimestamp =
  lastMessageTimestampRaw &&
  typeof lastMessageTimestampRaw.toDate === "function"
    ? lastMessageTimestampRaw.toDate()
    : undefined;

return {
  id: d.id,
  name,
  lastMessageText: data.lastMessage?.text ?? "",
  updatedAt,
  lastMessageTimestamp, // ✅ Include message timestamp
  otherUserId,
};
```

### 3. Updated Notification Detection Logic

**File**: `src/state/NotificationContext.tsx`

**Before:**

```typescript
const isNewMessage =
  !lastSeen ||
  conv.updatedAt.getTime() > lastSeen.timestamp.getTime() || // ❌ Triggers on ANY update
  conv.lastMessageText !== lastSeen.text;
```

**After:**

```typescript
// Use lastMessageTimestamp if available, otherwise fall back to updatedAt
// This prevents notifications for metadata changes (group name, etc.)
const messageTimestamp = conv.lastMessageTimestamp || conv.updatedAt;

const isNewMessage =
  !lastSeen ||
  messageTimestamp.getTime() > lastSeen.timestamp.getTime() || // ✅ Only message changes!
  conv.lastMessageText !== lastSeen.text;
```

**Key Changes:**

- Uses `lastMessageTimestamp` when available
- Falls back to `updatedAt` for backward compatibility
- Only compares message timestamps, not conversation metadata timestamps

### 4. Updated All Tracking References

Updated three places where we track seen messages:

1. **Initial load** (lines 82-94)
2. **Active conversation tracking** (lines 99-111)
3. **New message detection** (lines 136-141, 172-177)

All now use `messageTimestamp` instead of `updatedAt`:

```typescript
const messageTimestamp = conv.lastMessageTimestamp || conv.updatedAt;
lastSeenMessagesRef.current[conv.id] = {
  text: conv.lastMessageText,
  timestamp: messageTimestamp, // ✅ Track message time
  senderId: "",
};
```

## How It Works Now

### Scenario 1: New Message Arrives

```
1. User B sends a message
   └─► Firestore updates:
       ├─► lastMessage.text: "Hello"
       ├─► lastMessage.timestamp: 2025-01-15 14:30:00
       └─► updatedAt: 2025-01-15 14:30:00

2. Notification system checks:
   ├─► lastMessageTimestamp: 2025-01-15 14:30:00
   ├─► lastSeen.timestamp: 2025-01-15 14:00:00
   └─► Difference detected → Show notification ✅
```

### Scenario 2: Group Name Changed

```
1. User A changes group name from "Team" to "Project Team"
   └─► Firestore updates:
       ├─► groupName: "Project Team"
       ├─► lastMessage: unchanged
       ├─► lastMessage.timestamp: 2025-01-15 14:30:00 (unchanged)
       └─► updatedAt: 2025-01-15 15:00:00 (new!)

2. Notification system checks:
   ├─► lastMessageTimestamp: 2025-01-15 14:30:00 (unchanged)
   ├─► lastSeen.timestamp: 2025-01-15 14:30:00 (same!)
   └─► No difference → No notification ✅
```

### Scenario 3: Member Added to Group

```
1. User A adds User C to group
   └─► Firestore updates:
       ├─► members: [userA, userB, userC]
       ├─► lastMessage: unchanged
       ├─► lastMessage.timestamp: 2025-01-15 14:30:00 (unchanged)
       └─► updatedAt: 2025-01-15 15:15:00 (new!)

2. Notification system checks:
   ├─► lastMessageTimestamp: 2025-01-15 14:30:00 (unchanged)
   ├─► lastSeen.timestamp: 2025-01-15 14:30:00 (same!)
   └─► No difference → No notification ✅
```

### Scenario 4: Conversation Deleted (For User)

```
1. User A deletes conversation
   └─► Firestore updates:
       ├─► clearedAt.userA: 2025-01-15 15:20:00
       ├─► lastMessage: unchanged
       ├─► lastMessage.timestamp: 2025-01-15 14:30:00 (unchanged)
       └─► updatedAt: 2025-01-15 15:20:00 (new!)

2. Other users' notification systems check:
   ├─► lastMessageTimestamp: 2025-01-15 14:30:00 (unchanged)
   ├─► lastSeen.timestamp: 2025-01-15 14:30:00 (same!)
   └─► No difference → No notification ✅
```

## Benefits

### For Users

- ✅ **No False Alarms**: Banners only appear for actual messages
- ✅ **Less Interruption**: No distractions from metadata changes
- ✅ **Clear Communication**: Banners mean "someone messaged you"
- ✅ **Better UX**: Predictable notification behavior

### For Developers

- ✅ **Accurate Detection**: Message changes tracked separately
- ✅ **Clean Separation**: Metadata vs. message updates
- ✅ **Backward Compatible**: Falls back to `updatedAt` if needed
- ✅ **Maintainable**: Clear intent in code

## Edge Cases Handled

### 1. No Last Message

```typescript
if (!conv.lastMessageText) continue;
```

- Conversations without messages don't trigger notifications
- New groups with no messages yet are ignored

### 2. Missing Timestamp

```typescript
const messageTimestamp = conv.lastMessageTimestamp || conv.updatedAt;
```

- Falls back to `updatedAt` if message timestamp is unavailable
- Ensures backward compatibility with existing data

### 3. Text Content Check

```typescript
conv.lastMessageText !== lastSeen.text;
```

- Still checks if message TEXT changed
- Catches edge cases where timestamp might be same but content differs
- Extra safety layer

## Testing

### Test Cases

1. **Group Name Change**:

   - Change a group chat name
   - ✅ No notification should appear for other users
   - ✅ Group name updates in their conversation list

2. **New Message**:

   - Send a new message in a group
   - ✅ Other users see notification banner
   - ✅ Banner shows correct message text

3. **Delete Conversation**:

   - Delete a conversation (for yourself)
   - ✅ Other users don't see any notification
   - ✅ No false alerts

4. **Add Member**:

   - Add a member to a group
   - ✅ Existing members don't see notification
   - ✅ New member sees group in their list

5. **Remove Member**:

   - Remove a member from a group
   - ✅ Remaining members don't see notification
   - ✅ Removed member no longer sees group

6. **Multiple Rapid Changes**:
   - Change group name
   - Send a message
   - Add a member
   - ✅ Only the message triggers a notification

## Files Modified

1. **`src/features/conversations/api.ts`**

   - Added `lastMessageTimestamp?` to `ConversationListItem` interface
   - Populated field in `subscribeToUserConversations` return value
   - Extracts timestamp from `lastMessage.timestamp`

2. **`src/state/NotificationContext.tsx`**
   - Updated notification detection to use `lastMessageTimestamp`
   - Changed all three tracking locations to use message timestamp
   - Added fallback to `updatedAt` for compatibility

## Related Features

This fix works alongside:

- **Group Name Real-Time Updates**: Names can change without triggering notifications
- **Delete For Me**: Deletions don't trigger notifications for others
- **Member Management**: Adding/removing members is silent

## Technical Details

### Timestamp Sources

**Conversation Document:**

```typescript
{
  updatedAt: Timestamp,           // Changes for ANY update
  lastMessage: {
    text: string,
    timestamp: Timestamp,         // Only changes for new messages ✅
    senderId: string
  }
}
```

### Notification Flow

```
1. Firestore conversation update
   ↓
2. subscribeToUserConversations callback
   ↓
3. Extract lastMessage.timestamp
   ↓
4. NotificationContext receives conversations
   ↓
5. Compare lastMessageTimestamp with lastSeen
   ↓
6. Show notification ONLY if message timestamp changed
```

### Performance

- **No Extra Queries**: Uses existing conversation subscription
- **Efficient Filtering**: Simple timestamp comparison
- **No Network Overhead**: Data already included in subscription

## Future Enhancements

Potential improvements:

1. Include `senderId` in `ConversationListItem` to filter out own messages earlier
2. Add notification preferences (mute specific conversations)
3. Track notification history for analytics
4. Add sound/vibration options
