# Group Chat Name Real-Time Updates Fix

## Summary

Fixed group chat name updates to be reflected immediately for all users in real-time. Previously, when a user changed the group name, other users had to close and reopen the chat to see the new name.

## Problem

When a user changed the name of a group chat:

1. The change was saved to Firestore correctly
2. However, other users' screens did not update automatically
3. Users had to navigate away and back to see the updated name
4. `ChatScreen` and `ChatSettingsScreen` were only loading conversation data once on mount, not subscribing to updates
5. `ConversationsScreen` was updating in real-time (due to `subscribeToUserConversations`), but individual chat screens were not

## Solution

Implemented real-time subscriptions to conversation documents so that all screens automatically update when the group name (or other conversation properties) change.

### Changes Made

#### 1. Added `subscribeToConversation()` Function

**File**: `src/features/conversations/api.ts`

Created a new function to subscribe to real-time updates for a single conversation:

```typescript
export function subscribeToConversation(
  conversationId: string,
  callback: (conversation: ConversationDoc | null) => void,
  onError: (err: unknown) => void
) {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );

  return onSnapshot(
    conversationRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(snapshot.data() as ConversationDoc);
    },
    onError
  );
}
```

This function:

- Takes a conversation ID and callback function
- Sets up a Firestore `onSnapshot` listener on the conversation document
- Calls the callback whenever the conversation data changes
- Returns an unsubscribe function for cleanup

#### 2. Updated `ChatScreen.tsx`

**File**: `src/screens/ChatScreen.tsx`

**Before**: Loaded conversation data once on mount

```typescript
useEffect(() => {
  const loadData = async () => {
    const conv = await getConversation(conversationId);
    setConversation(conv);
    // ... set display title
  };
  loadData();
}, [conversationId]);
```

**After**: Subscribe to real-time updates

```typescript
useEffect(() => {
  const unsubscribe = subscribeToConversation(
    conversationId,
    async (conv) => {
      if (!conv) return;
      setConversation(conv);

      // Update display title when group name changes
      if (conv.type === "group") {
        if (conv.groupName) {
          setDisplayTitle(conv.groupName);
        } else {
          // Compute from member names
        }
      }
    },
    (error) => {
      console.error("Error subscribing to conversation:", error);
    }
  );

  return unsubscribe;
}, [conversationId]);
```

**Benefits**:

- Group name updates appear instantly in the chat header
- Works for all users in the conversation simultaneously
- Also updates when members are added/removed

#### 3. Updated `ChatSettingsScreen.tsx`

**File**: `src/screens/ChatSettingsScreen.tsx`

**Before**: Loaded conversation data once on mount, manually refreshed after changes

```typescript
useEffect(() => {
  loadConversationDetails();
}, [conversationId]);

const handleSaveGroupName = async () => {
  await updateGroupName(conversationId, groupName);
  await loadConversationDetails(); // Manual refresh
};
```

**After**: Subscribe to real-time updates, no manual refreshes needed

```typescript
useEffect(() => {
  const unsubscribe = subscribeToConversation(
    conversationId,
    async (conv) => {
      if (!conv) return;
      setConversation(conv);

      if (conv.type === "group") {
        setGroupName(conv.groupName || "Group Chat");
        // Load member details...
      }
    },
    (error) => {
      console.error("Error subscribing to conversation:", error);
    }
  );

  return unsubscribe;
}, [conversationId]);

const handleSaveGroupName = async () => {
  await updateGroupName(conversationId, groupName);
  // Data updates automatically via subscription
};
```

**Benefits**:

- Settings screen updates automatically when group name changes
- Member list updates automatically when members are added/removed
- No need for manual refresh calls
- Multiple users can edit settings simultaneously without conflicts

## How It Works

### Real-Time Update Flow

1. **User A changes group name** in `ChatSettingsScreen`

   - Calls `updateGroupName(conversationId, "New Name")`
   - Updates Firestore conversation document

2. **Firestore broadcasts the change**

   - All active `onSnapshot` listeners are notified
   - This includes all users currently viewing the conversation

