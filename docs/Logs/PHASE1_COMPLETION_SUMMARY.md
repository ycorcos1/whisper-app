# Phase 1: Meeting Scheduler Foundation - COMPLETE ✅

**Date:** October 24, 2025  
**Status:** ✅ COMPLETE

---

## Overview

Phase 1 establishes the foundation for the autonomous meeting scheduler feature by implementing:

1. Natural language date/time parsing
2. Member role system for group chats
3. Schedule storage infrastructure
4. ChatSettingsScreen UI for role management

---

## Components Implemented

### 1. ✅ Date/Time Parser

**File:** `src/agent/planner/dateParser.ts`

**Functions:**

- `parseDateTime(text, baseDate)` - Parse natural language dates and times
- `parseEarliestAvailable(text)` - Handle "earliest available" queries
- `formatDateTime(date)` - Format dates for display
- `formatDateTimeShort(date)` - Compact date format
- `parseDuration(text)` - Parse meeting duration strings

**Supported Formats:**

- "next friday at 3pm"
- "11/4", "november 4th", "nov 4th"
- "wednesday at 2pm"
- "tomorrow at 9am"
- "his earliest available free time starting at 9"

### 2. ✅ Type Definitions

**File:** `src/types/casper.ts`

**New Types:**

```typescript
type MemberRole = "Friend" | "PM" | "SE" | "QA" | "Design" | "Stakeholder";

interface ConversationMember {
  userId: string;
  displayName: string;
  role: MemberRole;
  joinedAt: Date;
}

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Date;
  duration: number;
  participants: string[];
  createdBy: string;
  conversationId: string;
  createdAt: Date;
}

const RoleAliases = {
  PM: ["pm", "project manager", "product manager"],
  SE: ["engineer", "developer", "software engineer", "software developer"],
  QA: ["qa", "tester", "quality assurance"],
  Design: ["designer", "design", "ux", "ui"],
  Stakeholder: ["stakeholder"],
};
```

### 3. ✅ Firestore Rules

**File:** `firestore.rules`

**New Rules:**

```
// Conversation members subcollection
match /conversations/{conversationId}/members/{memberId} {
  allow read: if isConversationMember(conversationId);
  allow write: if isConversationMember(conversationId);
}

// User schedules collection
match /schedules/{userId}/events/{eventId} {
  allow read, write: if request.auth.uid == userId;
}
```

### 4. ✅ ChatSettingsScreen UI

**File:** `src/screens/ChatSettingsScreen.tsx`

**Implemented Features:**

1. **State Management:**

   ```typescript
   const [memberDetails, setMemberDetails] = useState<
     Array<{
       userId: string;
       displayName: string;
       email: string;
       role: MemberRole;
     }>
   >([]);

   const [selectedMemberForRole, setSelectedMemberForRole] = useState<{
     userId: string;
     currentRole: MemberRole;
   } | null>(null);
   ```

2. **Role Loading:**

   - Fetches roles from `/conversations/{cid}/members/{uid}` on mount
   - Defaults to "Friend" if no role is set

3. **Role Selector Badge:**

   - Displays current role below member name/email
   - Tappable to open role selection modal
   - Shows "Role: {roleName}" with arrow indicator

4. **Role Selection Modal:**

   - 6 role options: Friend, PM, SE, QA, Design, Stakeholder
   - Highlights currently selected role
   - Saves to Firestore on selection
   - Updates local state immediately
   - **Only accessible for the current user's own role**
   - Other members' roles are displayed but not editable

5. **Styles Added:**
   - Role selector badge styling (editable)
   - Role selector disabled styling (other members)
   - Modal overlay and content
   - Role option buttons with selected state
   - Cancel button

### 5. ✅ Dependencies

**Installed:**

```bash
npm install chrono-node date-fns --legacy-peer-deps
```

**Packages:**

- `chrono-node`: Natural language date parsing
- `date-fns`: Date manipulation utilities

---

## Files Summary

### Created:

- ✅ `src/agent/planner/dateParser.ts`

### Modified:

- ✅ `src/types/casper.ts`
- ✅ `firestore.rules`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `src/screens/ChatSettingsScreen.tsx`

---

## Testing Checklist

To verify Phase 1 implementation:

