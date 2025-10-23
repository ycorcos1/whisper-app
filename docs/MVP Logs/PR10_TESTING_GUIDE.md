# PR #10 — Group Chats Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the Group Chats (3+ Users) feature implementation in PR #10.

## Prerequisites

### Test Environment Setup

1. **Multiple Test Accounts Required:**

   - Create at least 4 test accounts to properly test group functionality
   - Recommended: `alice@test.com`, `bob@test.com`, `charlie@test.com`, `diana@test.com`

2. **Testing Devices:**

   - iOS Simulator
   - Android Emulator (optional, for cross-platform verification)
   - Multiple browser tabs (if using web version)

3. **Firebase Console Access:**
   - Verify you can view Firestore collections
   - Check for proper conversation documents being created

### Quick Setup Script

```bash
# Terminal 1 - Start main app instance
cd whisper-app
npx expo start

# Terminal 2 - Start second instance (different device)
# Use QR code or direct device connection
```

---

## Test Scenarios

### Test 1: Create a Group Chat (Minimum Size)

**Objective:** Verify group creation with exactly 3 users (minimum required)

**Steps:**

1. Sign in as User A (e.g., `alice@test.com`)
2. Tap the "+" button on Conversations screen
3. Search for User B (e.g., `bob@test.com`)
4. Select User B (checkmark should appear)
5. Search for User C (e.g., `charlie@test.com`)
6. Select User C (checkmark should appear)
7. Verify button text changes to "Create Group (2)"
8. Tap "Create Group (2)" button

**Expected Results:**

- ✅ Navigation to ChatScreen occurs
- ✅ Header shows "Bob, Charlie" (or display names)
- ✅ Empty state shows "No messages yet"
- ✅ Conversation appears in Conversations list
- ✅ Group name shows both member names separated by comma

**Firebase Verification:**

```javascript
// Check in Firestore console: conversations collection
{
  members: ["alice_uid", "bob_uid", "charlie_uid"],
  type: "group",
  updatedAt: Timestamp(...)
}
```

---

### Test 2: Create a Larger Group Chat

**Objective:** Verify group creation with 5+ users

**Steps:**

1. Sign in as User A
2. Tap "+" button
3. Select 4 other users (B, C, D, E)
4. Verify button shows "Create Group (4)"
5. Create the group

**Expected Results:**

- ✅ Group created successfully
- ✅ All 4 names appear in conversation list (comma-separated)
- ✅ Can navigate to chat screen
- ✅ All members receive the conversation

**Note:** Test with both short names (e.g., "Bob") and long names (e.g., "Christopher") to verify text truncation/wrapping.

---

### Test 3: Send Messages with Sender Attribution

**Objective:** Verify sender names appear for group messages

**Steps:**

1. Sign in as User A in one device/browser
2. Sign in as User B in another device/browser
3. Both users navigate to the same group chat
4. User A sends: "Hello from Alice!"
5. User B sends: "Hi from Bob!"
6. User A sends: "How is everyone?"