3. **User B's screens automatically update**

   - `ChatScreen` subscription receives the update
   - Callback is triggered with new conversation data
   - `setDisplayTitle("New Name")` updates the header
   - `ChatSettingsScreen` (if open) also receives the update
   - `ConversationsScreen` already had real-time updates working

4. **UI updates immediately**
   - No page refresh needed
   - No navigation required
   - Change appears within milliseconds

### Subscription Lifecycle

```typescript
// Mount: Subscribe
useEffect(() => {
  const unsubscribe = subscribeToConversation(...);

  // Unmount: Cleanup
  return unsubscribe;
}, [conversationId]);
```

- Subscription starts when component mounts
- Cleanup (unsubscribe) happens when component unmounts
- Prevents memory leaks and unnecessary listeners

## Testing

### Manual Test Cases

1. **Two Users, Same Group**:

   - User A opens group chat settings
   - User B opens the same group chat
   - User A changes the group name and saves
   - ✅ User B's chat header should update immediately
   - ✅ If User B has settings open, the group name field should update

2. **Name Change While Viewing**:

   - Open a group chat
   - Have another user change the group name
   - ✅ The header should update without refreshing

3. **Name Change From Conversations List**:

   - View the conversations list
   - Have another user change a group name
   - ✅ The conversation name should update in the list

4. **Multiple Simultaneous Changes**:

   - Have User A change the group name
   - Have User B add a member (while User A is changing name)
   - ✅ Both changes should propagate to all users
   - ✅ No conflicts or data loss

5. **Member Addition/Removal**:
   - User A adds a member
   - ✅ User B's settings screen should show the new member immediately
   - User A removes a member
   - ✅ User B's settings screen should update immediately

## Benefits

### For Users

- ✅ **Instant Updates**: See changes immediately without refreshing
- ✅ **Better Collaboration**: Multiple users can manage group settings simultaneously
- ✅ **No Confusion**: Everyone sees the same current state
- ✅ **Smooth UX**: No need to close and reopen chats

### For Developers

- ✅ **Simplified Code**: No need for manual refresh logic
- ✅ **Single Source of Truth**: Firestore is the authoritative state
- ✅ **Automatic Sync**: All clients stay in sync automatically
- ✅ **Reduced Bugs**: No stale data issues

## Technical Details

### Firebase onSnapshot

Uses Firestore's real-time listener API:

- Efficient: Only sends changed data, not full documents
- Reliable: Handles network disconnections and reconnections
- Scalable: Works with any number of concurrent users

### Performance Considerations

- **Listener Management**: Proper cleanup prevents memory leaks
- **Minimal Re-renders**: Only updates when data actually changes
- **Efficient Queries**: Single document listener, not collection queries
- **Network Efficient**: Firestore caches data locally

### Security

- Firestore security rules still apply to `onSnapshot` listeners
- Users can only subscribe to conversations they're members of
- Updates only include data the user has permission to see

## Related Features

This fix also improves:

- **Member List Updates**: Adding/removing members now updates in real-time
- **Conversation Properties**: Any future conversation fields will auto-update
- **Group Settings Sync**: Multiple admins can edit without conflicts

## Future Enhancements

Potential improvements enabled by this change:

1. **Typing Indicators in Settings**: Could show who else is viewing settings
2. **Optimistic UI**: Could show changes before server confirms
3. **Conflict Resolution**: Could detect and handle simultaneous edits better
4. **Activity Feed**: Could show "User X changed the name" notifications

## Files Modified

1. `src/features/conversations/api.ts`

   - Added `subscribeToConversation()` function

2. `src/screens/ChatScreen.tsx`

   - Replaced one-time load with real-time subscription
   - Removed unused `getConversation` import
   - Display title now updates automatically

3. `src/screens/ChatSettingsScreen.tsx`
   - Replaced one-time load with real-time subscription
   - Removed manual `loadConversationDetails()` calls after updates
   - All group settings now update in real-time
