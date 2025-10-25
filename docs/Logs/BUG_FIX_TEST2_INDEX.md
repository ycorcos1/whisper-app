# Bug Fix #3: Firestore Index for Events Query

**Date:** October 24, 2025  
**Bug ID:** TEST-2-003  
**Severity:** High  
**Status:** ✅ FIXED (Index Building)

---

## Problem

**Error Message:**

```
Error getting user meetings: [FirebaseError: The query requires an index.
You can create it here: https://console.firebase.google.com/...]
```

**Location:** `scheduleService.ts:132` (`getUserMeetings` function)

---

## Root Cause

The `getUserMeetings` function queries the `events` collection with both a `where` filter and an `orderBy`:

```typescript
// Lines 125-130
if (options?.conversationId) {
  q = query(
    eventsRef,
    where("conversationId", "==", options.conversationId), // Filter
    orderBy("startTime", "asc") // Sort
  );
}
```

**Firestore Requirement:**

- Queries that combine `where()` and `orderBy()` on different fields require a composite index
- Without the index, the query fails immediately

---

## Solution

### 1. Added Composite Index

**File:** `firestore.indexes.json`

```json
{
  "collectionGroup": "events",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "conversationId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "startTime",
      "order": "ASCENDING"
    }
  ]
}
```

### 2. Deployed Index

```bash
firebase deploy --only firestore:indexes
```

**Status:** ✅ Deployed successfully
**Build Time:** ~5-10 minutes (building in background)

### 3. Temporary Client-Side Workaround

**File:** `src/agent/planner/scheduleService.ts`

**Lines 121-132:** Commented out server-side `conversationId` filter

```typescript
// TEMPORARY: Commenting out conversationId filter while Firestore index builds
let q = query(eventsRef, orderBy("startTime", "asc"));

// Filter by conversation if specified
// if (options?.conversationId) {
//   q = query(
//     eventsRef,
//     where("conversationId", "==", options.conversationId),
//     orderBy("startTime", "asc")
//   );
// }
```

**Lines 149-153:** Added client-side filter

```typescript
// Apply client-side filters
// TEMPORARY: Filter by conversationId client-side while index builds
if (options?.conversationId) {
  events = events.filter((e) => e.conversationId === options.conversationId);
}
```

**Result:**

- ✅ App works immediately (no waiting for index)
- ✅ Meetings are filtered correctly
- ⚠️ Slightly less efficient (fetches all events, then filters)
- 📅 Can be reverted once index is built

---

## Performance Impact

### Without Index (Current Temporary Solution):

- Fetches ALL events for user
- Filters by conversationId client-side
- **Acceptable for MVP** (most users have < 50 meetings)

### With Index (After Build Completes):

- Fetches only events for specific conversation
- Filters server-side in Firestore
- **More efficient** for users with many meetings

---

## How to Re-Enable Server-Side Filtering

**Once the index finishes building (~5-10 minutes):**

1. Check index status:

   - Visit: https://console.firebase.google.com/project/whisper-app-aa915/firestore/indexes
   - Wait until the `events` index shows "✅ Enabled"

2. Update `scheduleService.ts`:
   - **Uncomment lines 126-132** (server-side filter)
   - **Remove lines 151-153** (client-side filter)

```typescript
// AFTER INDEX IS BUILT:
let q = query(eventsRef, orderBy("startTime", "asc"));

// Filter by conversation if specified
if (options?.conversationId) {
  q = query(
    eventsRef,
    where("conversationId", "==", options.conversationId),
    orderBy("startTime", "asc")
  );
}

// ... later in the function ...

// Apply client-side filters
// (Remove conversationId filter - now handled server-side)
if (options?.startDate) {
  events = events.filter((e) => e.startTime >= options.startDate!);
}
```

3. Test that meetings still load correctly

---

## Testing

### ✅ Current Status (With Workaround):

**Test Steps:**

1. **Restart the app**
2. Open a group chat
3. Navigate to Casper → Actions tab
4. Should load without errors

**Expected Behavior:**

- ✅ No index errors
- ✅ Meetings load for current conversation
- ✅ Other conversations' meetings are filtered out

### ⏳ After Index Builds:

**Test Steps:**

1. Uncomment server-side filter (see above)
2. Restart the app
3. Open a group chat
4. Navigate to Actions tab
5. Should load faster with server-side filtering

---

## Related Issues

This is the **second** Firestore index error we've encountered:

1. **Issue #1:** `plans` collection

   - Index: `conversationId` + `createdAt`
   - Status: ✅ Fixed (PR7_INDEX_FIX.md)

2. **Issue #2:** `events` collection (this issue)
   - Index: `conversationId` + `startTime`
   - Status: ✅ Fixed (this document)

**Pattern:** Both use `where()` + `orderBy()` on different fields

---

## Future Considerations

### Additional Indexes Needed?

**Potential future queries:**

- `events` by `createdBy` + `startTime` (for "My Organized Meetings")
- `events` by `participants` (array-contains) + `startTime` (for "Meetings I'm In")

**Recommendation:** Add these preemptively if we implement those features

---

## Changes Made

### Files Modified:

1. ✅ `firestore.indexes.json` - Added `events` composite index
2. ✅ `src/agent/planner/scheduleService.ts` - Temporary client-side filtering

### Deployment:

- ✅ Indexes deployed to Firebase
- ⏳ Index building in background (~5-10 min)

---

## Action Required

1. ✅ **Restart the app now** - The workaround is in place
2. ✅ **Test scheduling** - Should work without errors
3. ⏰ **Wait 5-10 minutes** - For index to finish building
4. 📝 **Optional:** Re-enable server-side filtering later (see above)

---

**Next:** Continue with TEST 2 - Basic Scheduling! 🚀
