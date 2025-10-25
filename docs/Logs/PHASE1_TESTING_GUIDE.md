# Phase 1 Testing Guide - Role Management System

**Last Updated:** October 24, 2025  
**Feature:** Member Role System for Meeting Scheduler

---

## Quick Start

### 1. Prerequisites

- [ ] App running on device/simulator
- [ ] Firebase connection active
- [ ] At least 3 users available for testing
- [ ] Access to Firebase Console

### 2. Create Test Group Chat

1. Open the app
2. Navigate to "New Chat"
3. Select "Group Chat"
4. Add 3+ members
5. Create the group

---

## Testing Scenarios

### Scenario 1: Default Role Assignment

**Steps:**

1. Create a new group chat with 3 members
2. Go to Conversations screen
3. Tap on the group chat
4. Tap the settings icon (top right)
5. Scroll to "Members" section

**Expected Results:**

- ✅ All members show "Role: Friend" badge
- ✅ Badge appears below member email
- ✅ Badge has purple/amethyst color for the role text
- ✅ Badge has arrow (›) indicator

**Visual Check:**

```
┌─────────────────────────────────┐
│ John Doe                    (You)│
│ john@example.com                 │
│ Role: Friend  ›                  │
└─────────────────────────────────┘
```

---

### Scenario 2: Changing a Member's Role

**Steps:**

1. In Chat Settings, locate a member (not yourself)
2. Tap on the "Role: Friend ›" badge
3. Modal should appear with role options

**Expected Results:**

- ✅ Modal appears with semi-transparent overlay
- ✅ Modal shows title "Select Role"
- ✅ Six role options displayed:
  - Friend (currently selected - highlighted in purple)
  - PM
  - SE
  - QA
  - Design
  - Stakeholder
- ✅ Cancel button at bottom
- ✅ Selected role has purple background
- ✅ Selected role text is white

**Visual Check:**

