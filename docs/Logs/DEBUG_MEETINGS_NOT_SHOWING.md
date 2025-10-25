# Debugging: Meetings Not Showing for All Users

**Date:** October 24, 2025  
**Issue:** Meetings not appearing for all participants  
**Status:** 🔍 DEBUGGING

---

## Steps to Debug

### Step 1: Test Meeting Creation

1. **Create a test meeting:**

   ```
   User A: "Schedule a meeting with everyone for tomorrow at 2pm"
   ```

2. **Check Firebase Logs immediately:**

   - Go to: https://console.firebase.google.com/project/whisper-app-aa915/functions/logs
   - Look for logs from `casperCreateMeeting`
   - You should see:
     ```
     Creating meeting for participants
     {
       "eventId": "meeting_...",
       "createdBy": "userA_id",
       "receivedParticipantIds": ["userB_id", "userC_id", "userD_id"],
       "allParticipants": ["userB_id", "userC_id", "userD_id", "userA_id"],
       "totalCount": 4,
       "conversationId": "conv_xyz"
     }
     ```

3. **Check individual user logs:**

   - Should see one log per user:
     ```
     Creating event for user: userB_id
     Creating event for user: userC_id
     Creating event for user: userD_id
     Creating event for user: userA_id
     ```

4. **Check success log:**
   ```
   Meeting created successfully
   {
     "eventId": "meeting_...",
     "createdBy": "userA_id",
     "participants": 4,
     "conversationId": "conv_xyz",
     "allParticipants": ["userB_id", "userC_id", "userD_id", "userA_id"]
   }
   ```

### Step 2: Verify Firestore Data

1. **Go to Firestore Console:**
   https://console.firebase.google.com/project/whisper-app-aa915/firestore/data

2. **Check each user's schedule:**

   - Navigate to: `schedules/{userB_id}/events`
   - You should see the event with matching `eventId`
   - Repeat for userC, userD, userA

3. **Verify event data:**
   ```
   {
     title: "Team Meeting",
     startTime: Timestamp(tomorrow at 2pm),
     duration: 60,
     participants: ["userA_id", "userB_id", "userC_id", "userD_id"],
     createdBy: "userA_id",
     conversationId: "conv_xyz",
     status: "pending" (or "accepted" for organizer),
     createdAt: Timestamp(now)
   }
   ```

### Step 3: Test Real-Time Listener

1. **User B opens Planner tab** (while app is running)

2. **Check browser/app console logs:**

   - Should see: `onSnapshot fired with X documents`
   - Should NOT see: `Error listening to meetings`

3. **If meeting doesn't appear, check:**
   - Is `conversationId` correct?
   - Is `startTime` in the future?
   - Is filtering working correctly?

### Step 4: Check Participant Matching

**Add debug logging to client:**

In `src/agent/planner/schedulingService.ts`, add:

```typescript
// After line 72 (where matchParticipants is called)
console.log("🔍 DEBUG: Matched participants:", {
  specs: parsed.participants,
  matchedUserIds,
  conversationMembers: conversationMembers.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    role: m.role,
  })),
  currentUserId,
});
```

Run the schedule command and check console.

---

## Common Issues

### Issue 1: participantIds is empty

**Logs show:**

```json
{
  "receivedParticipantIds": [],
  "allParticipants": ["userA_id"],
  "totalCount": 1
}
```

**Cause:** Participant matching failed

**Fix:** Check `matchParticipants` function - is it finding users correctly?

### Issue 2: Meeting created but not in Firestore

**Logs show success but Firestore is empty**

**Cause:** Batch commit failed silently

**Fix:** Check for errors in Firebase logs after "Meeting created successfully"

### Issue 3: Meeting in Firestore but not appearing in UI

**Firestore has the meeting but UI doesn't show it**

**Causes:**

- Real-time listener not connected
- Filtering is too strict (wrong conversationId, startTime in past)
- User not authenticated

**Fix:**

