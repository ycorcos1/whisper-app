# PR #6 Debugging Guide

## Actions and Decisions Not Displaying?

I've added debug logging to help identify the issue. Follow these steps:

### Step 1: Check Console Logs

When you open the Actions or Decisions tab, you should see console logs like:

```
[useActionItems] Fetching actions for cid: abc123
[Actions] Extracting actions for conversation: abc123
[Actions] Fetched messages: 25
[Actions] Found actions in message: "I will update the docs..." 1
[Actions] Total extracted: 5
[Actions] After deduplication: 5
[Actions] After filtering (> 0.5): 5
[useActionItems] Extracted actions: 5
```

### Step 2: Check What You See

**If you see "No conversation ID provided":**

- The conversation ID is not being passed correctly
- Make sure you have a conversation open before opening Casper

**If you see "Fetched messages: 0":**

- No messages are being loaded from Firestore
- Check that your conversation has messages
- Check Firebase Auth is working

**If you see "Total extracted: 0":**

- Messages don't match action/decision patterns
- Try sending these test messages:
  - "I will finish this by EOD"
  - "We agreed to use React"

**If you see "After filtering: 0":**

- Extracted items have low confidence scores
- Try more explicit action phrases

### Step 3: Common Issues

#### Issue 1: Empty State Shows "Pick a conversation"

**Solution:** Open a conversation first before opening Casper panel

#### Issue 2: "No action items yet" but you have messages

**Possible causes:**

1. Messages don't contain action patterns
2. Messages are too short (< 5 characters)
3. Confidence too low

**Test with these exact messages:**

```
"I will review the code"
"Can you update the docs?"
"Let's deploy tomorrow"
"TODO: Fix the bug"
```

#### Issue 3: "No decisions yet"

**Possible causes:**

1. Messages don't contain decision patterns
2. Messages are tentative ("maybe", "should we?")

**Test with these exact messages:**

```
"We agreed to use TypeScript"
"Final decision: deploy on Friday"
"Let's go with option A"
"Confirmed: using AWS"
```

### Step 4: Check Firestore Rules

Make sure you can read messages:

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to: `conversations/{cid}/messages`
4. Verify messages exist
5. Check Rules tab for read permissions

### Step 5: Manual Test

Run this in the app (add to a test button):

```typescript
import { extractActions } from "../agent/extract/actions";
import { extractDecisions } from "../agent/extract/decisions";

// Test extraction
const actions = await extractActions("YOUR_CONVERSATION_ID");
console.log("Actions:", actions);

const decisions = await extractDecisions("YOUR_CONVERSATION_ID");
console.log("Decisions:", decisions);
```

### Step 6: Clear Cache

If you're seeing old/cached data:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

// Clear all casper caches
const keys = await AsyncStorage.getAllKeys();
const casperKeys = keys.filter((k) => k.startsWith("casper:"));
await AsyncStorage.multiRemove(casperKeys);
```

### Step 7: Check Network

- Open React Native debugger
- Check Network tab for Firestore requests
- Verify `getDocs` calls are succeeding

### Expected Console Output

For a working conversation with 10 messages containing 3 actions and 2 decisions:

```
[useActionItems] Fetching actions for cid: abc123
[Actions] Extracting actions for conversation: abc123
[Actions] Fetched messages: 10
[Actions] Found actions in message: "I will update the docs by EOD" 1
[Actions] Found actions in message: "Can you review the PR?" 1
[Actions] Found actions in message: "Let's deploy to staging tomorrow" 1
[Actions] Total extracted: 3
[Actions] After deduplication: 3
[Actions] After filtering (> 0.5): 3
[useActionItems] Extracted actions: 3

[useDecisionLog] Fetching decisions for cid: abc123
[Decisions] Extracting decisions for conversation: abc123
[Decisions] Fetched messages: 10
[Decisions] Found decisions in message: "We agreed to use TypeScript for th..." 1
[Decisions] Found decisions in message: "Final decision: deploy on Friday" 1
[Decisions] Total extracted: 2
[Decisions] After deduplication: 2
[Decisions] After filtering (> 0.6): 2
[useDecisionLog] Extracted decisions: 2
```

---

## Quick Fixes

### Fix 1: Restart the App

Sometimes React Native caching causes issues. Fully restart:

```bash
# Kill the app and restart
expo start --clear
```

### Fix 2: Check Feature Flags

Make sure feature flags are loading:

```typescript
// In featureFlags.ts
console.log("Feature flags loaded:", featureFlags);
```

### Fix 3: Test Pattern Matching

Add a button to test pattern detection:

```typescript
const testText = "I will update the docs by EOD";
const actions = extractActionsFromMessage({
  id: "test",
  senderId: "test",
  type: "text",
  text: testText,
  timestamp: new Date(),
  status: "sent",
});
console.log("Test actions:", actions);
```

---

## Still Not Working?

Share your console logs showing:

1. The conversation ID being used
2. Message count fetched
3. Total extracted count
4. After filtering count

This will help identify exactly where the issue is!
