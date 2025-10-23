# Group Chat Re-render Fix

**Date:** October 23, 2025  
**Issue:** Group chat screen kept reloading/re-rendering  
**Status:** ✅ Fixed

---

## 🐛 Problem

The ChatScreen component was constantly re-rendering in group chats, causing a poor user experience with the screen flickering or reloading.

### Root Causes

1. **`senderNames` in dependency array (line 301):**

   - `senderNames` is an object that gets recreated every time the conversation subscription updates
   - This caused the message subscription effect to re-run unnecessarily
   - Each re-run would re-subscribe to messages, causing flicker

2. **`messages.length` dependency (line 334):**

   - Triggered the "mark as read" effect every time a new message arrived
   - This was redundant since we only care about the last message ID

3. **Full `messages` array dependency (line 354):**
   - The scroll position effect depended on the entire messages array
   - Should only depend on `messages.length` for performance

---

## ✅ Solution

### 1. Use Ref for Sender Names

**Change:** Added `senderNamesRef` to store sender names without triggering re-renders

```typescript
const senderNamesRef = useRef<{ [userId: string]: string }>({});
```

**Why:** Refs don't trigger re-renders when updated, perfect for data that needs to be accessed but doesn't need to trigger UI updates in the effect.

### 2. Update Ref in Conversation Subscription

```typescript
// Update ref for use in message subscription
senderNamesRef.current = names;
setSenderNames(names);
```

**Why:** We still need `senderNames` state for the render function (to display in read receipts), but we use the ref in the message subscription to avoid re-subscriptions.

### 3. Remove `senderNames` from Message Subscription Dependencies

**Before:**

```typescript
}, [
  conversationId,
  conversationLoaded,
  conversation?.type,
  senderNames,  // ❌ This caused re-subscriptions
  firebaseUser?.uid,
]);
```

**After:**

```typescript
}, [
  conversationId,
  conversationLoaded,
  conversation?.type,
  firebaseUser?.uid,  // ✅ Stable dependencies only
]);
```

**Why:** By removing `senderNames` from the dependency array and using `senderNamesRef.current` inside the callback, we prevent unnecessary re-subscriptions.

### 4. Use Last Message ID Instead of Length

**Before:**

```typescript
}, [conversationId, loading, messages.length, conversation?.type]);
```

**After:**

```typescript
}, [conversationId, loading, messages[messages.length - 1]?.id, conversation?.type]);
```

**Why:** We only need to mark as read when the _last message changes_, not when the array length changes. This prevents redundant updates.

### 5. Use messages.length Instead of Full Array

**Before:**

```typescript
}, [loading, messages, conversationId, initialScrollDone]);
```

**After:**

```typescript
}, [loading, messages.length, conversationId, initialScrollDone]);
```

**Why:** The scroll position effect only needs to know if messages exist, not the entire array contents.

---

## 🎯 Impact

### Before Fix

- ❌ Screen flickered/reloaded on every message
- ❌ Poor user experience in group chats
- ❌ Unnecessary re-subscriptions to Firestore
- ❌ Potential performance issues

### After Fix

- ✅ Smooth, stable screen with no reloads
- ✅ Better performance (fewer subscriptions)
- ✅ Cleaner code with proper dependency management
- ✅ Read receipts still work perfectly

---

## 🧪 Testing

### Verification Steps

1. **Open a group chat**

   - Screen should load once and stay stable
   - No flickering or reloading

2. **Send messages**

   - New messages appear smoothly
   - No screen reload on new message

3. **Read receipts**

   - "seen by" labels still appear correctly
   - Updates happen in real-time

4. **Scroll behavior**
   - Scrolling is smooth
   - No jumps or resets

### All Tests Passed ✅

---

## 📚 Technical Explanation

### Why Refs vs State?

**State (`useState`):**

- Triggers re-render when updated
- Use for data that affects what the user sees
- Example: `senderNames` for displaying read receipts

**Refs (`useRef`):**

- Does NOT trigger re-render when updated
- Use for data needed in callbacks but doesn't affect UI directly
- Example: `senderNamesRef` for enriching messages in subscription

### Dependency Array Best Practices

1. **Only include what you use:** Don't add dependencies you don't reference
2. **Use primitive values when possible:** Objects/arrays cause re-runs
3. **Extract specific values:** Use `obj.prop` instead of `obj` when possible
4. **Consider refs for mutable data:** Especially in subscription callbacks

---

## 🔄 Files Changed

- **`src/screens/ChatScreen.tsx`**
  - Added `senderNamesRef`
  - Updated conversation subscription
  - Updated message subscription dependencies
  - Updated "mark as read" effect dependencies
  - Updated scroll restoration dependencies

---

## ✨ Result

The group chat screen now:

- ✅ Loads once and stays stable
- ✅ Handles messages smoothly
- ✅ Shows read receipts correctly
- ✅ Performs efficiently

No more reloading issues! 🎉

---

**End of Document**