- Check browser console for listener errors
- Verify `state.context.cid` matches meeting's `conversationId`
- Check if `startTime` is in the future

### Issue 4: Only organizer sees meeting

**User A sees it, but User B/C/D don't**

**Causes:**

- Cloud Function only created for one user
- Real-time listener not set up for other users
- Other users haven't opened Planner tab

**Fix:**

- Check Firestore: does `/schedules/{userB_id}/events/{eventId}` exist?
- Have User B open Planner tab (listener activates on mount)
- Check Firebase logs for "Creating event for user" entries

---

## Quick Test Script

```javascript
// Run in browser console (User A's device)

// 1. Check current user
console.log("Current user:", firebaseAuth.currentUser?.uid);

// 2. Check conversation
console.log("Current conversation:", state.context.cid);

// 3. Check conversation members
const membersRef = collection(
  firebaseFirestore,
  `conversations/${state.context.cid}/members`
);
getDocs(membersRef).then((snap) => {
  console.log(
    "Members:",
    snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  );
});

// 4. Check meetings
const meetingsRef = collection(
  firebaseFirestore,
  `schedules/${firebaseAuth.currentUser?.uid}/events`
);
getDocs(meetingsRef).then((snap) => {
  console.log(
    "My meetings:",
    snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  );
});

// 5. Check if listener is active
console.log("Listener active:", !!window.meetingsUnsubscribe);
```

---

## Expected Flow (Correct Behavior)

### Client Side (User A):

1. User types: "Schedule with everyone for tomorrow at 2pm"
2. `parseScheduleCommand` extracts: `participants: [{ type: "everyone" }]`
3. `matchParticipants` finds: `["userB_id", "userC_id", "userD_id"]` (excludes userA)
4. `createMeetingEvent` calls Cloud Function with:
   ```json
   {
     "conversationId": "conv_xyz",
     "participantIds": ["userB_id", "userC_id", "userD_id"],
     "title": "Team Meeting",
     "startTime": "2025-10-25T14:00:00Z",
     "duration": 60
   }
   ```

### Server Side (Cloud Function):

5. Receives request from userA
6. Adds userA to participants: `["userB_id", "userC_id", "userD_id", "userA_id"]`
7. Creates batch write for ALL 4 users
8. Commits batch:
   - `/schedules/userA_id/events/meeting_123`
   - `/schedules/userB_id/events/meeting_123`
   - `/schedules/userC_id/events/meeting_123`
   - `/schedules/userD_id/events/meeting_123`
9. Returns success

### Client Side (All Users):

10. **User A:** Real-time listener fires → meeting appears instantly
11. **User B (online):** Real-time listener fires → meeting appears instantly
12. **User C (offline):** Meeting stored in Firestore, will appear when they open Planner
13. **User D (online, Planner closed):** Opens Planner → listener activates → meeting appears

---

## Verification Checklist

After creating a meeting, verify:

- [ ] Firebase logs show "Creating meeting for participants" with correct count
- [ ] Firebase logs show "Creating event for user" for EACH participant
- [ ] Firebase logs show "Meeting created successfully"
- [ ] Firestore has event in `/schedules/{userA}/events/{eventId}`
- [ ] Firestore has event in `/schedules/{userB}/events/{eventId}`
- [ ] Firestore has event in `/schedules/{userC}/events/{eventId}`
- [ ] User A sees meeting in Planner immediately
- [ ] User B sees meeting in Planner (if tab is open)
- [ ] User C sees meeting when they open Planner

---

## Next Steps

1. **Create a test meeting** with "everyone"
2. **Check Firebase Logs** - verify function runs correctly
3. **Check Firestore** - verify events created for all users
4. **Check UI** - verify meetings appear in Planner tabs
5. **Report findings** - which step is failing?

---

**Firebase Console Links:**

- Logs: https://console.firebase.google.com/project/whisper-app-aa915/functions/logs
- Firestore: https://console.firebase.google.com/project/whisper-app-aa915/firestore/data

