# PR 2 — Data Adapters Testing Guide

**Branch:** `feature/pr2-casper-data-adapters`  
**Testing Date:** October 23, 2025

---

## Testing Environment

- **Platform:** Expo Go on iOS/Android
- **Firebase:** Connected to existing project
- **Data State:** Empty Firestore collections (expected)

---

## Pre-Testing Setup

### 1. Ensure Firebase Connection

```bash
# Verify environment is configured
npm run check-env

# Start the app
npx expo start
```

### 2. Expected Behavior

Since PR 2 only implements the **read-only data layer**, all tabs will show **empty states**. This is correct and expected behavior. We're testing:

- Data hooks initialization
- Loading states
- Error handling
- Cache behavior
- UI/UX of empty states

---

## Test Cases

### Test 1: Casper Panel Opening

#### From Conversations Screen

1. Open the app and sign in
2. Navigate to Conversations screen
3. Tap the floating ghost button (bottom-right)
4. **Expected:**
   - Panel slides up smoothly
   - Default tab is "Digest"
   - Skeleton loading briefly appears
   - "No digest yet" empty state appears with icon and message

#### From Chat Screen

1. Open any conversation
2. Tap the floating ghost button
3. **Expected:**
   - Panel slides up smoothly
   - Default tab is "Summary"
   - Skeleton loading briefly appears
   - "No summaries yet" empty state appears

### Test 2: Summary Tab

#### Basic Functionality

1. Open Casper from a conversation
2. Navigate to Summary tab (if not default)
3. **Expected:**
   - Tab is highlighted with purple background
   - Skeleton cards appear briefly (3 cards)
   - Empty state appears:
     - Document icon
     - "No summaries yet" title
     - Helpful message about PR 3+

#### Pull-to-Refresh

1. Pull down on the Summary tab content
2. **Expected:**
   - Refresh spinner appears
   - Spinner completes
   - Empty state remains (no data exists yet)

#### Conversation Switching

1. Close Casper panel
2. Open a different conversation
3. Open Casper panel
4. **Expected:**
   - Summary tab refetches for new conversation
   - Skeleton loading appears
   - Empty state appears

### Test 3: Actions Tab

#### Basic Functionality

1. Open Casper from anywhere
2. Navigate to Actions tab
3. **Expected:**
   - Tab switches smoothly
   - Skeleton items appear briefly (5 items)
   - Empty state appears:
     - Clipboard icon
     - "No action items yet" title
     - Helpful message about PR 3+

#### From Conversations List

1. Open Casper from Conversations screen (no cid)
2. Check Actions tab
3. **Expected:**
   - Message mentions "all conversations"

#### From Chat Screen

1. Open Casper from a conversation (with cid)
2. Check Actions tab
3. **Expected:**
   - Message mentions "this conversation"

#### Pull-to-Refresh

1. Pull down on Actions tab
2. **Expected:**
   - Refresh spinner appears
   - Spinner completes
   - Empty state remains

### Test 4: Decisions Tab

#### Basic Functionality

1. Open Casper from a conversation
2. Navigate to Decisions tab
3. **Expected:**
   - Skeleton cards appear briefly (3 cards)
   - Empty state appears:
     - Lightbulb icon
     - "No decisions yet" title
     - Helpful message about PR 3+

#### No Conversation Selected

1. Open Casper from Conversations screen
2. Navigate to Decisions tab
3. **Expected:**
   - Different empty state:
     - Gavel icon
     - "Pick a conversation"
     - "Open a conversation to see decisions"

### Test 5: Digest Tab

#### Basic Functionality

1. Open Casper from Conversations screen
2. Verify Digest tab is default
3. **Expected:**
   - Digest skeleton appears briefly
   - Empty state appears:
     - Newspaper icon
     - "No digest yet" title
     - Helpful message about PR 3+

#### Pull-to-Refresh

1. Pull down on Digest tab
2. **Expected:**
   - Refresh spinner works
   - Empty state remains

### Test 6: Ask Tab

#### Basic Functionality

