# PR #6 Testing Guide

Quick guide to test the Action & Decision Extraction features.

## Prerequisites

1. Have at least one conversation with 20+ messages
2. Make sure Casper panel is accessible (ghost button visible)
3. Use Expo Go on a physical device or emulator

## Test Scenarios

### Scenario 1: Action Item Detection

**Steps:**

1. Open any conversation
2. Send these messages (as different users if possible):
   ```
   User A: "I will update the documentation by EOD"
   User B: "Can you review the PR?"
   User C: "Let's deploy to staging tomorrow"
   ```
3. Open Casper panel (tap ghost button)
4. Navigate to "Actions" tab

**Expected Results:**

- All 3 messages should appear as action items
- First message should show due date "EOD"
- Confidence scores should be 70-90%
- Items sorted by confidence (highest first)

### Scenario 2: Decision Detection

**Steps:**

1. In the same conversation, send:
   ```
   User A: "We agreed to use TypeScript for the project"
   User B: "Final decision: deploy on Friday"
   User C: "Let's go with option A"
   ```
2. Navigate to "Decisions" tab in Casper

**Expected Results:**

- All 3 decisions should appear
- Each should have confidence badge (75-95%)
- Content should include decision markers ("We agreed:", "Final decision:", etc.)
- Sorted by confidence

### Scenario 3: Pin Functionality

**Steps:**

1. In Actions tab, tap the pin icon on any action
2. Verify the item moves to the top
3. Close Casper panel
4. Reopen Casper panel
5. Check Actions tab again

**Expected Results:**

- Pinned item stays at top
- Pin persists across app restarts
- Pin icon is filled (not outline)

### Scenario 4: Mark Done

**Steps:**

1. In Actions tab, tap checkbox on an action item
2. Observe the visual change
3. Tap the "Show Done" toggle at the top
4. Verify behavior

**Expected Results:**

- Item gets strikethrough text
- Checkbox shows checkmark
- Toggle "Show Done" → item disappears
- Toggle "Hide Done" → item reappears

### Scenario 5: Pull to Refresh

**Steps:**

1. Send a new message with action/decision
2. In Casper, pull down the Actions tab
3. Wait for refresh to complete

**Expected Results:**

- Spinner shows during refresh
- New action/decision appears after refresh
- No duplicates

### Scenario 6: Empty State

**Steps:**

1. Create a brand new conversation
2. Send only casual messages: "Hi there!", "How are you?"
3. Open Casper → Actions tab

**Expected Results:**

- Shows placeholder icon and text
- "No action items yet" message
- No crash or error

### Scenario 7: Cache Performance

**Steps:**

1. Open Actions tab in a conversation with 100+ messages
2. Note the load time (should be < 2s first time)
3. Close and reopen Casper
4. Open Actions tab again

**Expected Results:**

- Second load is instant (< 100ms)
- Data persists from cache
- No loading spinner on second load

### Scenario 8: Confidence Filtering

**Steps:**

1. Send messages with weak action cues:
   ```
   "Maybe we should think about updating the docs?"
   "I'm not sure, but perhaps we could try this?"
   ```
2. Check Actions tab

**Expected Results:**

- These should NOT appear (confidence too low)
- Only clear, confident actions show up

## Edge Cases to Check

### Long Messages

Send: "I will create a comprehensive documentation system that includes API references, user guides, troubleshooting steps, and best practices for all team members to follow consistently across all projects going forward"

**Expected:** Title truncates to ~200 chars with "..."

### Assignee Detection

Send: "Can @john review the code?"

**Expected:** Shows "@john" in assignee field

### Time Detection

Send: "Deploy by next Monday"

**Expected:** Shows "next Monday" in due date field

### Special Characters

Send: "I'll fix the bug (issue #123) ASAP!"

**Expected:** Handles gracefully, no crash

## Visual Checks

### Actions Tab Layout

- [ ] Checkbox aligned to left
- [ ] Text content fills middle space
- [ ] Pin button aligned to right
- [ ] Meta info (due, assignee, confidence) on second line
- [ ] Proper spacing between cards

### Decisions Tab Layout

- [ ] Lightbulb icon visible
- [ ] Timestamp and confidence badge aligned
- [ ] Decision content readable
- [ ] Pin button accessible
- [ ] Proper contrast/colors

## Performance Checks

- [ ] No jank when scrolling list of 20+ items
- [ ] Pin/Done toggles respond immediately
- [ ] No memory leaks after opening/closing Casper 10x times
- [ ] Smooth animations

## Accessibility Checks (Future)

- [ ] Screen reader announces pin state
- [ ] Checkbox accessible via keyboard/screen reader
- [ ] Sufficient color contrast (4.5:1 minimum)

## Known Issues to Ignore

1. **Cross-message context:** "I'll do that" without prior context won't be extracted
2. **Non-English:** Patterns only work for English
3. **LLM refinement:** Not testable unless Firebase Functions deployed

## Reporting Issues

If you find bugs, note:

1. Steps to reproduce
2. Expected vs actual behavior
3. Device/OS version
4. Console logs if applicable

---

**Testing Time:** ~15 minutes for full coverage
