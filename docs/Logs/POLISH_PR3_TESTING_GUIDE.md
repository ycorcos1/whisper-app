# Polish PR #3 — Testing Guide: Group Chat Read Receipts

**Date:** October 23, 2025  
**Feature:** Group chat read receipts with "seen by" labels  
**Status:** Ready for Testing

---

## 🎯 Testing Objectives

This guide will help you verify that:

1. Read receipts appear correctly in group chats
2. Read receipts do NOT appear in DM conversations
3. Read receipts update in real-time
4. Minimize/expand functionality works properly for all read receipts
5. Edge cases are handled gracefully

---

## 🧪 Test Scenarios

### Scenario 1: Basic Group Chat Read Receipts

**Setup:**

1. Create a group chat with 3 users: Alice (you), Bob, and Charlie
2. Log in as Alice (your test account)

**Steps:**

1. As Alice, send a message: "Hello everyone!"
2. Take note that no "seen by" label appears yet (only Alice has seen it)
3. Switch to Bob's account (or use another device/simulator)
4. As Bob, open the group chat
5. **Expected:** Alice should see "seen by Bob" appear under the message within 1-2 seconds
6. Switch to Charlie's account
7. As Charlie, open the group chat
8. **Expected:** Alice should now see "seen by Bob, Charlie" under the message

**Pass Criteria:**

- ✅ No "seen by" label when only sender has seen the message
- ✅ "seen by Bob" appears when Bob reads it
- ✅ Updates to "seen by Bob, Charlie" when Charlie reads it
- ✅ Updates happen in real-time without refresh

---

### Scenario 2: Multiple Messages in Group Chat

**Setup:**

1. Continue from Scenario 1 with Alice, Bob, and Charlie
2. All three users are in the same group chat

**Steps:**

1. As Alice, send 3 messages:
   - "Message 1"
   - "Message 2"
   - "Message 3"
