# Bug Fix #2: Firestore Permissions for Multi-User Events

**Date:** October 24, 2025  
**Bug ID:** TEST-2-002  
**Severity:** Critical  
**Status:** ✅ FIXED

---

## Problem

**Error Message:**
```
Error creating meeting event: [FirebaseError: Missing or insufficient permissions.]
Error handling schedule command: [FirebaseError: Missing or insufficient permissions.]
```

**Location:** `scheduleService.ts:59` (setDoc call)

---

## Root Cause

The original implementation tried to create meeting events for ALL participants by writing to each user's schedule:

```typescript
// BROKEN CODE:
for (const userId of allParticipants) {
  const eventRef = doc(firebaseFirestore, `schedules/${userId}/events/${eventId}`);
  await setDoc(eventRef, eventData); // ❌ FAILS - can't write to other users' schedules!
}
```

**Firestore Security Rule:**
```javascript
match /schedules/{userId}/events/{eventId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
  // ↑ You can ONLY write to YOUR OWN schedule, not others!
}
```

**The Conflict:**
- User A tries to schedule a meeting with User B and User C
- Code attempts to write to:
  - `/schedules/userA/events/meeting_123` ✅ Allowed (your own)
  - `/schedules/userB/events/meeting_123` ❌ DENIED (not your schedule!)
  - `/schedules/userC/events/meeting_123` ❌ DENIED (not your schedule!)

---

## Solution: MVP Approach

For the MVP, we implement a **single-user calendar** approach:

1. ✅ Meeting is created ONLY for the current user (organizer)
2. ✅ Meeting stores all participant IDs for reference
3. ✅ User can see their scheduled meetings in Actions tab
4. 📅 Future: Cloud Function will create events for all participants

### Updated Code:

```typescript
// FIXED CODE:
export async function createMeetingEvent(
  createdBy: string,
  conversationId: string,
  participantIds: string[],
  title: string,
  startTime: Date,
  duration: number
): Promise<{ eventId: string; participantIds: string[] }> {
  const eventId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const allParticipants = [...participantIds, createdBy];

  // Create event ONLY for the current user (createdBy)
  const eventRef = doc(
    firebaseFirestore,
    `schedules/${createdBy}/events/${eventId}`
  );

  const eventData = {
    title,
    startTime: Timestamp.fromDate(startTime),
    duration,
    participants: allParticipants, // Stored for reference
    createdBy,
    conversationId,
    createdAt: serverTimestamp(),
  };

  await setDoc(eventRef, eventData); // ✅ Only writes to YOUR schedule

  return { eventId, participantIds: allParticipants };
}
```

---

## Changes Made

### File: `src/agent/planner/scheduleService.ts`

**Line 40-59:**
- ❌ Removed: `for (const userId of allParticipants)` loop
- ✅ Added: Single write to `schedules/${createdBy}/events/${eventId}`
- ✅ Added: Comment explaining single-user approach

**Line 127-135:**
- ✅ Updated success message to clarify behavior
- ✅ Added note: "Meeting is saved to your calendar"
- ✅ Added: "Participant notifications coming soon!"

---

## Current Behavior (MVP)

### ✅ What Works:
- Meeting is created for the organizer (you)
- Meeting appears in YOUR Actions tab
- Participant list is saved with the meeting
- Date, time, duration all stored correctly
- No permission errors

### ⏳ What Doesn't Work Yet:
- Other participants DON'T see the meeting in their Actions tab
- No notifications sent to participants
- Participants can't accept/decline (UI only)

---

## Testing

### Test Steps:
1. **Restart the app** (important!)
2. Open a group chat
3. Casper → Planner tab
4. Enter: `"Schedule a meeting with everyone for tomorrow at 2pm"`
5. Click "Run Plan"

### Expected Result:
```
✅ Meeting scheduled and added to your calendar!

"Team Meeting"
Thursday, October 31, 2025 at 2:00 PM
Duration: 60 minutes

Participants:
- Alice
- Bob  
- You

💡 Note: Meeting is saved to your calendar. 
Participant notifications coming soon!
```

### Verify in Actions Tab:
1. Switch to Actions tab
2. Pull to refresh
3. ✅ Should see the meeting listed
4. ✅ Shows correct participants
5. ✅ Shows correct date/time

### Multi-User Test (Current Limitation):
1. User A schedules meeting with User B
2. ✅ User A sees meeting in Actions
3. ❌ User B does NOT see meeting (expected for MVP)
4. 📅 Future enhancement will fix this

---

## Future Enhancements

### Phase 5: Cloud Function for Multi-User Events

```typescript
// Future: Cloud Function (server-side)
exports.createMeetingForParticipants = functions.firestore
  .document('schedules/{userId}/events/{eventId}')
  .onCreate(async (snap, context) => {
    const meeting = snap.data();
    
    // Create event for each participant
    for (const participantId of meeting.participants) {
      if (participantId !== meeting.createdBy) {
        await admin.firestore()
          .doc(`schedules/${participantId}/events/${context.params.eventId}`)
          .set({
            ...meeting,
            status: 'pending', // Needs acceptance
          });
        
        // Send push notification
        await sendNotification(participantId, {
          title: 'New Meeting Invitation',
          body: `${meeting.title} on ${meeting.startTime}`,
        });
      }
    }
  });
```

---

## Workarounds for Testing

### Testing Multi-User Scenarios:

**Option 1: Manual Entry**
- Each user manually creates the same meeting
- Not ideal but works for testing

**Option 2: Share Meeting Link** (Future)
- Generate shareable link
- Others click to add to their calendar

**Option 3: Wait for Phase 5**
- Cloud Function will handle this automatically

---

## Documentation Updates

### Updated Testing Guide:

**TEST 5: Multi-User Verification**
- ⚠️ **KNOWN LIMITATION**: Only organizer sees meeting
- ✅ Test that YOU see the meeting
- ⏸️ Skip testing if others see it (not implemented yet)
- 📅 Coming in Phase 5

---

## Security Considerations

### Why We Can't Just "Fix the Rules"

**Bad Idea #1:** Allow anyone to write to any schedule
```javascript
// DON'T DO THIS:
match /schedules/{userId}/events/{eventId} {
  allow write: if isAuthenticated(); // ❌ DANGEROUS!
}
// Problem: User A could spam User B's calendar with fake meetings!
```

**Bad Idea #2:** Allow writing if you're a participant
```javascript
// DON'T DO THIS:
match /schedules/{userId}/events/{eventId} {
  allow write: if request.auth.uid in request.resource.data.participants; // ❌ BYPASSABLE!
}
// Problem: User A could claim to be in the meeting and write to User B's calendar!
```

**✅ Correct Approach:** Use Cloud Functions
- Server-side code runs with admin privileges
- Can validate meeting legitimacy
- Can write to all participants' calendars safely
- Can send notifications

---

## Status

✅ **FIXED FOR MVP**

**What's Working:**
- Single-user meeting creation
- No permission errors
- Meeting appears in your calendar

**What's Pending:**
- Multi-user event distribution (Phase 5)
- Push notifications (Phase 5)
- Accept/Decline functionality (Phase 5)

---

## Action Required

1. ✅ **Restart the app**
2. ✅ **Retry TEST 2** - Should work now!
3. ✅ **Continue to TEST 3** - Role-based scheduling
4. ⏸️ **Skip TEST 5** - Multi-user verification (not implemented)

---

**Next Test:** TEST 3 (Role-Based Scheduling)


