# PR #11 — Notifications + Message Timestamps — Testing Guide

## Overview

This guide provides step-by-step instructions for testing the in-app banner notification system and message timestamp display.

---

## Prerequisites

- Two test devices/emulators (or one device + one emulator)
- Two test accounts with valid credentials
- App running on both devices with valid Firebase configuration

---

## Test Scenarios

### 1. Banner Display and Animation

**Objective:** Verify banner appears with correct content and animations

**Steps:**

1. Login to Account A on Device 1
2. Login to Account B on Device 2
3. On Device 1, navigate to Conversations screen (or Profile screen)
4. On Device 2, send a message to Account A
5. Observe Device 1

**Expected Results:**

- [ ] Banner slides in from top with smooth animation
- [ ] Banner shows sender name (Account B's display name)
- [ ] Banner shows message preview text
- [ ] Banner has purple left border
- [ ] Banner respects safe area (doesn't overlap notch/status bar)
- [ ] Banner appears at z-index above all other content

**Pass/Fail:** ****\_\_\_****

---

### 2. Banner Auto-Dismiss

**Objective:** Verify banner automatically dismisses after timeout

**Steps:**

1. Trigger a notification (follow steps 1-4 from Test 1)
2. Do not interact with the banner
3. Wait 5 seconds

**Expected Results:**

- [ ] Banner automatically slides out after ~5 seconds
- [ ] Animation is smooth
- [ ] Banner is completely removed from view
- [ ] No lingering UI artifacts

**Pass/Fail:** ****\_\_\_****

---

### 3. Banner Manual Dismiss - Swipe Up

**Objective:** Verify swipe up gesture dismisses banner

**Steps:**

1. Trigger a notification
2. Swipe up on the banner (from banner to top of screen)

**Expected Results:**

- [ ] Banner slides out upward immediately
- [ ] Banner dismisses before auto-timeout
- [ ] Gesture is responsive
- [ ] Swipe cancels auto-dismiss timer

**Pass/Fail:** ****\_\_\_****

---

### 4. Banner Manual Dismiss - Swipe Horizontal

**Objective:** Verify horizontal swipe dismisses banner

**Steps:**

1. Trigger a notification
2. Swipe left or right on the banner

**Expected Results:**

- [ ] Banner slides out in the direction of swipe
- [ ] Banner dismisses before auto-timeout
- [ ] Gesture is responsive
- [ ] Works for both left and right swipes

**Pass/Fail:** ****\_\_\_****

---

### 5. Banner Manual Dismiss - Close Button

**Objective:** Verify close button dismisses banner

**Steps:**

1. Trigger a notification
2. Tap the "✕" close button on the right side of banner

**Expected Results:**

- [ ] Banner dismisses immediately
- [ ] Close button has sufficient touch target
- [ ] Banner slides out smoothly
- [ ] No navigation occurs (stays on current screen)

**Pass/Fail:** ****\_\_\_****

---

### 6. Banner Tap-to-Navigate

**Objective:** Verify tapping banner navigates to conversation

**Steps:**

1. Device 1 on Conversations screen
2. Device 2 sends message to Device 1
3. Banner appears on Device 1
4. Tap anywhere on banner (except close button)

**Expected Results:**

- [ ] App navigates to ChatScreen
- [ ] Correct conversation opens
- [ ] Banner dismisses immediately
- [ ] Message is visible in chat
- [ ] Navigation is smooth

**Pass/Fail:** ****\_\_\_****

---

### 7. No Notification in Active Conversation

**Objective:** Verify no banner shows for messages in active chat

**Steps:**

1. Device 1 opens ChatScreen for conversation with Account B
2. Device 2 sends message to Device 1 in the same conversation
3. Observe Device 1

**Expected Results:**

- [ ] No banner appears
- [ ] Message appears directly in chat list
- [ ] No notification interference with typing
- [ ] Message marked as delivered/read automatically

**Pass/Fail:** ****\_\_\_****

---

### 8. Notification for Different Conversation

**Objective:** Verify banner shows when in a different chat

**Steps:**

1. Device 1 opens ChatScreen with User C
2. Device 2 (User B) sends message to Device 1
3. Observe Device 1

**Expected Results:**

- [ ] Banner appears showing User B's message
- [ ] ChatScreen with User C remains visible in background
- [ ] Banner is positioned above chat interface
- [ ] Tapping banner switches to User B's conversation

**Pass/Fail:** ****\_\_\_****

---

### 9. No Notification for Own Messages

**Objective:** Verify no banner for messages sent by current user

**Steps:**

1. Device 1 on Conversations screen
2. Device 1 sends message to Account B
3. Observe Device 1

**Expected Results:**

- [ ] No banner appears on sending device
- [ ] Message appears in conversations list preview
- [ ] Optimistic UI works correctly
- [ ] No self-notification

**Pass/Fail:** ****\_\_\_****

---

### 10. Multiple Rapid Messages

**Objective:** Verify banner behavior with multiple quick messages

**Steps:**

1. Device 1 on Conversations screen
2. Device 2 sends 3 messages rapidly (within 2 seconds)
3. Observe Device 1

**Expected Results:**

- [ ] Banner shows for first message
- [ ] Banner updates with subsequent messages OR shows latest
- [ ] No multiple banners stacking
- [ ] Last message content is visible
- [ ] Banner behavior is smooth (no flickering)

**Pass/Fail:** ****\_\_\_****

---

### 11. Banner with Long Message

**Objective:** Verify banner truncates long messages properly

**Steps:**

1. Device 1 on Conversations screen
2. Device 2 sends very long message (>200 characters)
3. Observe Device 1

**Expected Results:**

- [ ] Banner appears with message preview
- [ ] Text is truncated with ellipsis (...)
- [ ] Banner maintains fixed height
- [ ] No text overflow
- [ ] Sender name still visible

**Pass/Fail:** ****\_\_\_****

---

### 12. Banner with Long Sender Name

**Objective:** Verify banner handles long display names

**Steps:**

1. Account B has very long display name (>30 characters)
2. Trigger notification from Account B

**Expected Results:**

- [ ] Sender name truncates with ellipsis
- [ ] Banner layout remains intact
- [ ] Message preview still visible
- [ ] No layout breaking

**Pass/Fail:** ****\_\_\_****

---

### 13. Group Chat Notifications

**Objective:** Verify banner works for group messages

**Steps:**

1. Create group chat with Account A, B, C
2. Device 1 (Account A) on Conversations screen
3. Device 2 (Account B) sends message to group
4. Observe Device 1

**Expected Results:**

- [ ] Banner appears with group name as title
- [ ] Message preview shows content
- [ ] Tapping navigates to group chat
- [ ] Banner works same as DM notifications

**Pass/Fail:** ****\_\_\_****

---

### 14. App Backgrounding

**Objective:** Verify notifications pause when app backgrounds

**Steps:**

1. Device 1 app in foreground
2. Device 1 press home button (app to background)
3. Device 2 sends message
4. Device 1 remains in background
5. Bring Device 1 app back to foreground

**Expected Results:**

- [ ] No banner while app in background
- [ ] No crash or error
- [ ] Messages sync when returning to foreground
- [ ] Conversations list updates correctly

**Pass/Fail:** ****\_\_\_****

---

### 15. Message Timestamps - Today's Messages

**Objective:** Verify timestamp formatting for today

**Steps:**

1. Send messages in a conversation today
2. Open ChatScreen for that conversation
3. Observe message timestamps

**Expected Results:**

- [ ] Timestamps show time format (e.g., "3:45 PM")
- [ ] Timestamps update correctly for each message
- [ ] Timestamps visible in message bubble meta row
- [ ] Timestamps positioned next to status indicators
- [ ] 12-hour format with AM/PM

**Pass/Fail:** ****\_\_\_****

---

### 16. Message Timestamps - Older Messages

**Objective:** Verify timestamp formatting for past dates

**Steps:**

1. View messages from previous days (if available)
   - OR manually adjust device date and send messages
2. Observe timestamps

**Expected Results:**

- [ ] Timestamps show date format (e.g., "Oct 20")
- [ ] Format shows abbreviated month + day
- [ ] Timestamps remain visible and readable
- [ ] Consistent styling with today's timestamps

**Pass/Fail:** ****\_\_\_****

---

### 17. Timestamp Position and Styling

**Objective:** Verify timestamp visual design

**Steps:**

1. Send various messages (text, different lengths)
2. Inspect timestamp placement

**Expected Results:**

- [ ] Timestamps in bottom-right of bubble
- [ ] Timestamps have reduced opacity (70%)
- [ ] Font size is smaller than message text
- [ ] Timestamps don't overlap message content
- [ ] Works for both sent and received messages
- [ ] Own messages: white timestamp color
- [ ] Other messages: secondary text color

**Pass/Fail:** ****\_\_\_****

---

### 18. Banner Z-Index and Overlays

**Objective:** Verify banner appears above all UI elements

**Steps:**

1. Navigate through different screens
2. Trigger notifications on each screen
3. Test: Conversations, Profile, ChatSettings, NewChat screens

**Expected Results:**

- [ ] Banner appears on top on Conversations screen
- [ ] Banner appears on top on Profile screen
- [ ] Banner appears on top on ChatSettings screen
- [ ] Banner appears on top on NewChat screen
- [ ] Banner doesn't get hidden by navigation headers
- [ ] Banner doesn't interfere with screen interactions

**Pass/Fail:** ****\_\_\_****

---

### 19. Notification Navigation State

**Objective:** Verify proper navigation stack after banner tap

**Steps:**

1. On Conversations screen
2. Banner appears
3. Tap banner to navigate to chat
4. Press back button

**Expected Results:**

- [ ] Opens ChatScreen correctly
- [ ] Back button returns to Conversations
- [ ] Navigation stack is correct
- [ ] No duplicate screens in stack

**Pass/Fail:** ****\_\_\_****

---

### 20. Performance and Memory

**Objective:** Verify no memory leaks or performance issues

**Steps:**

1. Trigger 20+ notifications over 5 minutes
2. Dismiss each in various ways
3. Navigate between screens
4. Monitor app performance

**Expected Results:**

- [ ] No memory warnings
- [ ] Animations remain smooth
- [ ] No lag or stuttering
- [ ] App remains responsive
- [ ] No crashes

**Pass/Fail:** ****\_\_\_****

---

## Edge Cases and Error Conditions

### 21. Network Disconnection

**Steps:**

1. Disconnect Device 1 from network
2. Device 2 sends message
3. Reconnect Device 1

**Expected Results:**

- [ ] No crash when offline
- [ ] Banner appears after reconnection
- [ ] Message syncs correctly
- [ ] No duplicate notifications

**Pass/Fail:** ****\_\_\_****

---

### 22. Rapid Screen Navigation

**Steps:**

1. Trigger notification
2. While banner is visible, rapidly navigate between screens

**Expected Results:**

- [ ] Banner remains visible during navigation
- [ ] Banner dismisses cleanly if timeout reached
- [ ] No visual glitches
- [ ] Banner tap still works correctly

**Pass/Fail:** ****\_\_\_****

---

### 23. Empty Message Content

**Steps:**

1. Send message with only whitespace (if possible)
2. Observe banner

**Expected Results:**

- [ ] Banner shows something (placeholder or trimmed content)
- [ ] No crash or error
- [ ] Banner still functional

**Pass/Fail:** ****\_\_\_****

---

## Summary

**Total Tests:** 23  
**Passed:** **\_**  
**Failed:** **\_**  
**Skipped:** **\_**

**Critical Issues:**

- **Minor Issues:**

- **Notes:**

- ***

## Sign-Off

**Tester Name:** ********\_\_\_********  
**Date:** ********\_\_\_********  
**Environment:** iOS / Android Emulator (circle one)  
**App Version:** ********\_\_\_********

**Recommendation:**  
[ ] Ready to merge  
[ ] Needs fixes (see issues above)  
[ ] Requires additional testing
