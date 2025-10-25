# Meeting Scheduler - Complete Testing Guide

**Date:** October 24, 2025  
**Feature:** Autonomous Meeting Scheduler  
**Status:** Ready for Testing

---

## 🎯 Pre-Testing Setup

### Requirements:

- [ ] App running on device/simulator
- [ ] Firebase connection active
- [ ] At least 3 test users available
- [ ] Access to Firebase Console
- [ ] Access to multiple devices/accounts (for multi-user testing)

### Initial Setup:

1. Start the app: `npm start` or `expo start`
2. Open Firebase Console: https://console.firebase.google.com/project/whisper-app-aa915
3. Have 3+ test accounts ready to log in

---

## 📋 Test Suite

### TEST 1: Role Assignment (Foundation)

**Objective:** Verify member role system works correctly

**Steps:**

1. Create a new group chat with 3-4 members
2. Open Chat Settings (gear icon)
3. Scroll to "Members" section
4. Tap on YOUR role badge (marked with "You")
5. Modal should appear with 6 roles
6. Select "Design"
7. Verify badge updates to "Role: Design"
8. Close and reopen Chat Settings
9. Verify role persists

**Expected Results:**

- ✅ Your role badge is tappable (shows arrow ›)
- ✅ Modal appears with all 6 role options
- ✅ Selected role has purple background
- ✅ Badge updates immediately
- ✅ Role persists across navigation
- ✅ Other members' badges are NOT tappable (no arrow, dimmed)

**Firestore Verification:**

- Navigate to: `/conversations/{conversationId}/members/{yourUserId}`
- Verify `role: "Design"` exists

---

### TEST 2: Basic Meeting Scheduling (Group Chat)

**Objective:** Schedule a simple meeting with all members

**Setup:**

- Group chat with 3+ members
- All members have roles assigned

**Steps:**

1. Open the group chat
2. Open Casper panel (AI icon)
3. Go to "Planner" tab
4. Enter command: `"Schedule a meeting with everyone for tomorrow at 2pm"`
5. Click "Run Plan"
6. Wait for processing

**Expected Results:**

- ✅ System detects as schedule command
- ✅ Confirmation card appears with green checkmark
- ✅ Meeting title: "Team Meeting"
- ✅ Date shows tomorrow's date at 2:00 PM
- ✅ Duration: 60 minutes (default)
- ✅ Participant count matches group size
- ✅ "Dismiss" button visible

**Firestore Verification:**

- Check: `/schedules/{yourUserId}/events/`
- Should see new meeting event
- Check: `/schedules/{otherUserId}/events/`
- Same meeting should exist for each participant

---

### TEST 3: Role-Based Meeting Scheduling

**Objective:** Schedule meeting with specific role

**Setup:**

- Group chat with mixed roles (at least 1 Designer, 1 PM)

**Steps:**

1. Planner tab
2. Command: `"Schedule a meeting with all designers for wednesday at 3pm"`
3. Run Plan
4. Check confirmation

**Expected Results:**

- ✅ Meeting title: "Design Meeting"
- ✅ Participant count = number of designers only
- ✅ Date: Wednesday at 3:00 PM
- ✅ Other role members NOT included

**Variations to Test:**

- `"Schedule with all pms for monday at 10am"` → Only PMs
- `"Schedule with all engineers for friday at 4pm"` → Only SEs
- `"Schedule with all designers and pms for tuesday at 11am"` → Both roles

---

### TEST 4: Planner Tab Display

**Objective:** Verify meetings appear in Actions tab

**Steps:**

1. After scheduling a meeting (Test 2 or 3)
2. Switch to "Actions" tab in Casper panel
3. Pull down to refresh

**Expected Results:**

- ✅ "📅 Upcoming Meetings (1)" section at top
- ✅ Meeting card shows:
  - Calendar icon + meeting title
  - Date and time (formatted)
  - Duration in minutes
  - Participant count
  - Green "Accept" button
  - Red "Decline" button
- ✅ Regular action items appear below
- ✅ "✓ Action Items (X)" header

**Visual Check:**

```
📅 Upcoming Meetings (1)
┌────────────────────────────────┐
│ 📅 Design Meeting              │
│ 🕐 Wednesday, Oct 30 at 3:00 PM│
│ ⏱️ 60 minutes                  │
│ 👥 2 participant(s)            │
│ [✓ Accept]  [✗ Decline]       │
└────────────────────────────────┘
```

---

### TEST 5: Multiple User Verification

**Objective:** Verify all participants receive the meeting

**Setup:**

- 3 devices/browsers with different accounts
- All in the same group chat

