# Polish PR #2: Testing Guide

## Navigation Logic Fix - Back Navigation from New Chat

### Overview
This PR fixes the back navigation behavior when creating a new chat from the New Chat screen. The fix ensures that after sending at least one message in a newly created chat, the back button navigates to the Conversations list instead of the New Chat screen.

---

## Prerequisites
- App is installed and running
- You have at least one other user to test with
- Firebase is properly configured

---

## Test Scenarios

### ✅ Scenario 1: New DM with Messages Sent

**Goal:** Verify that back navigation goes to Conversations after sending messages

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen (Home tab)
3. Tap the **New Chat** button (header button with pencil icon or floating +)
4. In the New Chat screen, search for a user by typing their email
5. Select the user from the search results
6. Tap **"Create Chat"** button
7. You should now be in the Chat screen with the selected user
8. Type a message (e.g., "Hello!") and tap send
9. Press the **back button** (top-left arrow)

**Expected Result:**
- ✅ You navigate to the **Conversations** screen
- ✅ The new conversation appears in the list
- ✅ You do NOT see the New Chat screen

**Failure Case:**
- ❌ If you navigate back to the New Chat screen, the fix is not working

---

### ✅ Scenario 2: New DM without Messages Sent

**Goal:** Verify that back navigation goes to New Chat when no messages are sent

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen (Home tab)
3. Tap the **New Chat** button
4. In the New Chat screen, search for a user
5. Select the user from the search results
6. Tap **"Create Chat"** button
7. You should now be in the Chat screen
8. **Do NOT send any messages**
9. Press the **back button** immediately

**Expected Result:**
- ✅ You navigate back to the **New Chat** screen
- ✅ The search field is still visible
- ✅ You do NOT see the Conversations screen

**Failure Case:**
- ❌ If you navigate to the Conversations screen, the fix is not working correctly

---

### ✅ Scenario 3: New Group Chat with Messages Sent

**Goal:** Verify that the fix works for group chats as well

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen
3. Tap the **New Chat** button
4. In the New Chat screen, search for and select **2 or more users**
5. Notice the button changes to **"Create Group (N)"** where N is the number of selected users
6. Tap the **"Create Group"** button
7. You should now be in the Group Chat screen
8. Send at least one message (text or image)
9. Press the **back button**

**Expected Result:**
- ✅ You navigate to the **Conversations** screen
- ✅ The new group conversation appears in the list
- ✅ You do NOT see the New Chat screen

**Failure Case:**
- ❌ If you navigate back to the New Chat screen, the fix is not working

---

### ✅ Scenario 4: New Group Chat without Messages Sent

**Goal:** Verify group chat behavior when no messages are sent

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen
3. Tap the **New Chat** button
4. Select **2 or more users**
5. Tap **"Create Group (N)"**
6. **Do NOT send any messages**
7. Press the **back button** immediately

**Expected Result:**
- ✅ You navigate back to the **New Chat** screen
- ✅ The search field is still visible

**Failure Case:**
- ❌ If you navigate to the Conversations screen, the fix is not working correctly

---

### ✅ Scenario 5: Image Messages

**Goal:** Verify that sending image messages also counts as "message sent"

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen
3. Create a new chat (DM or Group) via New Chat screen
4. Instead of typing text, tap the **+ button** to pick an image
5. Select an image from your device
6. Tap the **send button** (arrow up)
7. Wait for the image to upload and send
8. Press the **back button**

**Expected Result:**
- ✅ You navigate to the **Conversations** screen
- ✅ The conversation shows in the list with the image message

**Failure Case:**
- ❌ If you navigate back to the New Chat screen, the image message counting is not working

---

### ✅ Scenario 6: Existing Conversation Navigation (Regression Test)

**Goal:** Ensure existing conversation navigation is NOT affected

**Steps:**
1. Launch the app and log in
2. Navigate to **Conversations** screen
3. Tap on an **existing conversation** (one that was created previously)
4. Send a message or just view the chat
5. Press the **back button**

**Expected Result:**
- ✅ You navigate to the **Conversations** screen
- ✅ Behavior is the same as before the fix (no regression)

**Failure Case:**
- ❌ If navigation behaves differently than before, there may be a regression

---

### ✅ Scenario 7: Multiple Messages

**Goal:** Verify that the counter works correctly with multiple messages

**Steps:**
1. Create a new chat via New Chat screen
2. Send multiple messages in succession:
   - Text message: "Hello"
   - Text message: "How are you?"
   - Image message
3. Press the **back button**

**Expected Result:**
- ✅ You navigate to the **Conversations** screen
- ✅ All messages are visible in the conversation

---

### ✅ Scenario 8: Fast Navigation (Edge Case)

**Goal:** Test rapid back button press before message is fully sent

**Steps:**
1. Create a new chat via New Chat screen
2. Type a message and tap send
3. **Immediately** press the back button (before the message is confirmed)

**Expected Result:**
- ✅ You navigate to the **Conversations** screen (since the message was initiated)
- ✅ The message should still send in the background

**Note:** If the optimistic message count increments immediately (which it should based on the implementation), this should work correctly.

---

## Summary Checklist

- [ ] Scenario 1: New DM with messages → Goes to Conversations ✅
- [ ] Scenario 2: New DM without messages → Goes to New Chat ✅
- [ ] Scenario 3: New Group with messages → Goes to Conversations ✅
- [ ] Scenario 4: New Group without messages → Goes to New Chat ✅
- [ ] Scenario 5: Image messages count correctly ✅
- [ ] Scenario 6: Existing conversations work as before ✅
- [ ] Scenario 7: Multiple messages work correctly ✅
- [ ] Scenario 8: Fast navigation edge case ✅

---

## Known Edge Cases

### Edge Case 1: Failed Message Send
If a message fails to send (network error), the counter still increments. This is acceptable because the user initiated the send action, indicating intent to stay in the conversation.

### Edge Case 2: Draft Messages
Draft messages (typed but not sent) do NOT count as sent messages, which is correct behavior.

---

## Acceptance Criteria

✅ **All test scenarios pass**
✅ **No linter errors**
✅ **No TypeScript errors**
✅ **No breaking changes to existing navigation**
✅ **Smooth user experience**

---

## Status
**Ready for Testing** - All implementation complete

