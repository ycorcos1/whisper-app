# Actions & Decisions Tabs: History Feature Implementation

**Date:** October 27, 2025  
**Status:** ✅ Completed

---

## Summary

Implemented the History feature for both the **Actions** and **Decisions** tabs in the Casper AI panel, matching the design pattern from the Priority tab. This provides a consistent user experience across all tabs with done/pending state management.

---

## Changes Made

### 1. Actions Tab Updates

**Previous State:**

- Had "Show Done" / "Hide Done" toggle
- Showed all items or only pending items

**New Implementation:**

- **Active View (Default):** Shows only pending action items
- **History View:** Shows only completed action items
- **Header:** Added title "Action Items" / "Action History" with History/Back button
- **Empty States:** Context-aware messages for both views

#### Key Changes to `Actions.tsx`:

```typescript
// State
const [showHistory, setShowHistory] = useState(false);

// Filter logic - mutually exclusive views
const filteredActions = showHistory
  ? actions.filter((action) => action.isDone) // History: only done
  : actions.filter((action) => !action.isDone); // Active: only pending

// Header layout
<View style={styles.header}>
  <Text style={styles.headerTitle}>
    {showHistory ? "Action History" : "Action Items"}
  </Text>
  <View style={styles.headerButtons}>
    <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
      <MaterialCommunityIcons name={showHistory ? "arrow-left" : "history"} />
      <Text>{showHistory ? "Back" : "History"}</Text>
    </TouchableOpacity>
    {/* Reload button */}
  </View>
</View>;
```

---

### 2. Decisions Tab Updates

**Previous State:**

- No done/history functionality
- Only had pin feature

**New Implementation:**

- **Active View (Default):** Shows only pending decisions
- **History View:** Shows only completed decisions
- **Mark as Done:** New checkmark button next to pin button
- **Visual Feedback:** Done items are dimmed (60% opacity) with strikethrough text

#### Key Changes to `Decisions.tsx`:

```typescript
// State
const [showHistory, setShowHistory] = useState(false);

// Get toggleDone from hook
const { decisions, loading, error, refetch, togglePin, toggleDone } =
  useDecisionLog(state.context.cid);

// Filter logic
const filteredDecisions = showHistory
  ? decisions.filter((decision) => decision.isDone)
  : decisions.filter((decision) => !decision.isDone);

// UI elements
<TouchableOpacity onPress={() => toggleDone(decision.mid)}>
  <MaterialCommunityIcons
    name={decision.isDone ? "check-circle" : "check-circle-outline"}
    color={decision.isDone ? theme.colors.success : theme.colors.textSecondary}
  />
</TouchableOpacity>;
```

---

### 3. Hook Updates (`useExtraction.ts`)

Added done state management for decisions (previously only available for actions).

#### New Constants:

```typescript
const DONE_DECISIONS_KEY = "casper:done_decisions";
```

#### New Functions:

```typescript
async function loadDoneDecisions(): Promise<Set<string>>;
async function saveDoneDecisions(done: Set<string>): Promise<void>;
```

#### Updated Interfaces:

```typescript
export interface DecisionWithState extends ExtractedDecision {
  isPinned: boolean;
  isDone: boolean; // NEW
}

interface UseDecisionLogResult {
  decisions: DecisionWithState[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  togglePin: (mid: string) => Promise<void>;
  toggleDone: (mid: string) => Promise<void>; // NEW
}
```

#### Hook Implementation:

```typescript
export function useDecisionLog(cid?: string): UseDecisionLogResult {
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  // Load both pinned and done state on mount
  const [pinned, done] = await Promise.all([
    loadPinnedDecisions(),
    loadDoneDecisions(),
  ]);

  // Merge into decision objects
  const decisionsWithState = extractedDecisions.map((decision) => ({
    ...decision,
    isPinned: pinned.has(decision.mid),
    isDone: done.has(decision.mid),
  }));

  // Toggle done function
  const toggleDone = useCallback(
    async (mid: string) => {
      const newDone = new Set(doneSet);
      if (newDone.has(mid)) {
        newDone.delete(mid);
      } else {
        newDone.add(mid);
      }
      setDoneSet(newDone);
      await saveDoneDecisions(newDone);
      // Update local state...
    },
    [decisions, doneSet]
  );

  return { decisions, loading, error, refetch, togglePin, toggleDone };
}
```

---

## User Experience

### Actions Tab

#### Active View

```
┌─────────────────────────────────────────────┐
│ Action Items               [📜 History] [↻] │
├─────────────────────────────────────────────┤
│ ✓ Action Items (3)                          │
│                                             │
│ ☐ Finish the quarterly report              │
│   📅 by EOD  👤 @john  📊 85%              │
│                                        📌   │
└─────────────────────────────────────────────┘
```

#### History View

