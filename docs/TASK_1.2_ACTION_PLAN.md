# Task 1.2: Offline Persistence & Queue Optimization - Action Plan

## Current State Assessment

### ✅ **Already Implemented (Excellent!)**

1. **Offline Queue System** - COMPLETE

   - Messages queue when offline
   - Exponential backoff retry (1s → 32s)
   - Max 6 retries
   - Queue survives app restarts
   - Global queue processor runs every 30s

2. **Message Persistence** - COMPLETE

   - AsyncStorage for drafts, queue, selected conversation
   - Message caching (last 30 messages per conversation)
   - Display name caching
   - Schema migrations

3. **Queue Processor** - COMPLETE

   - Automatic retry on app startup
   - Periodic processing (30s intervals)
   - Error handling with retry logic

4. **Firestore Offline Support** - COMPLETE
   - Offline persistence enabled
   - `experimentalForceLongPolling: true`

### ❌ **Missing/Needs Optimization**

1. **Connection Status UI** - NOT IMPLEMENTED

   - No visual indicator when offline
   - No banner showing "connecting..." or "offline"
   - User has no visibility into connection state

2. **Progressive Sync Indicator** - NOT IMPLEMENTED

   - No loading indicator while syncing
   - No progress bar for reconnection
   - No "X pending messages" counter

3. **Network Event Listeners** - PARTIAL

   - App state changes handled (background/foreground)
   - No dedicated network connectivity monitoring
   - No immediate retry on network reconnect

4. **Priority Queue** - NOT IMPLEMENTED

   - All messages treated equally
   - Text and images queued in same order
   - No prioritization logic

5. **AsyncStorage Optimization** - CAN BE IMPROVED
   - Individual operations (not batched)
   - No transaction support
   - Could benefit from batch reads/writes

---

## Task 1.2 Action Items

### **Action 1.2.1: Add Connection Status Banner** 🔴🟢

**Priority:** HIGH (User feedback essential)

**What to Build:**

- Banner at top of app showing connection status
- States: "Connected", "Connecting...", "Offline", "X messages pending"
- Auto-hide when connected
- Persistent when offline

**Implementation:**

1. Create `ConnectionStatusBanner` component
2. Use `@react-native-community/netinfo` for network state
3. Integrate with queue status (show pending message count)
4. Add to `RootNavigator` or `App.tsx`

**Expected Result:**

- Users see clear indication when offline
- Know when messages are queued
- Understand sync progress

---

### **Action 1.2.2: Add Network Event Listeners** 📡

**Priority:** HIGH (Immediate reconnection)

**What to Build:**

- Listen to network state changes
- Trigger immediate queue processing on reconnect
- Cancel pending queue check when offline

**Implementation:**

1. Install `@react-native-community/netinfo`
2. Add network listener to queue processor
3. Trigger `processGlobalQueue()` immediately on reconnect
4. Update connection banner simultaneously

**Expected Result:**

- Messages send immediately when network returns
- No waiting for 30s timer
- Better user experience

---

### **Action 1.2.3: Add Progressive Sync Indicator** ⏳

**Priority:** MEDIUM (Nice UX improvement)

**What to Build:**

- Show "Syncing X of Y messages..." when processing queue
- Progress indicator in connection banner
- Clear feedback when sync complete

**Implementation:**

1. Add sync progress tracking to queue processor
2. Emit events during queue processing
3. Update connection banner with progress
4. Show success message when complete

**Expected Result:**

- Users see progress during sync
- Know how many messages are queuing/sending
- Clear feedback

---

### **Action 1.2.4: Optimize AsyncStorage with Batching** ⚡

**Priority:** LOW (Performance optimization)

**What to Build:**

- Batch multiple AsyncStorage operations
- Use `multiSet` and `multiGet` where possible
- Reduce individual operations

**Implementation:**

1. Update queue operations to batch
2. Use `multiRemove` for cleanup
3. Batch message cache updates

**Expected Result:**

- Faster persistence operations
- Reduced I/O operations
- Better performance

---

### **Action 1.2.5: Implement Priority Queue (Optional)** 📋

**Priority:** LOW (Edge case optimization)

**What to Build:**

- Prioritize text messages over images
- Send urgent messages first
- Configurable priority levels

**Implementation:**

1. Add `priority` field to `QueuedMessage`
2. Sort queue by priority before processing
3. Text = high priority, Images = normal priority

