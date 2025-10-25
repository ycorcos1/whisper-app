# Participant Count Debug - Added Logging

**Date:** October 24, 2025  
**Status:** 🔍 DEBUGGING

---

## Issue

**Problem:** Participant count isn't accurately being displayed in meeting cards

**Symptoms:**

- Meeting shows "2 participant(s)" but should show "3 participant(s)"
- Inconsistent counts across different users' views
- Count doesn't match actual number of people in the meeting

---

## Debugging Steps Added

### ✅ 1. Client-Side Debug (Planner.tsx)

**Added debug display in meeting cards:**

```typescript
<Text style={[styles.meetingDetailText, { fontSize: 10, opacity: 0.7 }]}>
  DEBUG: {JSON.stringify(meeting.participants)}
</Text>
```

**What this shows:**

- The actual `participants` array stored in Firestore
- Array length vs displayed count
- User IDs of all participants

---

### ✅ 2. Server-Side Debug (Cloud Function)

**Added debug logging in `casperCreateMeeting`:**

```typescript
functions.logger.info(`Storing meeting data for ${userId}`, {
  eventId,
  userId,
  participants: allParticipants,
  participantCount: allParticipants.length,
  createdBy,
});
```

**What this shows:**

- What participant data is being sent from client
- What's being stored in Firestore for each user
- Whether deduplication is working correctly

---

### ✅ 3. Fresh Member Data Debug (Already Added)

**In `handleScheduling`:**

```typescript
console.log("🔍 DEBUG: Fresh member data loaded", {
  conversationId: state.context.cid,
  membersCount: freshMembers.length,
  members: freshMembers.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    role: m.role,
    email: m.email,
  })),
});
```

**What this shows:**

- How many conversation members are loaded
- Their display names and roles
- Whether fresh user data is being fetched

---

## How to Debug

### Step 1: Create a Test Meeting

**Command:**

```
"schedule a meeting with everyone for tomorrow at 2pm"
```

### Step 2: Check Client Logs

**Look for:**

```
🔍 DEBUG: Fresh member data loaded
🔍 DEBUG: Participant matching
📅 DEBUG: Creating meeting
```

**Expected:**

- `membersCount: 3` (for 3-person group)
- `matchedCount: 3` (all members matched)
- `participantIds: ["user1", "user2", "user3"]`

### Step 3: Check Server Logs

**In Firebase Console → Functions → Logs:**

```
Creating meeting for participants
Storing meeting data for user1
Storing meeting data for user2
Storing meeting data for user3
```

**Expected:**

- `participantCount: 3` for each user
- `participants: ["user1", "user2", "user3"]` for each user

### Step 4: Check UI Display

**In meeting card:**

```
👥 3 participant(s)
DEBUG: ["user1","user2","user3"]
```

**Expected:**

- Count matches array length
- Array contains all expected user IDs

---

## Possible Root Causes

### 1. Client-Side Matching Issue

**Problem:** `matchParticipants` not including all users
**Check:** Client debug logs show `matchedCount: 2` instead of `3`

### 2. Server-Side Deduplication Issue

**Problem:** Cloud Function not properly handling duplicates
**Check:** Server logs show different participant counts per user

### 3. Firestore Data Inconsistency

**Problem:** Different users have different participant arrays
**Check:** UI debug shows different arrays for same meeting

### 4. UI Display Issue

**Problem:** Display logic is wrong
**Check:** UI debug shows correct array but wrong count

---

## Files Modified

### ✅ src/agent/CasperTabs/Planner.tsx

- Added debug display in meeting cards
- Shows actual `participants` array

### ✅ functions/src/rag/meetings.ts

- Added debug logging in `casperCreateMeeting`
- Shows what's being stored for each user
- Deployed to Firebase

---

## Next Steps

1. **Test with debug enabled**

   - Create a meeting with "everyone"
   - Check all logs (client + server)
   - Check UI debug display

2. **Identify the issue**

   - Client matching wrong?
   - Server storage wrong?
   - UI display wrong?

3. **Fix the root cause**
   - Once we see the logs, we'll know exactly what's wrong

---

**Status:** 🔍 Ready to debug!

**Test it now:**

1. Create a meeting: `"schedule a meeting with everyone for tomorrow"`
2. Check console logs and UI debug display
3. Share the results to identify the issue!

