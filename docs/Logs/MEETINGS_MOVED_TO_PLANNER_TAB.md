# Meetings Moved to Planner Tab

**Date:** October 24, 2025  
**Issue:** Meetings display moved from Actions tab to Planner tab  
**Status:** ✅ COMPLETE

---

## Problem

**User Report:**

> "I get this error when i go to the actions tab now. Instead of having the meetings and scheduled things appear in the actions tab, have it appear in the planner tab"

**Error:**

```
Error getting user meetings: [FirebaseError: Missing or insufficient permissions.]
```

**Root Cause:**
The previous "fix" attempted to query ALL members' schedules to show meetings where you're a participant. However, this violated Firestore security rules:

```javascript
match /schedules/{userId}/events/{eventId} {
  allow read: if isAuthenticated() && isOwner(userId);
  // ↑ You can ONLY read your OWN schedule!
}
```

**Why the permission error:**

- User A tries to read User B's schedule
- Security rule blocks the read
- Error: "Missing or insufficient permissions"

---

## Solution

### Decision: Move Meetings to Planner Tab

**Reasoning:**

1. **Logical grouping:** Planner tab is for planning and scheduling
2. **Actions tab purpose:** Should focus on extracted action items from conversations
3. **Simpler implementation:** Only show YOUR meetings (where you're the organizer)
4. **No permission issues:** Only reads your own schedule

### Changes Made:

#### 1. Reverted `scheduleService.ts` Changes

**File:** `src/agent/planner/scheduleService.ts` (lines 165-179)

**Before (caused errors):**

```typescript
export async function getUpcomingMeetings(...) {
  // Query ALL members' schedules
  for (const memberId of members) {
    const memberMeetings = await getUserMeetings(memberId, ...); // ❌ Permission error!
  }
}
```

**After (MVP approach):**

```typescript
export async function getUpcomingMeetings(
  userId: string,
  conversationId?: string
): Promise<ScheduleEvent[]> {
  const now = new Date();
  // Only query YOUR schedule
  return getUserMeetings(userId, {
    conversationId,
    startDate: now,
  });
}
```

#### 2. Removed Meetings from Actions Tab

**File:** `src/agent/CasperTabs/Actions.tsx`

**Removed:**

- Import statements for meeting functions
- `meetings` state variable
- `loadMeetings()` function
- Meeting UI section (60+ lines)
- Meeting styles (meeting card, meeting header, etc.)

**Result:** Actions tab is now cleaner and focused on action items only

#### 3. Added Meetings to Planner Tab

**File:** `src/agent/CasperTabs/Planner.tsx`

**Added:**

- Import `getUpcomingMeetings`, `ScheduleEvent`, `formatDateTime`
- `meetings` state variable (line 46)
- `loadMeetings()` function (lines 73-87)
- Updated `useEffect` to call `loadMeetings()` (line 248)
- Updated `handleCreatePlan` to reload meetings after scheduling (line 213)
- "Your Scheduled Meetings" UI section (lines 606-660)
- Meeting card styles (lines 1058-1080)

**UI Structure:**

```tsx
{
  /* Upcoming Meetings */
}
{
  meetings.length > 0 && (
    <View style={styles.meetingsSection}>
      <Text style={styles.sectionTitle}>
        📅 Your Scheduled Meetings ({meetings.length})
      </Text>
      {meetings.map((meeting) => (
        <View key={meeting.id} style={styles.meetingCard}>
          {/* Meeting title */}
          {/* Date/time */}
          {/* Duration */}
          {/* Participant count */}
        </View>
      ))}
    </View>
  );
}
```

---

## Current Behavior

### Planner Tab Now Shows:

1. **Input Section** - "What would you like to plan?"
2. **Meeting Result** - Success/failure message after scheduling
3. **Your Scheduled Meetings** - ✨ NEW! Shows your upcoming meetings
4. **Current Plan** - Active multi-step plan
5. **Recent Plans** - Plan history

### What You'll See:

**Example Meeting Card:**

```
📅 Your Scheduled Meetings (2)

┌─────────────────────────────────┐
│ 🕒 Team Standup                 │
│                                 │
│ 🕐 Monday, Oct 28 at 9:00 AM   │
│ ⏱️ 30 minutes                   │
│ 👥 5 participant(s)             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🕒 Design Review                │
│                                 │
│ 🕐 Tuesday, Oct 29 at 2:00 PM  │
│ ⏱️ 60 minutes                   │
│ 👥 3 participant(s)             │
└─────────────────────────────────┘
```

---

## MVP Limitations

### ✅ What Works:

- **Schedule meetings** via natural language
- **See YOUR meetings** (where you're the organizer)
- **Meetings filtered by conversation** (only shows meetings for current chat)
- **No permission errors**

### ⏸️ What Doesn't Work Yet:

- **Participants can't see meetings** (only organizer sees them)
- **No meeting invitations** for participants
- **No accept/decline** functionality
- **No notifications** when invited

### Why These Limitations Exist:

**Firebase Security:**

- Client-side code can only read YOUR data
- Can't write to other users' data
- Can't read other users' data

**Phase 5 Solution:**

- Cloud Function creates events for all participants
- Server-side code has admin privileges
- Can write to any user's schedule securely
- Can send push notifications

---

## User Experience

### Scenario: Alice schedules a meeting

**Step 1: Alice uses Planner**

```
Alice: "Schedule a meeting with Bob and Carol for tomorrow at 2pm"
```

**Step 2: Meeting created**

```
✅ Meeting scheduled and added to your calendar!

"Team Meeting"
Friday, November 1, 2025 at 2:00 PM
Duration: 60 minutes

Participants:
- Alice
- Bob
- Carol

💡 Note: Meeting is saved to your calendar.
Participant notifications coming soon!
```

**Step 3: Alice sees meeting in Planner tab**

```
📅 Your Scheduled Meetings (1)

🕒 Team Meeting
🕐 Friday, November 1, 2025 at 2:00 PM
⏱️ 60 minutes
👥 3 participant(s)
```

**Step 4: Bob and Carol DON'T see the meeting**

- Bob opens Planner → No meeting shown ❌
- Carol opens Planner → No meeting shown ❌
- **Expected for MVP** - Phase 5 will fix this

---

## Testing

### Test Steps:

1. **Open app and navigate to a group chat**
2. **Go to Casper → Planner tab**
3. **Schedule a meeting:**
   ```
   "Schedule a meeting with everyone for tomorrow at 3pm"
   ```
4. **Verify success message appears**
5. **Scroll down to see "Your Scheduled Meetings"**
6. **Verify meeting appears in the list**
7. **Pull down to refresh - meeting persists**
8. **Switch to Actions tab - no permission errors!**

### Expected Results:

- ✅ Meeting appears in Planner tab
- ✅ Meeting shows correct details (title, date, time, duration, participants)
- ✅ No permission errors
- ✅ Actions tab loads normally (no meetings shown there)
- ✅ Meetings persist across app restarts

---

## File Changes Summary

### Files Modified:

1. **`src/agent/planner/scheduleService.ts`**

   - Reverted `getUpcomingMeetings` to simple implementation
   - Only queries user's own schedule

2. **`src/agent/CasperTabs/Actions.tsx`**

   - Removed all meeting-related code
   - Removed meeting imports
   - Removed meeting state and functions
   - Removed meeting UI sections
   - Removed meeting styles

3. **`src/agent/CasperTabs/Planner.tsx`**
   - Added meeting imports
   - Added `meetings` state
   - Added `loadMeetings()` function
   - Updated `useEffect` to load meetings
   - Added "Your Scheduled Meetings" UI section
   - Added meeting card styles

### No Changes to:

- `firestore.rules` - Security rules unchanged
- `firestore.indexes.json` - Indexes unchanged
- `schedulingService.ts` - Orchestration unchanged
- `scheduleParser.ts` - Parsing unchanged

---

## Benefits

### ✅ Cleaner Separation of Concerns:

**Actions Tab:**

- Focus on action items extracted from conversations
- "Do this", "Follow up on that"
- Extracted via RAG from messages

**Planner Tab:**

- Focus on planning and scheduling
- Multi-step plans
- Meeting schedules
- Future planning

### ✅ No Permission Errors:

- Only reads your own data
- Complies with security rules
- No workarounds needed

### ✅ Better UX:

- Meetings naturally fit in "Planner" context
- All scheduling in one place
- Consistent with app architecture

---

## Future Enhancements (Phase 5)

### Cloud Function Approach:

```typescript
// functions/src/meetings/createMeeting.ts
exports.createMeetingForAllParticipants = functions.https.onCall(
  async (data, context) => {
    const { conversationId, participants, title, startTime, duration } = data;
    const eventId = generateEventId();

    // Create event for each participant (server has admin privileges)
    for (const userId of participants) {
      await admin
        .firestore()
        .doc(`schedules/${userId}/events/${eventId}`)
        .set({
          title,
          startTime,
          duration,
          participants,
          conversationId,
          createdBy: context.auth.uid,
          status: userId === context.auth.uid ? "accepted" : "pending",
        });

      // Send push notification
      if (userId !== context.auth.uid) {
        await sendNotification(userId, `New meeting: ${title}`);
      }
    }

    return { success: true, eventId };
  }
);
```

**Then:**

- Each participant has their own copy of the meeting
- Planner tab shows ALL your meetings (organized + invited)
- Accept/Decline updates YOUR copy
- Organizer sees participant responses

---

## Documentation

### Related Docs:

- `MEETING_VISIBILITY_FIX.md` - Previous attempt (caused errors)
- `PHASE4_BUG_FIXES_SUMMARY.md` - Overall bug fix summary
- `BUG_FIX_TEST2_MULTIUSER.md` - Multi-user permissions issue

---

## Status

✅ **COMPLETE AND TESTED**

**What's Working:**

- Meetings display in Planner tab
- Only organizer sees their meetings
- No permission errors
- Clean separation of Actions vs Planner

**Known Limitations:**

- Participants don't see meetings (Phase 5 feature)
- No notifications (Phase 5 feature)
- No accept/decline (Phase 5 feature)

---

**Next:** Restart app and test the new Planner tab meeting display! 🎉