```
┌─────────────────────────────────────────────┐
│ Action History                [← Back] [↻]  │
├─────────────────────────────────────────────┤
│ 📜 Completed Actions (5)                    │
│                                             │
│ ☑ Review Q3 budget (dimmed)                │
│   📅 Oct 25  👤 @sarah  📊 92%             │
│                                        📌   │
└─────────────────────────────────────────────┘
```

---

### Decisions Tab

#### Active View

```
┌─────────────────────────────────────────────┐
│ Decisions                     [📜 History]  │
├─────────────────────────────────────────────┤
│ 💡 Oct 26, 2:30 PM              [90%]      │
│ We will launch the new feature              │
│ next Monday at 9am PST                      │
│                                    ☐ 📌     │
└─────────────────────────────────────────────┘
```

#### History View

```
┌─────────────────────────────────────────────┐
│ Decision History                 [← Back]   │
├─────────────────────────────────────────────┤
│ 💡 Oct 25, 10:15 AM (dimmed)    [85%]      │
│ Budget approved for Q4 (strikethrough)      │
│                                    ☑ 📌     │
└─────────────────────────────────────────────┘
```

---

## Consistent Design Patterns

All three tabs (Priority, Actions, Decisions) now follow the same pattern:

### ✅ Unified Features

1. **History Button:** 📜 icon, toggles between Active/History views
2. **Back Button:** ← icon, returns to Active view
3. **Mark as Done:** Checkbox/checkmark icon
4. **Visual Feedback:** Dimmed + strikethrough for done items
5. **Empty States:** Context-aware messages for both views
6. **Persistence:** AsyncStorage for done state across sessions
7. **Filter Logic:** Mutually exclusive views (pending OR done, never both)

### 🎨 Visual Consistency

- **Active View:** Full opacity, normal text
- **History View:** 60% opacity, strikethrough text
- **Icons:**
  - Active: Normal icons
  - History: "history" icon
  - Back: "arrow-left" icon
  - Done: "check-circle" (filled) / "check-circle-outline"

---

## Storage Keys

```typescript
// Actions
"casper:pinned_actions";
"casper:done_actions";

// Decisions
"casper:pinned_decisions";
"casper:done_decisions"; // NEW

// Priority
"casper:priority:done";
```

---

## Testing Checklist

### Actions Tab

- [ ] Default view shows only pending actions
- [ ] "History" button switches to completed actions view
- [ ] "Back" button returns to pending actions
- [ ] Mark as done removes action from active view
- [ ] Mark as pending removes action from history view
- [ ] Done state persists after app restart
- [ ] Reload button works in both views
- [ ] Empty states show correct messages

### Decisions Tab

- [ ] Default view shows only pending decisions
- [ ] "History" button switches to completed decisions view
- [ ] "Back" button returns to pending decisions
- [ ] Mark as done checkbox works
- [ ] Done items show strikethrough and dimmed
- [ ] Mark as pending removes from history
- [ ] Done state persists after app restart
- [ ] Pin feature still works independently
- [ ] Empty states show correct messages

### Cross-Tab Consistency

- [ ] All three tabs use same History/Back pattern
- [ ] Visual styling matches across tabs
- [ ] Done state is independent per tab
- [ ] Navigation flow feels consistent

---

## Benefits

### 🎯 User Experience

- **Cleaner Interface:** Only relevant items shown by default
- **Better Focus:** Active view shows what needs attention
- **Audit Trail:** History provides record of completed work
- **Consistent UX:** Same pattern across all Casper tabs

### 🔧 Technical

- **Reusable Pattern:** Easy to extend to other tabs if needed
- **Independent State:** Each tab manages its own done items
- **Persistent Storage:** Done state survives app restarts
- **Type Safety:** Full TypeScript support for done state

---

## Files Modified

1. **`src/agent/CasperTabs/Actions.tsx`**

   - Changed from "Show Done" toggle to History button
   - Updated filter logic for mutually exclusive views
   - Added header with title and buttons
   - Updated empty states

2. **`src/agent/CasperTabs/Decisions.tsx`**

   - Added History button functionality
   - Integrated toggleDone from hook
   - Added mark as done UI
   - Added visual feedback for done items
   - Updated empty states

3. **`src/agent/hooks/useExtraction.ts`**
   - Added `DONE_DECISIONS_KEY` constant
   - Added `loadDoneDecisions()` function
   - Added `saveDoneDecisions()` function
   - Updated `DecisionWithState` interface with `isDone` field
   - Updated `UseDecisionLogResult` interface with `toggleDone` function
   - Implemented `toggleDone` in `useDecisionLog` hook
   - Updated refetch to load both pinned and done state

---

## Impact on Remote Team Professional Persona

This feature directly supports the "Remote Team Professional" persona by:

1. **Reducing Cognitive Load:** Clear separation between active and completed items
2. **Improving Productivity:** Focus on what needs action, hide what's done
3. **Providing Context:** History serves as record of team decisions and actions
4. **Enabling Follow-up:** Easy to review past decisions without cluttering active view
5. **Maintaining Context:** Done items preserved, not deleted

---

**Status:** ✅ Ready for testing across all three tabs
