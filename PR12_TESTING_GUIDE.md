# PR #12 Testing Guide - Step-by-Step Manual Verification

This guide provides detailed steps to manually verify the PR #12 implementation of persistence hardening and logout hygiene.

---

## Prerequisites

- Whisper app installed on iOS/Android simulator or device
- Two test accounts ready (User A and User B)
- Ability to toggle device network connectivity
- Console logs visible (optional, for debugging)

---

## Test 1: Queue Survival After App Restart

### Objective

Verify that messages queued while offline are successfully sent after app restart when back online.

### Steps

1. **Setup:**

   - Launch Whisper app
   - Log in as User A
   - Navigate to a conversation (or create a new one)

2. **Go Offline:**

   - Enable Airplane Mode on your device
   - OR turn off WiFi/cellular data
   - Verify no network connectivity

3. **Send Messages While Offline:**

   - In the conversation, type and send: "Message 1"
   - Send: "Message 2"
   - Send: "Message 3"
   - **Expected:** Messages appear in chat with "sending" status

4. **Force Close App:**

   - Close Whisper completely (swipe up on app switcher)
   - Wait 5 seconds

5. **Go Back Online:**

   - Turn off Airplane Mode
   - OR re-enable WiFi/cellular data
   - Verify network connectivity is restored

6. **Restart App:**

   - Open Whisper app again
   - Wait for authentication to complete

7. **Verify Queue Processing:**

   - Wait up to 30 seconds (global queue processor interval)
   - Navigate back to the conversation

8. **Expected Results:**

   - ✅ All 3 messages successfully sent to Firebase
   - ✅ Messages no longer show "sending" status
   - ✅ Messages have timestamps and delivery indicators
   - ✅ No duplicate messages created
   - ✅ Conversation updated with last message

9. **Verify on Other Device:**
   - Log in as User B on a different device
   - Open the same conversation
   - **Expected:** All 3 messages from User A are visible

### Success Criteria

- [x] Messages queued while offline
- [x] Queue survives app restart
- [x] Messages sent automatically when back online
- [x] No message loss or duplication

---

## Test 2: Logout Clears All Caches (Preserves Preferences)

### Objective

Verify that logout clears user data but preserves theme preferences.

### Steps

#### Part A: Setup User Data

1. **Login and Create Data:**

   - Launch Whisper app
   - Log in as User A
   - Create 2-3 conversations

2. **Create Drafts:**

   - Open Conversation 1
   - Type "Draft message 1" in the text input
   - **Do NOT send** - leave it as a draft
   - Go back to Conversations list
   - Open Conversation 2
   - Type "Draft message 2"
   - **Do NOT send**
   - Go back to Conversations list

3. **Scroll in Conversations:**

   - Scroll down in a long conversation (if available)
   - This saves scroll position to AsyncStorage

4. **Set Theme Preferences (if implemented):**

   - Go to Profile screen
   - Enable dark mode or change accent color (if available)
   - Note your theme settings

5. **Queue Some Messages (Optional):**
   - Enable Airplane Mode
   - Send a message while offline
   - This adds to the outbound queue

#### Part B: Perform Logout

6. **Logout:**
   - Navigate to Profile screen
   - Tap "Logout" button
   - Wait for logout to complete
   - **Expected:** Redirected to AuthScreen

#### Part C: Verify Cache Clearing

7. **Log Back In (Same User):**

   - Log in as User A again
   - Wait for app to load

8. **Check Drafts (Should Be Cleared):**

   - Open Conversation 1
   - **Expected:** Text input is empty (no draft)
   - Go back and open Conversation 2
   - **Expected:** Text input is empty (no draft)
   - ✅ Drafts cleared

9. **Check Scroll Positions (Should Be Reset):**

   - Open a conversation you scrolled in earlier
   - **Expected:** Scroll position reset to bottom (latest messages)
   - ✅ Scroll positions cleared

10. **Check Outbound Queue (Should Be Empty):**

    - If you queued messages in step 5, they should be gone
    - Messages won't be sent after re-login
    - ✅ Queue cleared

11. **Check Theme Preferences (Should Be Preserved):**
    - Check if dark mode setting is still enabled
    - Check if accent color is still the same
    - **Expected:** Theme preferences remain unchanged
    - ✅ Preferences preserved

#### Part D: Programmatic Verification (Optional)

