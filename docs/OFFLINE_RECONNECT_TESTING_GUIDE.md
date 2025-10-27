# Offline Network Reconnect - Testing Guide

## 🎯 What We're Testing

**Feature:** Automatic conversation list refresh when network reconnects while app is open.

**User Story:** "As a user, when I lose connection and reconnect, I want to see new messages immediately without having to manually refresh or open conversations."

---

## 📋 Test Suite

### ✅ Test 1: Airplane Mode → Reconnect (Primary Test)

**Setup:**

1. User A and User B both logged in
2. User A on conversation list screen
3. App is open and active

**Steps:**

1. **User A:** Turn on airplane mode on your device
2. **User B:** Send a message to User A: "Test message while offline"
3. **Wait:** 5 seconds
4. **User A:** Turn off airplane mode
5. **Wait:** 2-3 seconds
6. **Observe:** User A's conversation list

**Expected Result:**

- ✅ Console shows: `🌐 Network reconnected, refreshing conversation list`
- ✅ Conversation list updates automatically (no manual action needed)
- ✅ Last message preview shows: "Test message while offline"
- ✅ Timestamp updates to latest
- ✅ Update happens within 1-2 seconds of reconnect

**Current (Before Fix):**

- ❌ Conversation list stays stale
- ❌ Must open conversation to see new message
- ❌ No automatic update

---

### ✅ Test 2: Wi-Fi Disconnect → Reconnect

**Setup:**

1. User A connected to Wi-Fi
2. User A on conversation list screen

**Steps:**

1. **User A:** Disconnect from Wi-Fi (Settings → Wi-Fi → Off)
2. **User B:** Send message: "Wi-Fi test message"
3. **Wait:** 5 seconds
4. **User A:** Reconnect to Wi-Fi
5. **Wait:** 2-3 seconds
6. **Observe:** User A's conversation list

**Expected Result:**

- ✅ Console: `🌐 Network reconnected, refreshing conversation list`
- ✅ Conversation list updates
- ✅ New message appears
- ✅ Fast sync (<2s)

---

### ✅ Test 3: Cellular → Wi-Fi Switch

**Setup:**

1. User A on cellular data
2. User A on conversation list screen

**Steps:**

1. **User A:** Turn off cellular, turn on Wi-Fi
2. **User B:** Send message during switch
3. **Wait:** 2-3 seconds after Wi-Fi connects
4. **Observe:** User A's conversation list

**Expected Result:**

- ✅ Smooth transition
- ✅ Conversation list updates when Wi-Fi connects
- ✅ New messages appear

---

### ✅ Test 4: Network Drop Mid-Session

**Setup:**

1. User A in active chat
2. Good network connection

**Steps:**

1. **User A:** Actively using app
2. **Simulate:** Network drop (airplane mode on, then off after 10s)
3. **User B:** Send 3 messages while User A offline
4. **User A:** Return to conversation list after reconnect
5. **Observe:** All messages visible

**Expected Result:**

- ✅ All 3 messages appear
- ✅ Conversation list shows latest message
- ✅ No messages lost

---

### ✅ Test 5: Rapid Reconnects (Edge Case)

**Setup:**

1. User A on conversation list

**Steps:**

1. **User A:** Turn airplane mode on/off rapidly (3-4 times in 10 seconds)
2. **Observe:** Console logs and app behavior

**Expected Result:**

- ✅ Multiple `🌐 Network reconnected` logs
- ✅ No crashes or errors
- ✅ Conversation list eventually stable
- ✅ No performance issues

---

### ✅ Test 6: Background → Foreground (Existing Feature, Should Still Work)

**Setup:**

1. User A on conversation list

**Steps:**

1. **User A:** Background app (home button)
2. **User B:** Send message
3. **Wait:** 5 seconds
4. **User A:** Return to app (foreground)
5. **Observe:** Conversation list

**Expected Result:**

- ✅ AppState listener triggers
- ✅ Conversation list refreshes
- ✅ New message appears
- ✅ Works independently of network listener

---

### ✅ Test 7: Pull-to-Refresh (Existing Feature, Should Still Work)

**Setup:**

1. User A on conversation list

**Steps:**

1. **User A:** Pull down on conversation list
2. **Observe:** Refresh animation and behavior

**Expected Result:**

- ✅ Refresh spinner appears
- ✅ Latest messages loaded
- ✅ Manual refresh works as before

