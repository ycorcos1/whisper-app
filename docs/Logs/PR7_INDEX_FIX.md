# Firestore Index Fix for PR #7

## Issue

When opening the Planner tab, you got this error:

```
FirebaseError: 9 FAILED_PRECONDITION: The query requires an index.
```

## Root Cause

The `listPlans` function queries Firestore with:

- `.where("conversationId", "==", conversationId)`
- `.orderBy("createdAt", "desc")`

When combining `.where()` with `.orderBy()` on different fields, Firestore requires a composite index.

## Fix Applied

### 1. Added Firestore Index

Added to `firestore.indexes.json`:

```json
{
  "collectionGroup": "plans",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "conversationId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### 2. Deployed Index

```bash
firebase deploy --only firestore:indexes
```

✅ Index deployed successfully

### 3. Temporary Workaround

Modified `Planner.tsx` to temporarily NOT filter by `conversationId` until the index finishes building (5-10 minutes):

```typescript
const result = await listPlans({
  limit: 20,
  // conversationId: state.context.cid, // Uncomment after index is built
});
```

## Timeline

- **Immediate**: App should work now (without conversation filtering)
- **5-10 minutes**: Index will be fully built by Firestore
- **After index is built**: Uncomment the `conversationId` line to enable conversation filtering

## How to Re-enable Conversation Filtering

Once the index is built (wait ~10 minutes), update `src/agent/CasperTabs/Planner.tsx` line 45:

```typescript
// Change from:
// conversationId: state.context.cid, // Uncomment after index is built

// To:
conversationId: state.context.cid,
```

Then reload your app.

## Testing Now

The Planner tab should work immediately! Try:

1. **Reload app** (shake → Reload)
2. Open Casper → **Planner tab**
3. Enter: `"Plan team offsite next month"`
4. Tap **"Run Plan"**

You should be able to create plans now! The history will show all your plans (not filtered by conversation) until you re-enable the filter.

## Checking Index Status

Check if the index is ready:
https://console.firebase.google.com/project/whisper-app-aa915/firestore/indexes

Look for the "plans" index with fields: `conversationId` (ASC) + `createdAt` (DESC)

- 🟡 Yellow = Building
- 🟢 Green = Ready

---

**Status**: ✅ Fixed - App should work now  
**Next**: Wait ~10 minutes, then re-enable conversation filtering

