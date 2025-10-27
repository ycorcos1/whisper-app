# Task 1.2 Testing Guide

## Quick Testing Instructions

### ✅ What Was Fixed

**Problem:** Conversation list didn't update after receiving messages while offline (notification banner worked fine).

**Solution:**

- Auto-refresh when app comes to foreground
- Manual pull-to-refresh on conversation list

---

## 🧪 Test Scenarios

### **Test 1: Offline Message Receipt** (2 minutes)

**Setup:**

- Two devices/simulators (User A and User B)
- Active conversation between them

**Steps:**

1. User A: Enable airplane mode (go offline)
2. User B: Send 3-5 messages to User A
3. User A: Disable airplane mode (go online)
4. User A: Should see notification banner appear ✅
5. User A: **Check conversation list** - should show new messages ✅

**Success Criteria:**

- [ ] Conversation list shows latest message
- [ ] Timestamp updates
- [ ] Unread indicator appears
- [ ] No need to open chat to see update

---

### **Test 2: Background → Foreground** (1 minute)

**Setup:**

- User A has app open on conversation list
- User B ready to send messages

**Steps:**

1. User A: Press home button (background app)
2. User B: Send 2-3 messages
3. User A: Open app again (bring to foreground)
4. User A: Conversation list should **auto-refresh**

**Success Criteria:**

- [ ] List updates automatically (no user action)
- [ ] New messages visible immediately
- [ ] Works smoothly without lag

---

### **Test 3: Pull-to-Refresh** (30 seconds)

**Setup:**

- User A on conversation list screen

**Steps:**

1. User A: Pull down on conversation list
2. See refresh spinner (amethyst color)
3. List should refresh
4. Spinner disappears

**Success Criteria:**

- [ ] Smooth pull gesture
- [ ] Spinner shows
- [ ] List refreshes
- [ ] Works even when already online

---

### **Test 4: No Regressions** (2 minutes)

**Verify these still work:**

1. **Conversation List**

   - [ ] Shows all conversations
   - [ ] Sorted by most recent
   - [ ] Avatar displays correctly
   - [ ] Tapping opens chat

2. **New Messages**

   - [ ] Notification banner appears
   - [ ] Tapping banner navigates to chat
   - [ ] Banner auto-dismisses

3. **Select Mode**

   - [ ] Long press enters select mode
   - [ ] Can delete conversations
   - [ ] "Done" exits select mode

4. **Offline Queue**
   - [ ] Messages queue when offline
   - [ ] Send when back online
   - [ ] No message loss

---

## 🎯 Expected Results

### All Tests Should Show:

- ✅ Conversation list updates automatically (foreground)
- ✅ Manual refresh works (pull-to-refresh)
- ✅ No errors in console
- ✅ Smooth user experience
- ✅ All existing features work

---

## 🐛 If Something Fails

### Issue: Pull-to-refresh doesn't work

**Check:**

- Make sure you're pulling down on the list (not empty state)
- Look for console errors
- Verify `refreshing` state updates

### Issue: Auto-refresh doesn't trigger

**Check:**

- Make sure you're backgrounding the app (not just locking screen)
- Bring app back to foreground
- Check console for errors

### Issue: Conversation list still doesn't update

**Check:**

- Verify Firestore is online (check Firebase console)
- Check if notifications work (that means data is syncing)
- Try manual pull-to-refresh

---

## ✅ Quick Pass/Fail

**PASS if:**

- Test 1, 2, and 3 all work
- No console errors
- Existing features still work

**FAIL if:**

- Conversation list doesn't update (after foreground or refresh)
- Pull-to-refresh doesn't work
- Errors in console
- Existing features broken

---

## 📊 Testing Checklist

- [ ] Test 1: Offline message receipt - PASS
- [ ] Test 2: Background → Foreground - PASS
- [ ] Test 3: Pull-to-refresh - PASS
- [ ] Test 4: No regressions - PASS
- [ ] No console errors - PASS

**All tests must pass before moving to next task.**

---

## 🚀 After Testing

Once all tests pass:

- ✅ Mark Task 1.2 as complete
- ✅ Move to next priority task
- ✅ Consider Task 3.x (Casper AI) - worth 30 points!

---

**Ready to test! Pull down on the conversation list and see the refresh in action! 🎉**