**Steps:**

1. User A schedules: `"Schedule meeting with everyone for tomorrow at 2pm"`
2. User B opens Casper → Actions tab
3. User C opens Casper → Actions tab
4. All pull to refresh

**Expected Results:**

- ✅ User A sees meeting in Actions
- ✅ User B sees same meeting in Actions
- ✅ User C sees same meeting in Actions
- ✅ All show same title, time, duration
- ✅ Participant count matches group size

---

### TEST 6: Conflict Detection

**Objective:** Verify system prevents double-booking

**Steps:**

1. Schedule meeting: `"Schedule meeting for tomorrow at 2pm"`
2. Try to schedule another: `"Schedule meeting for tomorrow at 2:30pm"`
3. Check error message

**Expected Results:**

- ✅ Second schedule attempt shows error
- ✅ Error message lists conflicting meeting
- ✅ Shows: "You have conflicting meetings at that time:"
- ✅ Lists the first meeting with time
- ✅ Suggests: "Please choose a different time"
- ✅ No meeting created in Firestore

---

### TEST 7: DM Meeting Scheduling

**Objective:** Schedule meeting in direct message

**Setup:**

- Open a DM (1-on-1 conversation)

**Steps:**

1. Open Casper → Planner
2. Command: `"Schedule a meeting for tomorrow at 3pm"`
3. Run Plan

**Expected Results:**

- ✅ Meeting created with just 2 participants
- ✅ Both users see meeting in Actions
- ✅ Meeting title shows partner's name

**Alternative Commands:**

- `"Schedule with this user for friday at 11am"`
- `"Schedule meeting for next week at 2pm"`

---

### TEST 8: Custom Duration

**Objective:** Schedule with non-default duration

**Steps:**

1. Command: `"Schedule a 30 minute meeting with everyone for tomorrow at 2pm"`
2. Check confirmation

**Expected Results:**

- ✅ Duration: 30 minutes (not 60)
- ✅ Other details correct

**Variations:**

- `"Schedule a 2 hour meeting..."` → 120 minutes
- `"Schedule a 15 minute meeting..."` → 15 minutes
- `"Schedule a 90 minute meeting..."` → 90 minutes

---

### TEST 9: Name-Based Selection

**Objective:** Schedule with specific named users

**Setup:**

- Group chat with users Alice, Bob, Carol

**Steps:**

1. Command: `"Schedule a meeting with Alice and Bob for thursday at 4pm"`
2. Check participant count

**Expected Results:**

- ✅ Participant count = 3 (you + Alice + Bob)
- ✅ Carol NOT included
- ✅ Names matched via fuzzy matching

---

### TEST 10: Date Format Variations

**Objective:** Test different date input formats

**Test Each:**
| Command | Expected Date |
|---------|---------------|
| "...for tomorrow at 2pm" | Next day, 2 PM |
| "...for next friday at 3pm" | Following Friday, 3 PM |
| "...for 11/4 at 2pm" | November 4, 2 PM |
| "...for november 4th at 2pm" | November 4, 2 PM |
| "...for nov 4 at 2pm" | November 4, 2 PM |
| "...for wednesday at 2pm" | Next Wednesday, 2 PM |

**For Each:**

- ✅ Date parsed correctly
- ✅ Time set correctly
- ✅ Confirmation shows expected date

---

### TEST 11: Error Handling

**Objective:** Test invalid inputs gracefully

**Test Cases:**

#### A. Past Date

- Command: `"Schedule meeting for yesterday at 2pm"`
- Expected: ❌ Error: "The meeting date/time is in the past"

#### B. No Participants