```
┌─────────────────────────────────┐
│          Select Role             │
│                                  │
│  ┌─────────────────────────┐   │
│  │       Friend            │   │  ← Purple bg, white text
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │         PM              │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │         SE              │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │         QA              │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │       Design            │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │     Stakeholder         │   │
│  └─────────────────────────┘   │
│                                  │
│  ┌─────────────────────────┐   │
│  │       Cancel            │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Steps (continued):** 4. Tap on "PM" option 5. Modal closes immediately

**Expected Results:**

- ✅ Modal closes
- ✅ Member's badge updates to "Role: PM ›"
- ✅ Change happens instantly (no loading state needed)
- ✅ Badge color remains purple

---

### Scenario 3: Role Persistence

**Steps:**

1. After changing a member's role to "PM"
2. Navigate back to Conversations screen
3. Re-open the group chat settings

**Expected Results:**

- ✅ Member still shows "Role: PM ›"
- ✅ Role persists across navigation
- ✅ No reset to default

---

### Scenario 4: Multiple Role Changes

**Steps:**

1. In Chat Settings with 3+ members
2. Assign different roles to different members:
   - Member 1: PM
   - Member 2: Design
   - Member 3: SE

**Expected Results:**

- ✅ Each member shows their assigned role
- ✅ All roles display correctly simultaneously
- ✅ No conflicts or overwrites

**Visual Check:**

```
┌─────────────────────────────────┐
│ Alice Johnson                    │
│ alice@example.com                │
│ Role: PM  ›                      │
├─────────────────────────────────┤
│ Bob Smith                        │
│ bob@example.com                  │
│ Role: Design  ›                  │
├─────────────────────────────────┤
│ Carol White                      │
│ carol@example.com                │
│ Role: SE  ›                      │
└─────────────────────────────────┘
```

---

### Scenario 5: Your Own Role vs Other Members

**Steps:**

1. In Chat Settings, find your own member entry (marked "(You)")
2. Tap on your role badge

**Expected Results:**

- ✅ Your role badge is tappable (shows arrow ›)
- ✅ Modal appears and functions normally
- ✅ You can change your own role

**Steps (continued):**

3. Look at other members' role badges
4. Try to tap on another member's role badge

**Expected Results:**

- ✅ Other members' role badges are NOT tappable (no arrow ›)
- ✅ Their badges appear dimmed/disabled (60% opacity)
- ✅ Their role text is gray instead of purple
- ✅ Tapping does nothing (no modal appears)

**Visual Check - Your Role:**

```
┌─────────────────────────────────┐
│ John Doe                    (You)│
│ john@example.com                 │
│ Role: Friend  ›                  │  ← Purple, with arrow, tappable
└─────────────────────────────────┘
```

**Visual Check - Other Member's Role:**

```
┌─────────────────────────────────┐
│ Alice Johnson                    │
│ alice@example.com                │
│ Role: PM                         │  ← Gray, no arrow, disabled
└─────────────────────────────────┘
```

**Note:** Only the current user can change their own role. This ensures members self-identify rather than being arbitrarily labeled by others.

---

### Scenario 6: Modal Cancellation

**Steps:**

1. Tap on a member's role badge
2. Modal appears
3. Tap "Cancel" button

**Expected Results:**

- ✅ Modal closes
- ✅ No role change occurs
- ✅ Original role remains

**Alternative Cancel:** 4. Tap on a member's role badge again 5. Modal appears 6. Tap outside the modal (on the dark overlay)

**Expected Results:**

- ✅ Modal closes
- ✅ No role change occurs

---

### Scenario 7: Firestore Data Verification

**Steps:**

1. After assigning roles to members
2. Open Firebase Console
3. Navigate to Firestore Database
4. Go to: `conversations/{conversationId}/members`

**Expected Results:**

- ✅ Subcollection `members` exists
- ✅ Each member has a document with their userId
- ✅ Document contains:
  ```json
  {
    "userId": "ABC123",
    "displayName": "John Doe",
    "role": "PM",
    "joinedAt": <Timestamp>
  }
  ```
- ✅ `role` field matches what's shown in the app
- ✅ `joinedAt` timestamp is present

---

### Scenario 8: New Member Addition

**Steps:**

1. In Chat Settings, scroll to "Add Member" section
2. Enter a valid email address
3. Tap "Add"
4. Wait for member to be added

**Expected Results:**

- ✅ New member appears in members list
- ✅ New member has "Role: Friend" by default
- ✅ You can immediately change their role

---

## Edge Cases

### Edge Case 1: Rapid Role Changes

**Test:** Quickly change a member's role 5 times in a row

**Expected:**

- ✅ All changes register correctly
- ✅ Final role is the last one selected
- ✅ No UI glitches or freezes

---

### Edge Case 2: Offline Mode

**Test:**

1. Turn off WiFi/data
2. Try to change a member's role
3. Turn WiFi/data back on

**Expected:**

- ✅ Change queues locally
- ✅ Syncs when connection restored
- ✅ No error messages shown to user

---

### Edge Case 3: Large Group

**Test:** Create a group with 10+ members

**Expected:**

- ✅ All members show role badges
- ✅ Scrolling works smoothly
- ✅ Role selector works for all members
- ✅ No performance issues

---

## Visual QA Checklist

### Typography & Colors:

- [ ] Role label text is gray/secondary color
- [ ] Role value text is purple (amethyst)
- [ ] Arrow is gray/secondary color
- [ ] Modal title is large and semibold
- [ ] Role options are readable and centered

### Spacing:

- [ ] Role badge has proper padding
- [ ] Badge doesn't overlap with email
- [ ] Badge doesn't overlap with "Remove" button
- [ ] Modal has comfortable padding
- [ ] Role options have space between them

### Interactions:

- [ ] Badge has visible tap feedback
- [ ] Modal buttons have tap feedback
- [ ] Selected role option is clearly highlighted
- [ ] Cancel button is distinguishable

### Accessibility:

- [ ] All text is readable on light/dark modes
- [ ] Touch targets are large enough (44x44 minimum)
- [ ] Color contrast meets WCAG standards

---

## Troubleshooting

### Issue: Role badge not showing

**Check:**

1. Verify `memberDetails` state includes `role` field
2. Check React DevTools for state values
3. Verify role selector UI is rendered in the correct location

### Issue: Modal not appearing

**Check:**

1. Verify `selectedMemberForRole` state is being set
2. Check that `Modal` component is imported
3. Verify modal visibility condition: `visible={selectedMemberForRole !== null}`

### Issue: Role not persisting

**Check:**

1. Firebase Console: verify data is written to Firestore
2. Check `handleRoleChange` function for errors in console
3. Verify Firestore rules allow writes to `/conversations/{cid}/members/{uid}`
4. Check network tab for Firestore write requests

### Issue: Firestore permission denied

**Check:**

1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Verify rules include members subcollection:
   ```
   match /conversations/{cid}/members/{memberId} {
     allow read, write: if isConversationMember(cid);
   }
   ```
3. Confirm user is a member of the conversation

---

## Success Criteria

Phase 1 is considered complete when:

- ✅ All scenarios pass without errors
- ✅ Roles persist across app restarts
- ✅ Firestore data matches UI display
- ✅ No console errors related to role management
- ✅ Visual QA checklist is complete
- ✅ At least 3 different roles have been tested
- ✅ Modal animations are smooth
- ✅ No race conditions or state conflicts

---

## Next Steps After Testing

Once Phase 1 testing is complete:

1. **Document any bugs** found during testing
2. **Take screenshots** of the working feature
3. **Proceed to Phase 2** implementation
4. **Use role data** for meeting scheduler commands

---

## Test Coverage Summary

| Test Area    | Scenarios | Edge Cases | Status |
| ------------ | --------- | ---------- | ------ |
| UI Display   | 4         | 1          | ⏳     |
| Role Changes | 2         | 2          | ⏳     |
| Persistence  | 1         | 1          | ⏳     |
| Modal        | 2         | 0          | ⏳     |
| Firestore    | 1         | 1          | ⏳     |
| **Total**    | **10**    | **5**      | **⏳** |

---

**Happy Testing! 🚀**
