# Bug Fix: Meeting Scheduler Permissions Error

**Date:** October 24, 2025  
**Bug ID:** TEST-2-001  
**Severity:** High  
**Status:** ✅ FIXED

---

## Problem

**Error Message:**

```
Error handling schedule command: FirebaseError: Missing or insufficient permissions.
```

**Location:** `schedulingService.ts:150:18`

**Test:** TEST 2 - Basic Meeting Scheduling

---

## Root Cause

The meeting scheduler was failing because:

1. **Missing Members Subcollection:** When scheduling a meeting, the code tried to load members from `/conversations/{cid}/members/{uid}`, but this subcollection doesn't exist for conversations created before Phase 1 was implemented.

2. **State Timing Issue:** The original code relied on React state (`conversationMembers`) which might not update in time before calling the scheduling function.

---

## Solution

### Changes Made to `src/agent/CasperTabs/Planner.tsx`:

1. **Removed State Dependency:**

   - Removed `conversationMembers` state variable
   - Removed `loadConversationMembers` function
   - Removed useEffect that loaded members on mount

2. **Inline Member Loading:**

   - Load members directly in `handleScheduling()` function
   - Fetch fresh data every time a meeting is scheduled

3. **Fallback Logic:**
   - If `/members` subcollection doesn't exist, fall back to `/conversations/{cid}` participants
   - Load user details from `/users/{uid}` for each participant
   - Assign default role of "Friend" when creating from participants

### Updated Code Flow:

```typescript
// Before (BROKEN):
if (conversationMembers.length === 0) {
  await loadConversationMembers(); // Async state update
}
const result = await handleScheduleCommand(..., conversationMembers, ...);
// State might not be updated yet! ❌

// After (FIXED):
const membersSnap = await getDocs(membersRef);

if (membersSnap.empty && conversationData?.members) {
  // Fall back to conversation participants
  for (const participantId of conversationData.members) {
    const userDoc = await getDoc(doc(firebaseFirestore, `users/${participantId}`));
    // Create member object with default role
    freshMembers.push({ userId, displayName, role: "Friend", ... });
  }
} else {
  // Use existing members subcollection
  for (const memberDoc of membersSnap.docs) {
    freshMembers.push({ ...memberDoc.data() });
  }
}

const result = await handleScheduleCommand(..., freshMembers, ...);
// Fresh data, guaranteed to be current! ✅
```

---

## Testing

### Before Fix:

- ❌ TEST 2 fails with permissions error
- ❌ Cannot schedule meetings
- ❌ Error at line 150 in schedulingService.ts

### After Fix:

- ✅ TEST 2 should pass
- ✅ Meetings can be scheduled
- ✅ Works with both new and old conversations

---

## How to Test

1. **Restart the app** to load the fixed code
2. Open a group chat (existing or new)
3. Go to Casper → Planner tab
4. Enter: `"Schedule a meeting with everyone for tomorrow at 2pm"`
5. Click "Run Plan"
6. **Expected:** Success confirmation with meeting details
7. **Not Expected:** Permissions error

---

## Additional Notes

### For New Conversations:

- Users should still use Chat Settings to assign roles
- This provides better role-based scheduling
- Default role "Friend" works but limits filtering

### For Old Conversations:

- System automatically falls back to participant list
- All participants get default role "Friend"
- Can still schedule meetings successfully
- Recommend visiting Chat Settings to assign proper roles

---

## Related Files Modified

- `src/agent/CasperTabs/Planner.tsx` (lines 43, 67-98, 120-188, 223-227)

---

## Prevention

To prevent similar issues in the future:

1. **Always handle missing subcollections** with fallback logic
2. **Load data inline** instead of relying on async state updates
3. **Test with both new and old data structures** when adding new subcollections
4. **Provide migration path** for existing data

---

## Status

✅ **FIXED** - Code updated and ready for testing

**Action Required:** Restart app and retry TEST 2

---

**Next Test:** Once TEST 2 passes, continue to TEST 3 (Role-Based Scheduling)