- Command: `"Schedule meeting with Bob"` (Bob doesn't exist)
- Expected: ❌ Error: "No participants could be identified"

#### C. Invalid Command

- Command: `"Maybe schedule something"`
- Expected: ❌ Error: "I couldn't understand that scheduling command"

#### D. Too Short Query

- Command: `"Schedule"`
- Expected: ❌ Error: "Query is too short (min 10 characters)"

---

### TEST 12: Refresh and Persistence

**Objective:** Verify data persists across app restarts

**Steps:**

1. Schedule a meeting
2. Close app completely
3. Reopen app
4. Navigate to Actions tab

**Expected Results:**

- ✅ Meeting still visible
- ✅ All details intact
- ✅ Date/time correct

---

### TEST 13: Large Group

**Objective:** Test with many participants

**Setup:**

- Group chat with 10+ members

**Steps:**

1. Assign various roles to members
2. Schedule: `"Meeting with all designers for monday at 10am"`
3. Check performance

**Expected Results:**

- ✅ All designers matched
- ✅ Events created for all
- ✅ No timeout or errors
- ✅ Confirmation within 3 seconds

---

### TEST 14: Multi-Role Command

**Objective:** Schedule with multiple roles

**Steps:**

1. Command: `"Schedule with all pms, designers, and engineers for tomorrow at 2pm"`
2. Check participants

**Expected Results:**

- ✅ All 3 roles included
- ✅ Participant count = sum of all matching users
- ✅ Other roles excluded

---

### TEST 15: Edge Case - Self Only

**Objective:** Test when you're the only match

**Setup:**

- Group where you're the only Designer

**Steps:**

1. Command: `"Schedule with all designers for tomorrow at 2pm"`
2. Check result

**Expected Results:**

- ✅ Meeting still created
- ✅ Participant count = 1 (just you)
- ✅ Or error if system requires 2+ participants

---

## 🐛 Known Issues & Workarounds

### Issue 1: Accept/Decline Not Implemented

**Status:** UI only  
**Impact:** Buttons show but don't work  
**Workaround:** Noted as future enhancement  
**Mitigation:** Don't click the buttons for now

### Issue 2: No Push Notifications

**Status:** Not implemented  
**Impact:** Users must manually check Actions tab  
**Workaround:** Periodically refresh Actions tab  
**Mitigation:** Remind users to check regularly

### Issue 3: Firestore Index Building

**Status:** May take 5-10 minutes after first deploy  
**Impact:** Queries might fail initially  
**Workaround:** Wait for index build to complete  
**Mitigation:** Check Firebase Console for index status

---

## 📊 Testing Matrix

| Test               | Priority | Status | Notes                |
| ------------------ | -------- | ------ | -------------------- |
| Role Assignment    | High     | ⏳     | Foundation test      |
| Basic Scheduling   | High     | ⏳     | Core functionality   |
| Role-Based         | High     | ⏳     | Key feature          |
| Actions Display    | High     | ⏳     | UI verification      |
| Multi-User         | High     | ⏳     | Requires 2+ devices  |
| Conflict Detection | Medium   | ⏳     | Important safety     |
| DM Scheduling      | Medium   | ⏳     | Alternative flow     |
| Custom Duration    | Low      | ⏳     | Nice to have         |
| Name-Based         | Medium   | ⏳     | Alternative matching |
| Date Formats       | Medium   | ⏳     | Input flexibility    |
| Error Handling     | High     | ⏳     | Critical UX          |
| Persistence        | High     | ⏳     | Data integrity       |
| Large Group        | Low      | ⏳     | Scale test           |
| Multi-Role         | Medium   | ⏳     | Complex matching     |
| Self Only          | Low      | ⏳     | Edge case            |

---

## 🚦 Testing Progress Tracking

### Phase 1 Tests (Foundation):

- [ ] TEST 1: Role Assignment

### Phase 2 Tests (Core):

- [ ] TEST 2: Basic Scheduling
- [ ] TEST 3: Role-Based Scheduling
- [ ] TEST 6: Conflict Detection
- [ ] TEST 11: Error Handling

### Phase 3 Tests (UI):

- [ ] TEST 4: Actions Display
- [ ] TEST 5: Multiple Users
- [ ] TEST 12: Persistence

### Phase 4 Tests (Advanced):

- [ ] TEST 7: DM Scheduling
- [ ] TEST 8: Custom Duration
- [ ] TEST 9: Name-Based Selection
- [ ] TEST 10: Date Formats
- [ ] TEST 13: Large Group
- [ ] TEST 14: Multi-Role
- [ ] TEST 15: Self Only

---

## 📝 Bug Report Template

If you find issues, document them using this format:

```markdown
### Bug: [Short Description]

**Severity:** Critical / High / Medium / Low
**Test:** TEST X - [Test Name]

**Steps to Reproduce:**

1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Screenshots/Logs:**

**Device/Browser:**

**Workaround:**
```

---

## ✅ Success Criteria

Phase 4 testing is complete when:

- [ ] All High priority tests pass
- [ ] At least 80% of Medium priority tests pass
- [ ] No Critical or High severity bugs remain
- [ ] Multi-user scenarios verified
- [ ] Performance is acceptable (<3s for scheduling)
- [ ] Data persists correctly
- [ ] Error handling is graceful
- [ ] UI is intuitive and responsive

---

## 🎉 Ready to Test!

**Start with:** TEST 1 (Role Assignment)  
**Then proceed to:** TEST 2 (Basic Scheduling)  
**Report issues using:** Bug Report Template above

**Good luck testing! 🚀**
