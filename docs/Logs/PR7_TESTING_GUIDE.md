# PR 7 — Multi-Step Agent Testing Guide

**Feature:** Multi-Step Agent Orchestration  
**Branch:** `feature/pr7-casper-multistep-agent`

## Prerequisites

1. **Firebase Functions Deployed**: Ensure the new planner functions are deployed
2. **OpenAI API Key**: Configured in Firebase Functions config
3. **Pinecone Setup**: From PR3 (RAG layer)
4. **Test Conversation**: Create a conversation with 20+ messages about planning topics

## Setup Steps

### 1. Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions:casperPlan,functions:casperGetPlan,functions:casperListPlans
```

### 2. Verify Deployment

Check Firebase Console → Functions to ensure all three functions are deployed:

- ✅ `casperPlan`
- ✅ `casperGetPlan`
- ✅ `casperListPlans`

### 3. Seed Test Data

Create a test conversation with messages like:

```
"Let's plan a team offsite for next month"
"I'm thinking San Francisco or Austin"
"We need to book a venue by next week"
"Team size is about 15 people"
"Budget is around $50k"
```

## Test Scenarios

### Scenario 1: Offsite Planning

**Goal:** Test intent detection and multi-step orchestration for offsite planning

**Steps:**

1. Open test conversation
2. Tap Casper ghost button
3. Navigate to "Planner" tab
4. Enter query: `"Plan team offsite next month in San Francisco"`
5. Tap "Run Plan"

**Expected Results:**

- ✅ Loading indicator appears
- ✅ Intent detected as "Offsite Planning"
- ✅ 4-5 tasks generated and executed in sequence:
  1. Search conversation context
  2. Summarize thread (extract dates, locations, people)
  3. Find free times (5 suggested dates)
  4. Generate comprehensive plan
- ✅ Each task shows status: pending → running → completed
- ✅ Final plan summary displays with:
  - Event overview and goals
  - Proposed dates and location
  - Suggested activities
  - Budget considerations
  - Action items
- ✅ Plan saved to history

**Failure Modes to Test:**

- Query too short (<10 chars): Should show error
- No conversation context: Should still work (general planning)
- Network failure: Should show error and not crash

---

### Scenario 2: Meeting Scheduling

**Goal:** Test meeting scheduling intent and time slot generation

**Steps:**

1. Navigate to Planner tab
2. Enter query: `"Schedule a 1:1 meeting with design team lead next week"`
3. Tap "Run Plan"

**Expected Results:**

- ✅ Intent detected as "Meeting Scheduling"
- ✅ Tasks executed:
  1. Search for availability context
  2. Find free times
  3. Generate meeting plan
- ✅ Plan includes:
  - Meeting purpose
  - 5 suggested time slots
  - Agenda items
  - Preparation notes
- ✅ Time slots are realistic (weekdays, business hours)

---

### Scenario 3: Task Breakdown

**Goal:** Test complex project breakdown

**Steps:**

1. Create conversation about a feature (e.g., "We need to build user authentication")
2. Navigate to Planner tab (with conversation context)
3. Enter query: `"Break down the user authentication feature into implementation tasks"`
4. Tap "Run Plan"

**Expected Results:**

- ✅ Intent detected as "Task Breakdown"
- ✅ Tasks executed:
  1. Search conversation for project context
  2. Summarize requirements
  3. Generate task breakdown
- ✅ Plan includes:
  - Project overview
  - Major milestones
  - Detailed task list
  - Timeline estimate
  - Dependencies

---

### Scenario 4: Plan History

**Goal:** Test plan persistence and retrieval

**Steps:**

1. Create 3-5 different plans
2. Close and reopen app
3. Navigate to Planner tab
4. Tap history button (top-right)

**Expected Results:**

- ✅ All created plans visible in history
- ✅ Plans sorted by date (newest first)
- ✅ Each plan shows:
  - Intent type badge
  - Creation timestamp
  - Status (completed/failed)
  - Task execution steps
- ✅ Can expand plans to view full details
- ✅ Pull-to-refresh works

---

### Scenario 5: Error Handling

**Goal:** Test graceful degradation and error recovery

**Steps:**

#### 5a. Invalid Query

1. Enter: `"abc"` (too short)
2. Tap "Run Plan"
3. **Expected:** Error message: "Query too short (min 10 characters)"

#### 5b. Unknown Intent

1. Enter: `"What's the weather today?"` (not a planning query)
2. Tap "Run Plan"
3. **Expected:** Error: "Could not determine planning intent..."

#### 5c. Tool Failure (Simulated)

1. Turn off network
2. Enter valid offsite query
3. Tap "Run Plan"
4. **Expected:**
   - Some tasks may fail
   - Error messages displayed per task
   - Plan status: "failed"
   - No app crash

---

### Scenario 6: Real-Time Updates

**Goal:** Verify live task status updates

**Steps:**

1. Enter complex query: `"Plan Q4 product roadmap with team alignment"`
2. Watch task execution in real-time

**Expected Results:**

- ✅ Tasks update in sequence (not all at once)
- ✅ Status icons change: circle → loading → check/error
- ✅ Colors update based on status
- ✅ No UI freezing during execution

---

### Scenario 7: Conversation Context Integration

**Goal:** Test RAG integration with conversation context

**Steps:**

1. Create conversation with specific details:
   - "Team retreat in Austin"
   - "Budget is $75k"
   - "Prefer early October"
   - "Need venue with AV setup"
2. In Planner tab, enter: `"Plan our team retreat"`
3. Tap "Run Plan"

**Expected Results:**

- ✅ Plan references conversation context:
  - Location: Austin (from conversation)
  - Budget: $75k (from conversation)
  - Timing: October (from conversation)
  - Requirements: AV setup (from conversation)
- ✅ Search context task finds relevant messages
- ✅ Summarize task extracts entities correctly

---

## Performance Benchmarks

| Metric                   | Target      | Acceptance        |
| ------------------------ | ----------- | ----------------- |
| Intent Detection         | <2s         | <5s               |
| Task Execution (3 tasks) | <10s        | <20s              |
| Total Plan Generation    | <15s        | <30s              |
| UI Responsiveness        | No freezing | Smooth animations |
| Plan Persistence         | Instant     | <1s               |

## Edge Cases

### 1. Very Long Query

- **Input:** 1000+ character query
- **Expected:** Error: "Query too long (max 1000 characters)"

### 2. Rapid Successive Plans

- **Steps:** Create 3 plans in quick succession
- **Expected:** Each completes independently, no conflicts

### 3. Empty Conversation

- **Steps:** Create plan without conversation context
- **Expected:** Works, generates general plan without specific context

### 4. Multiple Concurrent Users

- **Steps:** Two users create plans simultaneously
- **Expected:** Plans properly scoped by userId, no cross-contamination

## Firestore Verification

After creating plans, verify in Firebase Console:

```
/agent/{userId}/plans/{planId}
{
  id: string,
  intent: "offsite_planning" | "meeting_scheduling" | "task_breakdown",
  tasks: [...],
  summary: "...",
  status: "completed" | "failed",
  createdAt: timestamp,
  completedAt: timestamp,
  userId: string,
  conversationId: string (optional)
}
```

## Security Testing

### 1. Access Control

- **Test:** Try to read another user's plan
- **Expected:** Firestore security rules block access

### 2. Write Protection

- **Test:** Try to modify plan directly via Firestore
- **Expected:** Only owner can write

### 3. Query Injection

- **Test:** Enter SQL injection patterns in query
- **Expected:** Safely sanitized, no execution

## Debugging

### Common Issues

#### Issue: "Plan creation fails immediately"

- **Check:** Firebase Functions logs
- **Common cause:** Missing OpenAI or Pinecone credentials
- **Fix:** Verify functions config

#### Issue: "Task stays in 'running' indefinitely"

- **Check:** Network connectivity
- **Check:** Firebase Functions timeout (default 60s)
- **Fix:** Increase timeout if needed

#### Issue: "Plan summary is empty"

- **Check:** Task execution results
- **Common cause:** LLM returned non-JSON
- **Fix:** Check LLM prompts in `orchestrator.ts`

### Logs to Check

1. **Client Logs** (React Native Debugger):

   ```
   console.log → plannerService calls
   ```

2. **Firebase Functions Logs**:
   ```bash
   firebase functions:log
   ```
   Look for:
   - "Detecting intent for query:"
   - "Tasks decomposed:"
   - "Task execution failed:"

## Acceptance Checklist

- [ ] All 7 scenarios pass
- [ ] Performance targets met
- [ ] No crashes or freezes
- [ ] Errors handled gracefully
- [ ] Plans persist correctly
- [ ] Security rules enforced
- [ ] UI is responsive and intuitive
- [ ] History view works correctly
- [ ] RAG integration functional

## Demo Script (for Showcase)

1. **Setup:** Open app, navigate to conversation about team retreat
2. **Narration:** "Let's use Casper's multi-step planner to organize this"
3. **Action:** Tap Casper → Planner tab
4. **Input:** "Plan team offsite based on our discussion"
5. **Watch:** Tasks execute in sequence
6. **Highlight:**
   - "See how it's searching our conversation"
   - "Now extracting dates and locations"
   - "Finding available time slots"
   - "Generating comprehensive plan"
7. **Result:** Show final plan with logistics, dates, action items
8. **Follow-up:** Show history view with multiple plans

---

**Ready for Testing** ✅  
**Estimated Testing Time:** 60-90 minutes for full suite