**Expected Result:**

- Text messages send before images
- Better perceived performance
- Critical messages deliver first

---

## Implementation Order

### **Phase 1: Essential UI Feedback** (Do First)

1. ✅ **Action 1.2.1:** Connection Status Banner
2. ✅ **Action 1.2.2:** Network Event Listeners

**Why:** Users need to know what's happening. This is critical for UX.

### **Phase 2: Progress Feedback** (Do Second)

3. ✅ **Action 1.2.3:** Progressive Sync Indicator

**Why:** Shows users the app is working, not frozen.

### **Phase 3: Performance** (Do If Time)

4. ⚠️ **Action 1.2.4:** AsyncStorage Batching (optional)
5. ⚠️ **Action 1.2.5:** Priority Queue (optional)

**Why:** Nice optimizations but not critical for rubric.

---

## Testing Requirements

### **Test 1: Offline → Online Sync**

1. Go offline (airplane mode)
2. Send 5 messages
3. See "Offline - 5 messages pending" banner
4. Go online
5. Banner shows "Syncing 5 messages..."
6. All messages deliver
7. Banner disappears

**Success Criteria:**

- [ ] Banner shows correct state
- [ ] Pending count accurate
- [ ] Messages sync immediately on reconnect
- [ ] Banner auto-hides after sync

---

### **Test 2: Network Drop Mid-Session**

1. In active conversation
2. Disconnect Wi-Fi/data mid-message
3. Continue typing and sending
4. Banner shows "Offline - X pending"
5. Reconnect
6. Messages send automatically

**Success Criteria:**

- [ ] Banner appears immediately on disconnect
- [ ] Messages queue correctly
- [ ] Auto-sync on reconnect
- [ ] No user intervention needed

---

### **Test 3: App Restart with Queued Messages**

1. Go offline
2. Send messages
3. Force quit app
4. Reopen app (still offline)
5. Banner shows pending messages
6. Go online
7. Messages send automatically

**Success Criteria:**

- [ ] Queue survives restart
- [ ] Banner shows pending count on startup
- [ ] Messages send when online
- [ ] No message loss

---

### **Test 4: Progressive Sync Feedback**

1. Queue 20 messages offline
2. Go online
3. Watch banner update: "Syncing 1/20... 2/20... etc."
4. See completion message

**Success Criteria:**

- [ ] Progress updates in real-time
- [ ] Accurate count
- [ ] Smooth UI updates
- [ ] Clear completion feedback

---

## Rubric Alignment

This task addresses:

**Section 1: Core Messaging Infrastructure (35 points)**

- ✅ **Offline Support & Persistence (12 points):**
  - Sub-1 second sync time after reconnection ✅
  - Clear UI indicators for connection status ✅
  - Messages queue and send when reconnected ✅
  - Full chat history preserved ✅

**Testing Scenarios from Rubric:**

1. ✅ Send 5 messages while offline → go online → all deliver
2. ✅ Force quit app → reopen → history intact
3. ✅ Network drop 30s → sync on reconnect
4. ✅ Receive messages offline → see when online

**Expected Score:** **11-12/12 points** (Excellent tier)

---

## Files to Create/Modify

### New Files:

1. `src/components/ConnectionStatusBanner.tsx` - Status banner component
2. `src/hooks/useNetworkStatus.ts` - Network monitoring hook
3. `src/hooks/useQueueStatus.ts` - Queue status tracking hook

### Modified Files:

1. `src/features/messages/queueProcessor.ts` - Add network listeners
2. `App.tsx` or `RootNavigator.tsx` - Add banner component
3. `src/features/messages/persistence.ts` - Add batching (optional)

---

## Success Criteria

Task 1.2 is **100% complete** when:

- ✅ Connection status banner implemented and working
- ✅ Network event listeners trigger immediate sync
- ✅ Progressive sync shows accurate progress
- ✅ All 4 tests pass successfully
- ✅ No regressions in existing functionality
- ✅ Rubric requirements met (sub-1s sync, clear indicators)

---

## Estimated Time

- **Action 1.2.1:** 30-45 minutes
- **Action 1.2.2:** 20-30 minutes
- **Action 1.2.3:** 20-30 minutes
- **Testing:** 30 minutes
- **Total:** ~2 hours

---

**Ready to start?** Let's begin with Action 1.2.1 (Connection Status Banner)!