**Expected Results (User A's View):**

- ✅ Own messages ("Hello from Alice!", "How is everyone?") do NOT show sender name
- ✅ Messages from User B show "Bob" (or display name) above message text
- ✅ Sender name styled in amethyst/purple color
- ✅ All messages show timestamps

**Expected Results (User B's View):**

- ✅ Own message ("Hi from Bob!") does NOT show sender name
- ✅ Messages from User A show "Alice" above message text
- ✅ Sender attribution appears for all non-own messages

**Visual Layout:**

```
┌─────────────────────────────┐
│ Alice                       │  ← Sender name (purple, small)
│ ┌─────────────────────────┐│
│ │ Hello from Alice!       ││  ← Message bubble (other user)
│ │ 10:30 AM                ││
│ └─────────────────────────┘│
└─────────────────────────────┘

         ┌──────────────────────┐
         │ Hi from Bob!         │  ← Own message (no sender name)
         │ 10:31 AM          ✓✓│
         └──────────────────────┘
```

---

### Test 4: Verify Group Display in Conversations List

**Objective:** Ensure groups show correctly in main conversation list

**Steps:**

1. Create multiple conversations:
   - 1 DM with User B
   - 1 Group with Users B, C
   - 1 Group with Users B, C, D, E
2. Navigate back to Conversations screen
3. Observe the conversation list

**Expected Results:**

- ✅ DM shows single user name with presence badge
- ✅ Groups show comma-separated member names
- ✅ Groups do NOT show presence badge
- ✅ Last message preview works for all types
- ✅ Timestamps display correctly
- ✅ Tapping any conversation navigates to correct chat

**Visual Check:**

```
┌─────────────────────────────────────┐
│ Bob                          [●]    │  ← DM with presence badge
│ Hey there!                   10:30  │
├─────────────────────────────────────┤
│ Bob, Charlie                        │  ← Group (no badge)
│ Alice: How is everyone?      10:32  │
├─────────────────────────────────────┤
│ Bob, Charlie, Diana, Eve            │  ← Larger group
│ Bob: See you tomorrow!       09:15  │
└─────────────────────────────────────┘
```

---

### Test 5: Optimistic UI in Groups

**Objective:** Verify instant message appearance with optimistic updates

**Steps:**

1. Sign in as User A
2. Open a group chat
3. Send a message: "Testing optimistic UI"
4. Immediately observe the UI (before server confirms)

**Expected Results:**

- ✅ Message appears instantly at bottom of list
- ✅ Message shows loading indicator (spinner) or "⏱" status
- ✅ No sender name shown for own optimistic message
- ✅ After ~1-2 seconds, status changes to "✓" (sent)
- ✅ No duplicate messages appear

---

### Test 6: Delivery States in Groups

**Objective:** Verify message delivery indicators work correctly

**Steps:**

1. User A (device 1) creates/opens group with Users B, C
2. User B (device 2) stays on Conversations screen (not in chat)
3. User C (device 3) is offline
4. User A sends: "Delivery test message"
5. Observe status changes

**Expected Results:**

- ✅ Initial status: "⏱" (sending)
- ✅ After send: "✓" (sent)
- ✅ When User B receives: "✓✓" (delivered)
- ✅ When User B opens chat: "✓✓" (blue, read)

**Note:** In MVP, delivery status updates when ANY member receives/reads, not per-member tracking.

---

### Test 7: Typing Indicators in Groups

**Objective:** Verify typing indicators work for multiple users

**Steps:**

1. User A, B, C all in same group chat
2. User B starts typing (without sending)
3. User C starts typing (without sending)
4. Both stop typing

**Expected Results (User A's View):**

- ✅ Typing indicator appears when B starts typing
- ✅ Indicator updates when both B and C are typing
- ✅ Indicator text shows "Bob is typing..." (one user)
- ✅ Or shows generic "typing..." (multiple users)
- ✅ Indicator disappears after 2 seconds of inactivity

---

### Test 8: Conversation Deletion

**Objective:** Ensure group deletion works correctly

**Steps:**

1. User A creates group with Users B, C
2. Send a few messages
3. User A taps "Delete" button in header
4. Confirm deletion

**Expected Results:**

- ✅ Confirmation dialog appears
- ✅ After confirming, conversation removed from A's list
- ✅ User A navigated back to Conversations screen
- ✅ Users B and C still see the conversation (deletion is per-user)

---

### Test 9: Message Persistence Across Restarts

**Objective:** Verify group messages persist after app restart

**Steps:**

1. Create group and send several messages
2. Close/kill the app completely
3. Reopen the app
4. Navigate to the group chat

**Expected Results:**

- ✅ All messages still visible
- ✅ Correct sender attribution shown
- ✅ Message order preserved
- ✅ Timestamps accurate
- ✅ Can send new messages immediately

---

### Test 10: Edge Cases

#### 10a: Group with Deleted User Accounts

**Steps:**

1. Create group with Users A, B, C
2. Delete User B from Firebase Auth
3. Reload app as User A

**Expected Results:**

- ✅ Group still loads
- ✅ B's messages show UID instead of name (graceful fallback)
- ✅ No app crashes

#### 10b: Single-User Selection (Should Create DM)

**Steps:**

1. Tap "+" button
2. Select only one user
3. Verify button shows "Create Chat" (not "Create Group (1)")
4. Create conversation

**Expected Results:**

- ✅ Creates DM, not group
- ✅ type field is "dm"
- ✅ No sender attribution shown in messages

#### 10c: Very Long Group Names

**Steps:**

1. Create group with 10+ users (if possible)
2. All users have long display names

**Expected Results:**

- ✅ Names truncated gracefully in conversation list
- ✅ Full list visible in header (scrollable if needed)
- ✅ No UI overflow issues

---

## Automated Verification

### TypeScript Compilation

```bash
npx tsc --noEmit
# Expected: Exit code 0 (no errors)
```

### Linting

```bash
npx eslint src/
# Expected: No critical errors related to new code
```

### Run Tests (if available)

```bash
npm test
# Expected: All tests pass
```

---

## Firestore Data Validation

### Check Conversation Document Structure

1. Open Firebase Console
2. Navigate to Firestore → `conversations` collection
3. Find a group conversation
4. Verify structure:

```javascript
{
  members: ["uid1", "uid2", "uid3"],  // Array of member UIDs
  type: "group",                      // Type field set
  updatedAt: Timestamp(...),          // Server timestamp
  lastMessage: {                      // Optional
    text: "...",
    senderId: "uid1",
    timestamp: Timestamp(...)
  }
}
```

### Check Message Documents

1. Navigate to `conversations/{groupId}/messages`
2. Select a message document
3. Verify structure:

```javascript
{
  senderId: "uid1",
  text: "Hello everyone!",
  type: "text",
  timestamp: Timestamp(...),
  status: "delivered"
  // Note: senderName is NOT stored in Firestore
  // It's added client-side during message enrichment
}
```

---

## Regression Testing

### Verify Existing Features Still Work

- [ ] **DM Conversations:** Can still create and use 1:1 chats
- [ ] **Presence Badges:** Still show for DMs (not groups)
- [ ] **Typing Indicators:** Work in both DMs and groups
- [ ] **Delivery States:** Function in both conversation types
- [ ] **Optimistic UI:** Works for both DMs and groups
- [ ] **Message Persistence:** Drafts, scroll position still saved

---

## Known Issues / Limitations

### Expected Behavior (Not Bugs)

1. **No Custom Group Names:**

   - Groups show member names, not a custom title
   - This is by design for MVP

2. **No Group Avatars:**

   - Groups use generic avatar or first member's initial
   - Avatar feature planned for PR #9

3. **No Member Management:**

   - Cannot add/remove members after creation
   - Must create new group to change membership

4. **Delivery Status (Groups):**

   - Shows "delivered" when ANY member receives
   - Not per-member delivery tracking (future enhancement)

5. **Language Server Cache:**
   - TypeScript linter may show false positive for `showSender` prop
   - Restart IDE to clear cache
   - `npx tsc --noEmit` confirms code is correct

---

## Troubleshooting

### Issue: Sender names not appearing

**Check:**

- Is conversation type "group" in Firestore?
- Are user documents present in `users` collection?
- Check browser/app console for errors loading names

### Issue: Can't create group (button disabled)

**Check:**

- Are at least 2 users selected?
- Is network connection active?
- Check Firestore permissions

### Issue: Group not appearing in list

**Check:**

- Refresh the Conversations screen
- Verify conversation document created in Firestore
- Check that current user's UID is in `members` array

---

## Success Criteria

PR #10 is ready for merge when:

- ✅ All test scenarios pass
- ✅ No regression in existing DM functionality
- ✅ TypeScript compilation succeeds
- ✅ Firestore data structure matches specification
- ✅ Sender attribution displays correctly for group messages
- ✅ Conversations list properly differentiates groups from DMs
- ✅ No critical bugs or UI issues identified

---

## Reporting Issues

If you encounter bugs during testing:

1. **Document the issue:**

   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/video if applicable
   - Device/OS information

2. **Check Firestore:**

   - Verify data structure in Firebase Console
   - Note any missing or incorrect fields

3. **Console logs:**

   - Check for errors in browser/app console
   - Include relevant error messages

4. **Create detailed report:**
   - File as GitHub issue or inline comment
   - Tag with "PR #10" label
   - Include all documentation from steps above

---

**Prepared by:** AI Development Assistant  
**Date:** October 21, 2025  
**PR:** #10 — Group Chats (3+ Users)  
**Branch:** `feature/pr10-groups` (implied)

