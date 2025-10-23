# PR #5 — Testing & Verification Guide

## Overview

This guide helps you verify that all PR #5 features are working correctly.

## Prerequisites

1. Firebase project configured with Firestore, RTDB, Storage
2. `.env` file populated with Firebase credentials
3. Expo Go app installed on device or emulator
4. Two test accounts created for testing messaging

## Test Scenarios

### 1. ✅ Message Appears Instantly on Send

**Steps:**

1. Open a conversation
2. Type a message in the input field
3. Press Send button

**Expected Result:**

- Input field clears immediately
- Message appears at the bottom of the list
- Message has reduced opacity (0.7)
- Small spinner appears next to the message
- After ~1 second, message becomes fully opaque and spinner disappears
- Server timestamp replaces local timestamp

**Success Criteria:**

- ✅ No delay between pressing send and seeing message
- ✅ Message transitions from optimistic to confirmed smoothly

---

### 2. ✅ Draft Survives Restart

**Steps:**

1. Open a conversation
2. Type some text in the input field (e.g., "This is a draft")
3. Wait 1 second (for 500ms debounce to complete)
4. Navigate away from ChatScreen (don't send)
5. Close the app completely
6. Reopen the app
7. Navigate back to the same conversation

**Expected Result:**

- Input field shows "This is a draft"
- Cursor is positioned at the end of the text
- Draft is preserved exactly as typed

**Success Criteria:**

- ✅ Draft text is restored after app restart
- ✅ Draft is conversation-specific (other conversations don't show it)

---

### 3. ✅ No Duplicate Sends on Reconnect

**Steps:**

1. Open a conversation
2. Enable airplane mode or disconnect WiFi
3. Send 3 messages (they will queue)
4. Close the app
5. Re-enable network connection
6. Reopen the app
7. Navigate to the conversation

**Expected Result:**

- All 3 messages appear exactly once
- No duplicate messages in the list
- Messages show correct timestamps
- Queue processes all messages

**Success Criteria:**

- ✅ Each message appears exactly once
- ✅ Messages sent in correct order
- ✅ No "phantom" duplicates after reconnect

---

### 4. ✅ Scroll Position Restored

**Steps:**

1. Open a conversation with 30+ messages
2. Scroll to somewhere in the middle of the list
3. Note the visible message text
4. Navigate away from ChatScreen
5. Navigate back to the same conversation

**Expected Result:**

- List scrolls to approximately the same position
- The same message that was visible is still visible
- Scroll position is within a few pixels of original position

**Success Criteria:**

- ✅ Scroll position preserved within reasonable accuracy
- ✅ No jarring jump to top or bottom

---

### 5. ✅ Offline Queue with Retry

**Steps:**

1. Enable airplane mode
2. Open a conversation
3. Send a message "Offline test"
4. Observe the message state
5. Wait 1 second
6. Disable airplane mode

**Expected Result:**

- Message appears immediately with reduced opacity
- Spinner appears next to message
- After 1 second with no network: "Retrying..." appears
- When network returns: message sends successfully
- Optimistic message replaced with server message

**Success Criteria:**

- ✅ Message queued while offline
- ✅ Retry attempts shown in UI
- ✅ Message sent when connection restored
- ✅ No duplicate after reconnect

---

### 6. ✅ Real-time Message Sync

**Steps:**

1. Login with Account A on Device 1
2. Login with Account B on Device 2
3. Open the same conversation on both devices
4. Send message from Device 1
5. Observe Device 2

**Expected Result:**

- Message appears instantly on Device 1 (optimistic)
- Message appears on Device 2 within 1-2 seconds (real-time sync)
- Both devices show identical message list
- Timestamps are consistent

**Success Criteria:**

- ✅ Real-time sync works across devices
- ✅ No message loss
- ✅ Correct sender attribution

---

### 7. ✅ Cache Clearing on Logout

**Steps:**

1. Open a conversation
2. Type a draft message (don't send)
3. Wait 1 second
4. Go to Profile screen
5. Press Logout button
6. Login again with the same account
7. Open the same conversation

**Expected Result:**

- Draft is cleared (input field is empty)
- Scroll position is reset to bottom
- Outbound queue is cleared
- Theme preferences are preserved (if set)

**Success Criteria:**

- ✅ All caches cleared except theme
- ✅ Clean state after logout
- ✅ No stale data from previous session

---

### 8. ✅ Message Pagination

**Steps:**

1. Create a conversation with 50+ messages (send multiple messages)
2. Open the conversation
3. Count visible messages

**Expected Result:**

- Only the 30 most recent messages load initially
- Older messages are not loaded
- List scrolls smoothly
- No performance issues

**Success Criteria:**

- ✅ Pagination limit enforced (30 messages)
- ✅ Most recent messages appear first
- ✅ Smooth scroll performance

---

### 9. ✅ Schema Migration

**Steps:**

1. Clear app data completely
2. Launch the app
3. Check console logs

**Expected Result:**

- Console shows: "Initializing schema v1"
- Console shows: "Migrations complete. Schema version: 1"
- AsyncStorage key `@whisper:schema_version` = "1"

**Success Criteria:**

- ✅ Schema version initialized correctly
- ✅ Migration system ready for future versions

---

### 10. ✅ Error Handling

**Steps:**

1. Disconnect from internet
2. Send 7 messages (exceeds retry limit)
3. Wait 2 minutes
4. Observe message states

**Expected Result:**

- First 6 messages show "Retrying..." periodically
- 7th message shows "Failed to send"
- Messages with "Failed to send" stay in UI
- Retry attempts follow exponential backoff

**Success Criteria:**

- ✅ Retry limit enforced (6 attempts)
- ✅ Error messages displayed clearly
- ✅ Exponential backoff working

---

## Performance Benchmarks

| Metric                    | Target  | Notes                          |
| ------------------------- | ------- | ------------------------------ |
| Message send to UI        | < 100ms | Optimistic UI instant feedback |
| Server confirmation       | < 1s    | Depends on network             |
| Draft save debounce       | 500ms   | Configurable                   |
| Scroll save throttle      | 400ms   | Configurable                   |
| Queue processing interval | 5s      | Configurable                   |
| Retry delay (max)         | 32s     | Exponential backoff cap        |

---

## Debugging

### Enable Detailed Logging

Check console for:

- Migration logs: "Running migrations from version X to Y"
- Queue processing: "Processing queue..."
- Optimistic updates: Automatic (no console spam)
- Firestore logs: Built into Firebase SDK

### Common Issues

**Draft not saving:**

- Check that 500ms debounce completes before navigating away
- Verify AsyncStorage permissions

**Messages duplicating:**

- Check that `tempId` is being set correctly
- Verify deduplication logic in `useOptimisticMessages`

**Scroll position not restoring:**

- Ensure messages are loaded before scroll restoration attempt
- Check that `initialScrollDone` flag is working

**Queue not processing:**

- Verify 5-second interval is running
- Check network connectivity
- Inspect AsyncStorage queue contents

---

## Manual Testing Checklist

- [ ] Message appears instantly on send
- [ ] Draft survives app restart
- [ ] No duplicate sends on reconnect
- [ ] Scroll position restored
- [ ] Offline queue with retry
- [ ] Real-time sync across devices
- [ ] Cache clearing on logout
- [ ] Message pagination (30 limit)
- [ ] Schema migration runs on first launch
- [ ] Error handling for failed sends
- [ ] Exponential backoff working
- [ ] Draft auto-save after 500ms
- [ ] Scroll position saves on scroll
- [ ] Loading spinner shows on initial load
- [ ] Activity indicator shows while sending

---

## Automated Testing (Future)

Tests to add in PR #13:

1. **Unit Tests**

   - `api.ts` — Message CRUD operations
   - `persistence.ts` — AsyncStorage operations
   - `useOptimisticMessages.ts` — Queue processing logic
   - Retry delay calculation
   - Message deduplication

2. **Integration Tests**

   - End-to-end message flow
   - Offline/online transitions
   - Multi-device sync
   - Cache clearing

3. **Firestore Emulator Tests**
   - Security rules validation
   - Message creation
   - Conversation updates

---

## Success Criteria Summary

PR #5 is considered complete when:

- ✅ All 10 test scenarios pass
- ✅ No TypeScript or linting errors
- ✅ No console errors during normal operation
- ✅ Performance meets benchmarks
- ✅ Memory files updated
- ✅ Documentation complete

---

**Status:** Ready for testing and QA