12. **Console Check (Developer Tool):**

    ```typescript
    // Add to ProfileScreen.tsx logout function temporarily:
    import AsyncStorage from "@react-native-async-storage/async-storage";

    // After logout, before re-login:
    const drafts = await AsyncStorage.getItem("@whisper:drafts");
    const scrollPos = await AsyncStorage.getItem("@whisper:scroll_positions");
    const queue = await AsyncStorage.getItem("@whisper:outbound_queue");
    const selected = await AsyncStorage.getItem(
      "@whisper:selected_conversation"
    );
    const themePrefs = await AsyncStorage.getItem("@whisper:theme_prefs");

    console.log("Drafts:", drafts); // Should be null
    console.log("Scroll Positions:", scrollPos); // Should be null
    console.log("Queue:", queue); // Should be null
    console.log("Selected:", selected); // Should be null
    console.log("Theme Prefs:", themePrefs); // Should NOT be null
    ```

### Success Criteria

- [x] Drafts cleared on logout
- [x] Scroll positions cleared on logout
- [x] Outbound queue cleared on logout
- [x] Selected conversation cleared on logout
- [x] Theme preferences preserved on logout
- [x] User can log back in successfully

---

## Test 3: Exponential Backoff Retry Logic

### Objective

Verify that failed messages retry with increasing delays.

### Steps

1. **Setup:**

   - Launch Whisper app
   - Log in as User A
   - Navigate to a conversation

2. **Simulate Flaky Network:**

   - Turn off network briefly (2 seconds)
   - Send a message: "Test retry"
   - Turn network back on immediately

3. **Observe Retry Behavior:**

   - Watch the message status in the UI
   - Check console logs for retry attempts

4. **Expected Retry Schedule:**

   - Attempt 1: Immediate
   - Attempt 2: After 1 second
   - Attempt 3: After 2 seconds
   - Attempt 4: After 4 seconds
   - Attempt 5: After 8 seconds
   - Attempt 6: After 16 seconds
   - Attempt 7: After 32 seconds (last attempt)

5. **Test Max Retries:**

   - Keep network off for 2+ minutes
   - Send a message
   - Wait for 6 retry attempts to complete
   - **Expected:** After 6 failed attempts, show "Failed to send"

6. **Test Successful Retry:**
   - Send a message while offline
   - Wait for 2-3 retry attempts to fail
   - Turn network back on
   - **Expected:** Next retry succeeds, message sent

### Success Criteria

- [x] Retry delays follow exponential backoff pattern
- [x] Max delay capped at 32 seconds
- [x] After 6 retries, message marked as failed
- [x] Successful retry when network restored

---

## Test 4: Schema Migrations

### Objective

Verify that schema migrations run correctly on fresh install.

### Steps

1. **Fresh Install:**

   - Uninstall Whisper app completely
   - Reinstall from Expo or build

2. **First Launch:**

   - Launch the app
   - Check console logs

3. **Expected Console Output:**

   ```
   Running migrations from version 0 to 1
   Initializing schema v1
   Migrations complete. Schema version: 1
   ```

4. **Verify Schema Version:**

   - After app loads, check AsyncStorage
   - `@whisper:schema_version` should be "1"

5. **Second Launch:**
   - Close and reopen the app
   - **Expected:** No migration logs (already on v1)
   - Console should NOT show migration messages

### Success Criteria

- [x] Schema version initialized on first run
- [x] Migrations run smoothly without errors
- [x] Subsequent launches skip migrations
- [x] Schema version persists across restarts

---

## Test 5: Global Queue Processor

### Objective

Verify that the global queue processor runs on app startup without navigating to a chat.

### Steps

1. **Setup Queued Messages:**

   - Log in as User A
   - Open a conversation
   - Enable Airplane Mode
   - Send 2 messages while offline
   - Force close the app