2. As Bob, open the chat and scroll to see all 3 messages
3. Wait 1-2 seconds, then check Alice's view
4. **Expected:** All 3 messages show "seen by Bob"
5. As Charlie, open the chat but only scroll to see Message 1 and Message 2
6. Wait 1-2 seconds, then check Alice's view
7. **Expected:**
   - Message 1: "seen by Bob, Charlie"
   - Message 2: "seen by Bob, Charlie"
   - Message 3: "seen by Bob" (Charlie hasn't seen it yet)

**Pass Criteria:**

- ✅ Each message tracks read receipts independently
- ✅ Users only marked as "seen" for messages they've actually viewed
- ✅ Multiple messages update correctly

---

### Scenario 3: DM Conversations (Should NOT Show Read Receipts)

**Setup:**

1. Create a DM conversation between Alice (you) and Bob

**Steps:**

1. As Alice, send a message: "Hey Bob!"
2. As Bob, open the DM and read the message
3. Check Alice's view

**Expected:**

- ✅ Checkmark system works (✓ sent, ✓✓ delivered, blue ✓✓ read)
- ✅ NO "seen by" label appears
- ✅ Read receipts are handled by the existing checkmark system

**Pass Criteria:**

- ✅ DMs show checkmarks, not "seen by" labels
- ✅ Checkmark system still functional
- ✅ No regression in DM read receipt behavior

---

### Scenario 4: Minimize/Expand Read Receipts

**Setup:**

1. Create a group chat with 3+ users
2. Send a message and have other users read it

**Steps:**

1. As User A, send a message
2. Have all other users read the message
3. Check User A's view
4. **Expected:** "seen by [names]" appears with a chevron down icon
5. Tap on the "seen by" label
6. **Expected:** Label expands to show all names in full with chevron up icon
7. Tap again
8. **Expected:** Label collapses back to one line with chevron down icon

**Pass Criteria:**

- ✅ Chevron icon indicates expand/collapse state (down = collapsed, up = expanded)
- ✅ Tap to expand works for any number of names
- ✅ Tap to collapse works
- ✅ Visual feedback on tap (opacity change)
- ✅ Label stays within left half of screen (maxWidth: 50%)
- ✅ Expand/collapse works regardless of text length

---

### Scenario 5: No Read Receipts Yet

**Setup:**

1. Create a new group chat
2. Be the only user who has opened it

**Steps:**

1. Send a message
2. Don't have any other users open the chat yet
3. Check your view

**Expected:**

- ✅ NO "seen by" label appears (correct behavior)
- ✅ Message displays normally
- ✅ No errors or blank spaces where label would be

**Pass Criteria:**

- ✅ Gracefully handles case where no one else has read
- ✅ No visual artifacts or layout issues

---

### Scenario 6: Real-Time Updates

**Setup:**

1. Group chat with Alice (you) and Bob
2. Both have the app open simultaneously

**Steps:**

1. As Alice, send a message and keep your chat screen open
2. Within 2 seconds, as Bob, open the chat
3. Watch Alice's screen closely

**Expected:**

- ✅ "seen by Bob" appears on Alice's screen within 1-2 seconds
- ✅ No refresh or scroll needed
- ✅ Smooth fade-in or instant appearance

**Pass Criteria:**

- ✅ Real-time updates work
- ✅ Fast response time (< 2 seconds)
- ✅ No need for manual refresh

---

### Scenario 7: User Leaves Group

**Setup:**

1. Group chat with Alice (you), Bob, and Charlie
2. Alice sends a message
3. Bob and Charlie both read it

**Steps:**

1. Charlie leaves the group (via Chat Settings → Leave Group)
2. Check the "seen by" label on Alice's previous message

**Expected:**

- ✅ "seen by Bob, Charlie" remains visible
- ✅ Charlie's read receipt doesn't disappear when they leave
- ✅ Historical data preserved

**Pass Criteria:**

- ✅ Read receipts persist after user leaves
- ✅ No errors when displaying receipts for ex-members

---

### Scenario 8: Sender's Own Messages

**Setup:**

1. Group chat with multiple users
2. Various users send messages

**Steps:**

1. As Alice, send a message
2. Check if you see "seen by Alice" (should NOT)
3. Have Bob read the message
4. Check Alice's view

**Expected:**

- ✅ Alice does NOT see herself in the "seen by" list
- ✅ Only other users appear in read receipts
- ✅ "seen by Bob" (not "seen by Alice, Bob")

**Pass Criteria:**

- ✅ Sender excluded from their own read receipts
- ✅ Only other members shown

---

### Scenario 9: Performance with Many Users

**Setup:**

1. Group chat with 8-10 users (if possible)
2. All users read the messages

**Steps:**

1. Send a message as User 1
2. Have all other users read it
3. Check User 1's view
4. Check scrolling performance
5. Check if names overflow and expand/collapse works

**Expected:**

- ✅ All users listed in "seen by"
- ✅ No lag or performance issues
- ✅ Expand/collapse works smoothly with many names
- ✅ Names fit within left half of screen

**Pass Criteria:**

- ✅ Handles large number of users (8-10)
- ✅ No performance degradation
- ✅ UI remains responsive

---

### Scenario 10: Mixed Read Status

**Setup:**

1. Group chat with Alice (you), Bob, Charlie, and Dave
2. Send 5 messages as Alice

**Steps:**

1. As Alice, send 5 messages (M1, M2, M3, M4, M5)
2. As Bob, read all 5 messages
3. As Charlie, read only M1, M2, M3
4. As Dave, read only M1
5. Check Alice's view

**Expected:**

- M1: "seen by Bob, Charlie, Dave"
- M2: "seen by Bob, Charlie"
- M3: "seen by Bob, Charlie"
- M4: "seen by Bob"
- M5: "seen by Bob"

**Pass Criteria:**

- ✅ Each message shows correct set of users
- ✅ Users only appear on messages they've read
- ✅ No duplicate names
- ✅ Names in consistent order

---

## 🐛 Known Issues / Edge Cases to Watch

### Things to Look Out For:

1. **Name Resolution:**

   - What if a user's display name isn't set?
   - Expected: Falls back to email or UID

2. **Rapid Switching:**

   - What if user rapidly switches between chats?
   - Expected: Subscriptions clean up properly, no memory leaks

3. **Offline Users:**

   - What if a user reads while offline?
   - Expected: Read receipt updates when they come back online

4. **Empty Display Names:**
   - What if display name is empty string?
   - Expected: Falls back to email or UID

---

## ✅ Final Verification Checklist

Before marking this feature as complete, verify:

- [ ] Read receipts appear in all group chats
- [ ] Read receipts do NOT appear in DMs
- [ ] Real-time updates work reliably
- [ ] Expand/collapse works when names overflow
- [ ] Label stays within left 50% of screen
- [ ] No "seen by" when no one else has read
- [ ] Sender excluded from their own receipts
- [ ] Multiple messages track independently
- [ ] Performance is good with 10+ users
- [ ] No linting errors in code
- [ ] Firestore rules deployed successfully

---

## 🚨 If Tests Fail

### Debugging Steps:

1. **Read receipts not appearing:**

   - Check Firestore console for `participants` subcollection
   - Verify `lastReadMid` is being updated
   - Check browser/app console for errors

2. **Real-time updates not working:**

   - Verify Firestore rules are deployed
   - Check network connectivity
   - Verify subscription is active (console logs)

3. **Expand/collapse not working:**

   - Verify `TouchableOpacity` is enabled
   - Check if `hasOverflow` logic is correct
   - Verify `numberOfLines` prop changes

4. **Performance issues:**
   - Check if too many re-renders
   - Verify efficient filtering in `renderMessage`
   - Check for unnecessary subscriptions

---

## 📊 Success Criteria

This feature is considered **complete** when:

✅ All 10 test scenarios pass  
✅ No linting errors  
✅ No console errors in production  
✅ Real-time updates work reliably  
✅ UI/UX is polished and smooth  
✅ Works on both iOS and Android  
✅ Performance is acceptable with 10+ users

---

**End of Testing Guide**
