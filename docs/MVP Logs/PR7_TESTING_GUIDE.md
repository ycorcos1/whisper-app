# PR #7 — Delivery States + Read Receipts Testing Guide

**Feature:** Message delivery tracking and read receipts  
**Status:** Ready for testing  
**Test Environment:** iOS/Android emulators with two user accounts

---

## Prerequisites

1. **Firebase Project:** Ensure your Firebase project is set up
2. **Firestore Rules:** Deploy updated `firestore.rules`
3. **Firestore Indexes:** Deploy `firestore.indexes.json` indexes
4. **Two Test Accounts:** You'll need two user accounts for testing

### Deploy Firebase Configuration

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

---

## Test Setup

### Create Two Test Users

1. **User A (Sender):**

   - Email: `sender@test.com`
   - Password: `password123`

2. **User B (Recipient):**
   - Email: `recipient@test.com`
   - Password: `password123`

### Test Environment

- **Device 1:** iOS Simulator (User A)
- **Device 2:** Android Emulator or another iOS Simulator (User B)

---

## Test Scenarios

### Test 1: Basic Delivery Flow ✅

**Goal:** Verify message transitions from sent → delivered → read

**Steps:**

1. **Device 1 (User A):**

   - Log in as `sender@test.com`
   - Navigate to conversations
   - Start a new chat with `recipient@test.com`
   - Send a message: "Hello, testing delivery states!"

2. **Expected Result:**

   - Message appears instantly (optimistic UI)
   - Status changes to "sent" with single checkmark (✓)
   - Message bubble has timestamp

3. **Device 2 (User B):**

   - Log in as `recipient@test.com`
   - Navigate to conversations
   - **Don't open the conversation yet**

4. **Device 1 (User A):**

   - Verify message still shows "sent" status (single checkmark ✓)

5. **Device 2 (User B):**

   - Open the conversation with User A

6. **Device 1 (User A):**

   - **Within 1-2 seconds:** Status changes to "delivered" (double checkmark ✓✓)

7. **Device 2 (User B):**

   - Wait 1+ seconds while viewing the message

8. **Device 1 (User A):**
   - **After ~1 second:** Status changes to "read" (blue double checkmark ✓✓)

**Pass Criteria:**

- ✅ Message shows optimistic UI immediately
- ✅ Status updates to "sent" after Firestore write
- ✅ Status updates to "delivered" when recipient opens conversation
- ✅ Status updates to "read" after 1 second of viewing
- ✅ Visual indicators match expected icons/colors

---

### Test 2: Multiple Messages ✅

**Goal:** Verify batch delivery/read marking works correctly

**Steps:**

1. **Device 1 (User A):**

   - Send 5 messages in quick succession:
     - "Message 1"
     - "Message 2"
     - "Message 3"
     - "Message 4"
     - "Message 5"

2. **Expected Result:**

   - All messages show "sent" status

3. **Device 2 (User B):**

   - Open conversation with User A

4. **Expected Result (Device 1):**

   - All 5 messages update to "delivered" status simultaneously

5. **Device 2 (User B):**

   - Wait 1+ seconds

6. **Expected Result (Device 1):**
   - All 5 messages update to "read" status simultaneously

**Pass Criteria:**

- ✅ Multiple messages can be sent rapidly
- ✅ All messages update to "delivered" together
- ✅ All messages update to "read" together
- ✅ No race conditions or partial updates

---

### Test 3: Offline Recipient ✅

**Goal:** Verify delivery states work with offline users

**Steps:**

1. **Device 2 (User B):**

   - **Turn off WiFi/network** or close the app

2. **Device 1 (User A):**

   - Send a message: "Testing offline delivery"

3. **Expected Result:**

   - Message shows "sent" status on Device 1
   - Status does NOT change to "delivered" (recipient is offline)

4. **Device 2 (User B):**

   - **Turn on WiFi/network** and open the app
   - Open conversation with User A

5. **Expected Result (Device 1):**
   - Message status updates to "delivered" when User B comes online
   - After 1 second, status updates to "read"

**Pass Criteria:**

- ✅ Messages stay in "sent" state while recipient is offline
- ✅ Status updates when recipient comes back online
- ✅ No errors or crashes

---

### Test 4: Rapid Open/Close ✅

**Goal:** Verify read receipts handle rapid screen changes

**Steps:**

1. **Device 1 (User A):**

   - Send a message: "Testing rapid open/close"

2. **Device 2 (User B):**

   - Open conversation
   - **Immediately** navigate back (before 1 second)
   - Open conversation again
   - **Immediately** navigate back (before 1 second)
   - Open conversation again and wait 1+ seconds

3. **Expected Result:**
   - Message eventually marks as "read" after the 1 second delay completes

**Pass Criteria:**

- ✅ No crashes or errors
- ✅ Read timer properly cleans up on navigation
- ✅ Message eventually marks as read when viewed for full duration

---