1. Open Casper from a conversation
2. Navigate to Ask tab
3. **Expected:**
   - Input box at bottom
   - Robot icon placeholder
   - "Ask Casper anything" message
   - Rate limit counter shows "10/10 per minute"

#### Rate Limit Display

1. Type a question and send (10 times)
2. **Expected:**
   - Counter decreases: "9/10", "8/10", etc.
   - Warning appears at 3 remaining
   - At 0, error shows "Rate limit reached"

#### No Conversation Selected

1. Open Casper from Conversations screen
2. Navigate to Ask tab
3. **Expected:**
   - Message icon
   - "Pick a conversation"
   - "Open a conversation to ask questions about its content"
   - No input box visible

### Test 7: Offline Behavior

#### Simulate Offline

1. Open all tabs with empty states
2. Close app completely
3. Enable Airplane Mode
4. Reopen app
5. Open Casper and check all tabs
6. **Expected:**
   - Tabs open instantly
   - Empty states display (from cache or default)
   - No network errors shown (empty state is valid)

#### Pull-to-Refresh Offline

1. With network disabled
2. Try pull-to-refresh on any tab
3. **Expected:**
   - Error state appears:
     - Alert icon
     - "Error Loading [Tab]" title
     - Network error message
     - Retry button

### Test 8: Tab Persistence

#### Tab Memory

1. Open Casper and select Actions tab
2. Close Casper
3. Reopen Casper
4. **Expected:**
   - Actions tab is still active (persisted to AsyncStorage)

#### Cross-Session Persistence

1. Select Summary tab
2. Close app completely
3. Reopen app
4. Open Casper
5. **Expected:**
   - Summary tab is active (persisted across sessions)

### Test 9: Error Simulation

#### Firestore Connection Error

1. Disable network mid-session
2. Open Casper fresh (clear cache)
3. **Expected:**
   - Loading state appears
   - Error state appears with retry button
   - Retry button attempts reconnection

### Test 10: Performance

#### Fast Navigation

1. Rapidly switch between all tabs (10 times)
2. **Expected:**
   - Smooth transitions
   - No lag or freezing
   - No memory leaks (check via dev tools)

#### Shimmer Animation

1. Watch skeleton loaders
2. **Expected:**
   - Smooth fade in/out animation (1s cycle)
   - No flickering
   - Animates continuously during load

---

## Regression Tests

### Existing Functionality

Verify these still work:

- [ ] Conversations list loads correctly
- [ ] Chat screen messages load correctly
- [ ] User authentication works
- [ ] Profile screen accessible
- [ ] New chat creation works

---

## Known Issues (Expected)

1. **All empty states** - This is correct! No data exists yet.
2. **"Coming in PR 3+" messages** - Intentional placeholder text.
3. **Ask tab shows error on send** - Expected; just confirms input was received.

---

## Success Criteria

✅ All tests pass if:

- [ ] All tabs open without crashes
- [ ] Skeleton loaders appear and disappear
- [ ] Empty states display correct icons and messages
- [ ] Pull-to-refresh works on all tabs
- [ ] Offline behavior is graceful
- [ ] Tab persistence works
- [ ] No console errors (warnings OK)
- [ ] Smooth animations throughout

---

## If Issues Found

### Common Issues and Fixes

#### Issue: "useCasper must be used within CasperProvider"

**Fix:** Ensure `CasperProvider` wraps the navigation in `App.tsx`

#### Issue: "Error loading [X]" appears immediately

**Cause:** Firestore collections don't exist yet (expected)  
**Fix:** This is correct behavior - empty state should appear after error

#### Issue: Skeleton doesn't animate

**Check:** React Native animations enabled (may not work in web)  
**Fix:** Test on actual device or emulator

#### Issue: Cache not persisting

**Check:** AsyncStorage permissions  
**Fix:** Clear app data and reinstall

---

## Reporting Results

After testing, document:

1. Device/emulator used
2. Any crashes or errors
3. Any unexpected behavior
4. Screenshots of all tabs

---

## Next Phase

Once PR 2 tests pass:

- ✅ Ready to merge to main
- ✅ Ready to start PR 3 (Memory/RAG Layer)
- ✅ Can begin implementing actual data generation