- [ ] Create a group chat with 3+ members
- [ ] Open Chat Settings for the group
- [ ] Verify each member shows "Role: Friend" by default
- [ ] Tap on YOUR OWN role selector badge (marked with "(You)")
- [ ] Modal should appear with 6 role options
- [ ] Select a different role (e.g., "PM")
- [ ] Verify the role updates in the UI immediately
- [ ] Try tapping on ANOTHER member's role badge
- [ ] Verify the modal does NOT appear (badge is disabled)
- [ ] Verify other members' role badges show no arrow and appear dimmed
- [ ] Close and reopen Chat Settings
- [ ] Verify the role persists across sessions
- [ ] Check Firestore console:
  - Navigate to `/conversations/{conversationId}/members/{userId}`
  - Verify `role` field exists and contains the selected role
  - Verify `displayName`, `joinedAt` fields are present

---

## Key Features Delivered

### Role System:

✅ Six role types for team categorization  
✅ Default "Friend" role for all members  
✅ Persistent storage in Firestore  
✅ Real-time UI updates  
✅ Elegant modal-based role selection  
✅ **Self-identification model**: Users can only change their own role  
✅ Other members' roles are visible but not editable

### Date Parsing:

✅ Natural language date parsing  
✅ Multiple date format support  
✅ "Earliest available" time handling  
✅ Duration parsing  
✅ Relative dates (tomorrow, next Friday, etc.)

### Infrastructure:

✅ Firestore schema for members and schedules  
✅ Security rules for data access  
✅ Type definitions for TypeScript safety

---

## Next: Phase 2

With Phase 1 complete, we can now move to **Phase 2: Schedule Command Processing**

### Phase 2 Objectives:

1. **Schedule Command Parser**

   - Parse natural language meeting requests
   - Extract participants, date/time, and title
   - Handle role-based mentions ("all designers", "all pms")
   - Handle direct mentions ("with Alice and Bob")

2. **User Matching System**

   - Match users by role using Phase 1 data
   - Match users by name/display name
   - Resolve ambiguities when multiple matches exist
   - Handle "everyone" or "all members" requests

3. **Schedule Storage (Option A: Firestore)**

   - Store events in `/schedules/{userId}/events/{eventId}`
   - Create events for all participants
   - Track meeting details (title, time, duration, participants)

4. **Action Item Integration**

   - Extend `ActionItem` type to include meeting details
   - Display meeting requests in Actions tab
   - Add accept/decline/reschedule actions
   - Show meeting status (pending/accepted/declined)

5. **Planner Orchestration**
   - Connect schedule commands to multi-step agent
   - Create specialized tool for meeting scheduling
   - Execute via `casperPlan` function
   - Return confirmation with meeting details

### Example Commands to Support:

```
"Schedule a meeting with this user for next friday at 3pm"
"Schedule a meeting at his earliest available free time starting at 9"
"Schedule a meeting with everyone for next friday at 9am"
"Schedule a meeting with user a and user b for next thursday at 4pm"
"Schedule a meeting with all the designers for wednesday at 2pm"
"Schedule a meeting with all pms and designers for monday at 10am"
```

---

## Technical Notes

### Date Parser Usage:

```typescript
import { parseDateTime, formatDateTime } from "../agent/planner/dateParser";

const result = parseDateTime("next friday at 3pm");
if (result) {
  console.log(formatDateTime(result.date));
  // Output: "Friday, October 31, 2025 at 3:00 PM"
}
```

### Role Query:

```typescript
import { RoleAliases } from "../types/casper";

// Match "designers" to "Design" role
const normalizedRole = Object.entries(RoleAliases).find(([role, aliases]) =>
  aliases.some((alias) => "designers".toLowerCase().includes(alias))
)?.[0]; // Returns: "Design"
```

### Firestore Member Query:

```typescript
const membersSnapshot = await getDocs(
  collection(firebaseFirestore, `conversations/${conversationId}/members`)
);

const designers = membersSnapshot.docs
  .filter((doc) => doc.data().role === "Design")
  .map((doc) => doc.data());
```

---

## Deployment Status

- ✅ All code committed locally
- ✅ Dependencies installed
- ✅ Firestore rules deployed
- ✅ TypeScript compilation successful
- ✅ No linter errors
- ⏳ Ready for Phase 2 implementation

---

**Ready to proceed with Phase 2?**