### Test 5: Own Messages Don't Show Indicators ✅

**Goal:** Verify status indicators only show for sender

**Steps:**

1. **Device 1 (User A):**

   - Send a message

2. **Device 2 (User B):**

   - View the message from User A

3. **Expected Result:**
   - **Device 1 (User A):** Own message shows status indicators
   - **Device 2 (User B):** Message from User A shows NO status indicators

**Pass Criteria:**

- ✅ Sender sees status indicators on their messages
- ✅ Recipient does NOT see status indicators
- ✅ Both see timestamps

---

### Test 6: Timestamp Formatting ✅

**Goal:** Verify timestamps display correctly

**Steps:**

1. **Device 1 (User A):**

   - Send a message today

2. **Expected Result:**

   - Timestamp shows time (e.g., "2:35 PM")

3. **Device 1 (User A):**

   - Manually change device date to yesterday (optional, requires device access)
   - Or wait and test on messages from previous days

4. **Expected Result:**
   - Old messages show date (e.g., "Oct 20")

**Pass Criteria:**

- ✅ Today's messages show time format
- ✅ Older messages show date format
- ✅ Timestamps are readable and properly positioned

---

### Test 7: Error States ✅

**Goal:** Verify error handling for failed messages

**Steps:**

1. **Device 1 (User A):**

   - **Turn off WiFi/network**
   - Send a message

2. **Expected Result:**

   - Message shows optimistic UI with loading spinner
   - Eventually shows error indicator (✕) if send fails

3. **Device 1 (User A):**

   - **Turn on WiFi/network**

4. **Expected Result:**
   - Message retries automatically
   - Status updates to "sent" when successful

**Pass Criteria:**

- ✅ Failed messages show error indicator
- ✅ Messages retry when connection restored
- ✅ No duplicate messages

---

## Visual Verification Checklist

### Message Status Icons

| Status    | Expected Icon        | Color      | Location     |
| --------- | -------------------- | ---------- | ------------ |
| Sending   | ⏱ (clock) or spinner | White/Gray | Bottom-right |
| Sent      | ✓ (single check)     | White/Gray | Bottom-right |
| Delivered | ✓✓ (double check)    | White/Gray | Bottom-right |
| Read      | ✓✓ (double check)    | Light Blue | Bottom-right |

### Message Bubble Layout

- ✅ Own messages: Right-aligned, purple background
- ✅ Other messages: Left-aligned, gray background
- ✅ Status indicator only on own messages
- ✅ Timestamp visible below message text
- ✅ Proper spacing between messages

---

## Performance Testing

### Load Testing

1. Create conversation with 20+ messages
2. Close and reopen conversation
3. Verify delivery/read marking completes quickly (<500ms)

### Network Testing

1. Test with slow 3G network (Chrome DevTools)
2. Verify status updates eventually complete
3. No timeouts or crashes

---

## Edge Cases to Verify

- ✅ Marking messages as delivered when conversation has no undelivered messages
- ✅ Marking messages as read when all messages already read
- ✅ Rapid message sends (5+ messages in 2 seconds)
- ✅ Opening conversation multiple times in quick succession
- ✅ Switching between multiple conversations
- ✅ App backgrounding/foregrounding during delivery tracking

---

## Automated Test Commands

```bash
# Type check
npx tsc --noEmit

# Lint check
npx eslint src/

# Run unit tests (when added)
npm test

# Build for production
npm run build
```

---

## Known Limitations (Expected Behavior)

1. **Batch Updates:** All messages mark as delivered/read together, not individually
2. **Group Chats:** No "delivered to X of Y users" indicator
3. **Multi-Device:** Read receipts don't sync across sender's devices
4. **Read Delay:** Fixed 1 second delay before marking as read
5. **No Opt-Out:** Users cannot disable read receipts (MVP limitation)

---

## Troubleshooting

### Issue: Status never updates to "delivered"

**Possible Causes:**

- Firestore rules not deployed
- Recipient is offline
- Firestore indexes not created

**Solution:**

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Issue: "Permission denied" errors in console

**Cause:** Firestore rules don't allow status updates

**Solution:** Verify rules allow members to update message status field

### Issue: Status indicators not showing

**Check:**

- Message.status field exists in Firestore
- isOwn prop is true for sender's messages
- MessageItem component is imported correctly

---

## Success Criteria

✅ All 7 test scenarios pass  
✅ Visual indicators display correctly  
✅ No console errors or warnings  
✅ TypeScript compiles without errors  
✅ Performance is acceptable (<500ms for status updates)  
✅ Edge cases handled gracefully

---

## Reporting Issues

If you encounter issues, please capture:

1. **Console logs** from React Native debugger
2. **Firestore console** screenshot showing message documents
3. **Steps to reproduce** the issue
4. **Expected vs actual behavior**
5. **Device/platform** information

---

**PR #7 Testing Complete** — Ready for merge when all tests pass ✅