2. **Restart Without Opening Chat:**

   - Turn network back on
   - Reopen Whisper app
   - Stay on Conversations screen (don't open the chat)

3. **Wait for Global Processor:**

   - Wait 30 seconds
   - Global processor should run automatically

4. **Verify Processing:**

   - Check console logs for:
     ```
     [Queue Processor] Started global queue processor
     [Queue Processor] Processing 2 queued messages
     [Queue Processor] Successfully sent message temp_xxx
     ```

5. **Check Conversation List:**

   - Without opening the chat, check conversation preview
   - **Expected:** Last message shows the queued message

6. **Verify on Other Device:**
   - Log in as User B
   - Open the conversation
   - **Expected:** Both messages from User A are visible

### Success Criteria

- [x] Global queue processor starts on app launch
- [x] Processes queue without opening chat screen
- [x] Messages successfully sent in background
- [x] Conversation list updates with sent messages

---

## Test 6: Queue Status Debugging

### Objective

Verify the queue status function provides accurate information.

### Steps

1. **Setup:**

   - Add this code to ProfileScreen.tsx temporarily:

   ```typescript
   import { getQueueStatus } from "../features/messages/queueProcessor";

   // In component:
   const checkQueueStatus = async () => {
     const status = await getQueueStatus();
     console.log("Queue Status:", status);
     Alert.alert("Queue Status", JSON.stringify(status, null, 2));
   };

   // Add button in UI:
   <Button title="Check Queue Status" onPress={checkQueueStatus} />;
   ```

2. **Test With Empty Queue:**

   - Tap "Check Queue Status"
   - **Expected:**
     ```json
     {
       "totalMessages": 0,
       "readyToRetry": 0,
       "failedMessages": 0
     }
     ```

3. **Test With Queued Messages:**

   - Enable Airplane Mode
   - Send 3 messages
   - Tap "Check Queue Status"
   - **Expected:**
     ```json
     {
       "totalMessages": 3,
       "readyToRetry": 3,
       "failedMessages": 0
     }
     ```

4. **Test With Failed Messages:**
   - Keep Airplane Mode on
   - Wait for 6 retry attempts to fail
   - Tap "Check Queue Status"
   - **Expected:**
     ```json
     {
       "totalMessages": 3,
       "readyToRetry": 0,
       "failedMessages": 3
     }
     ```

### Success Criteria

- [x] Queue status returns accurate counts
- [x] Distinguishes between ready and failed messages
- [x] Updates in real-time as queue changes

---

## Automated Test Execution

To run the automated test suite:

```bash
npm test src/features/messages/__tests__/persistence.test.ts
```

**Expected Output:**

```
PASS src/features/messages/__tests__/persistence.test.ts
  Persistence - Schema Migrations
    ✓ should initialize schema version on first run (9 ms)
    ✓ should skip migrations if already on current version
    ✓ should run migrations from old version to new version (2 ms)
  Persistence - Outbound Queue
    ✓ should add message to queue
    ✓ should get queue from storage (1 ms)
    ✓ should return empty array if queue is empty
    ✓ should remove message from queue by tempId
    ✓ should update queue item
  Persistence - Retry Logic
    ✓ should calculate exponential backoff delay
    ✓ should retry message on first attempt
    ✓ should not retry message after max retries
    ✓ should not retry message if delay has not elapsed
    ✓ should retry message if delay has elapsed
  Persistence - Drafts
    ✓ should save draft (1 ms)
    ✓ should get draft
    ✓ should clear draft
  Persistence - Scroll Position
    ✓ should save scroll position
    ✓ should get scroll position
  Persistence - Selected Conversation
    ✓ should save selected conversation
    ✓ should get selected conversation
  Persistence - Theme Preferences
    ✓ should save theme preferences
    ✓ should get theme preferences (1 ms)
  Persistence - Logout Hygiene
    ✓ should clear all caches except theme preferences on logout
  Persistence - Queue Survival After Restart
    ✓ should persist queue across app restarts
    ✓ should restore and process queue on app restart

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        0.298 s
```

---

## Troubleshooting

### Issue: Messages not sending after restart

**Possible Causes:**

- Network not actually connected
- Firebase authentication expired
- Global queue processor not started

**Debug Steps:**

1. Check console for `[Queue Processor] Started global queue processor`
2. Verify network connectivity
3. Check Firebase console for user authentication
4. Manually call `processGlobalQueue()` to force processing

### Issue: Drafts not clearing on logout

**Possible Causes:**

- `clearAllCachesExceptPrefs()` not called
- AsyncStorage error

**Debug Steps:**

1. Check console for "Cleared all caches except theme preferences"
2. Add logging to `clearAllCachesExceptPrefs()` function
3. Check AsyncStorage permissions

### Issue: Theme preferences cleared on logout

**Possible Causes:**

- `@whisper:theme_prefs` key included in multiRemove
- Wrong key name

**Debug Steps:**

1. Check `persistence.ts` line 250
2. Verify `KEYS.THEME_PREFS` NOT in multiRemove array
3. Check if theme preferences were saved before logout

---

## Sign-Off Checklist

- [ ] Test 1: Queue survives restart - PASSED
- [ ] Test 2: Logout clears caches except prefs - PASSED
- [ ] Test 3: Exponential backoff works - PASSED
- [ ] Test 4: Schema migrations run - PASSED
- [ ] Test 5: Global queue processor works - PASSED
- [ ] Test 6: Queue status function accurate - PASSED
- [ ] All 25 automated tests pass
- [ ] No console errors during testing
- [ ] Documentation reviewed and accurate

**Tester Name:** ******\_\_\_******  
**Date:** ******\_\_\_******  
**Status:** ✅ APPROVED / ❌ NEEDS WORK

---

**End of PR #12 Testing Guide**