---

## 🔍 How to Monitor

### Console Logs to Watch For:

**Success:**

```
🌐 Network reconnected, refreshing conversation list
```

**Errors (if any):**

```
Error refreshing conversation list: [error details]
```

### Where to Check:

- **Metro Bundler** (development console)
- **React Native Debugger**
- **Xcode Console** (iOS)
- **Android Studio Logcat** (Android)

---

## 📊 Success Criteria

### Must Pass (Critical):

- [ ] Test 1 (Airplane mode) passes
- [ ] Test 2 (Wi-Fi disconnect) passes
- [ ] Console logs appear correctly
- [ ] Conversation list updates within 2 seconds
- [ ] No crashes or errors

### Should Pass (Important):

- [ ] Test 3 (Cellular → Wi-Fi) passes
- [ ] Test 4 (Network drop) passes
- [ ] Test 5 (Rapid reconnects) no issues
- [ ] Test 6 (Background → Foreground) still works
- [ ] Test 7 (Pull-to-refresh) still works

### Performance:

- [ ] No lag when network changes
- [ ] Refresh happens quickly (<2s)
- [ ] App remains responsive
- [ ] No duplicate refreshes

---

## 🐛 Known Issues / Edge Cases

### 1. **Partial Internet Access**

- **Scenario:** Connected to Wi-Fi but no internet (captive portal)
- **Expected:** NetInfo `isInternetReachable` = false, no refresh
- **Test:** Connect to hotel/airport Wi-Fi without logging in

### 2. **Slow Network**

- **Scenario:** Poor cellular connection
- **Expected:** Refresh takes longer but still works
- **Test:** Use 3G or throttled connection

### 3. **Firestore Offline Cache**

- **Scenario:** Messages already cached
- **Expected:** Instant display even offline
- **Test:** Open conversation, go offline, reopen

---

## 🔧 Debugging Tips

### If Tests Fail:

**1. Check NetInfo is installed:**

```bash
cd /Users/yahavcorcos/Desktop/whisper-app
npm list @react-native-community/netinfo
```

**2. Check Console Logs:**

- Look for `🌐 Network reconnected` message
- Check for errors in Firestore queries

**3. Verify refreshConversationList() works:**

```typescript
// In ConversationsScreen, add manual test:
console.log("Testing refresh manually...");
refreshConversationList();
```

**4. Check Network State:**

```typescript
// Add to useEffect:
NetInfo.fetch().then((state) => {
  console.log("Current network state:", state);
});
```

**5. Verify Firestore Connection:**

- Check Firebase Console for active connections
- Ensure Firestore rules allow reads

---

## 📈 Performance Benchmarks

**Target Metrics:**

- Network detect to refresh trigger: <100ms
- Refresh to UI update: <2 seconds
- Memory usage: No increase
- CPU usage: Negligible spike

**How to Measure:**

```typescript
// Add timing logs:
const startTime = Date.now();
await refreshConversationList();
console.log(`Refresh took ${Date.now() - startTime}ms`);
```

---

## ✅ Test Results Template

Copy and fill this out after testing:

```
## Test Results - [Date]

**Tester:** [Your Name]
**Device:** [iPhone 14 Pro / Pixel 7 / etc.]
**OS:** [iOS 17.2 / Android 14 / etc.]
**Network:** [Wi-Fi / Cellular / etc.]

### Test 1: Airplane Mode ✅❌
- Result:
- Time to update:
- Notes:

### Test 2: Wi-Fi Disconnect ✅❌
- Result:
- Time to update:
- Notes:

### Test 3: Cellular → Wi-Fi ✅❌
- Result:
- Notes:

### Test 4: Network Drop ✅❌
- Result:
- Messages received:
- Notes:

### Test 5: Rapid Reconnects ✅❌
- Result:
- Issues:
- Notes:

### Test 6: Background → Foreground ✅❌
- Result:
- Still works:
- Notes:

### Test 7: Pull-to-Refresh ✅❌
- Result:
- Still works:
- Notes:

### Overall Assessment:
- Pass/Fail:
- Issues found:
- Recommendations:
```

---

## 🚀 Ready to Test!

**Run the app:**

```bash
cd /Users/yahavcorcos/Desktop/whisper-app
npx expo start
```

**Start with Test 1 (Airplane Mode)** - This is the primary use case!

Good luck! 🎯
