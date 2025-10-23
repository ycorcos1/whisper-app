# Typing Indicator Debug Guide

**Issue:** Typing indicator not appearing when other user types

---

## 🔍 Debugging Steps

I've added comprehensive console logging to help diagnose the issue. Follow these steps:

### Step 1: Test with Two Devices

1. **Device 1:** Login as User A, open chat with User B
2. **Device 2:** Login as User B, open chat with User A

### Step 2: Check Console Logs on Device 2 (the one typing)

When you start typing on Device 2, you should see:

```
✍️ Set typing status for [userId] in [conversationId]: true
```

**If you DON'T see this:**

- The `handleTyping()` function is not being called
- Check that the text input's `onChangeText` is wired correctly
- Issue is in ChatScreen.tsx

**If you DO see this:**

- The typing status is being written to RTDB ✅
- Problem is on the receiving end (Device 1)

### Step 3: Check Console Logs on Device 1 (receiving)

When Device 2 types, you should see on Device 1:

```
📝 Typing data received: { [userId]: true }
👤 User [userId]: isTyping=true, shouldInclude=true, currentUser=[differentUserId]
✅ Typing users array: [ { userId: '[userId]', isTyping: true } ]
🔔 Typing users updated: [ { userId: '[userId]', isTyping: true } ]
🔔 Number of typing users: 1
```

**If you see:**

```
❌ No typing data
```

- RTDB subscription is working but no data is being received
- Possible RTDB rules issue (read permission denied)
- Check Firebase Console → Realtime Database → Rules

**If you see:**

```
📝 Typing data received: { [userId]: false }
```

- Data is being written but as `false` instead of `true`
- Issue with `setTyping()` function logic

**If you see:**

```
👤 User [userId]: isTyping=true, shouldInclude=false, currentUser=[userId]
```

- The userId is the same (you're seeing your own typing)
- Issue: Both devices are using the same account
- Make sure you're logged in as different users

### Step 4: Visual Debug

You should see a **red banner** with yellow text saying "DEBUG: 1 user(s) typing" when the indicator should appear.

**If you DON'T see the red banner:**

- `typingUsers.length` is not > 0
- The array is empty even though typing data exists
- Check the console logs from Step 3

**If you DO see the red banner:**

- The conditional rendering is working ✅
- Issue is with the TypingIndicator component itself
- Check component styling (might be rendering off-screen)

---

## 🚨 Common Issues

### Issue 1: RTDB Rules Not Configured

**Symptoms:**

- No error in console when writing
- No data received on other device
- Console shows: `❌ No typing data`

**Solution:**

Go to Firebase Console → Realtime Database → Rules and add:

```json
{
  "rules": {
    "typing": {
      "$conversationId": {
        "$uid": {
          ".read": true,
          ".write": "$uid === auth.uid"
        }
      }
    },
    "presence": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

Then click "Publish"

### Issue 2: Same User on Both Devices

**Symptoms:**

- Console shows: `shouldInclude=false`
- Console shows: `currentUser=[userId]` matches the typing userId

**Solution:**

- Logout on one device
- Login with a different account
- Create a conversation between the two accounts

### Issue 3: Different Conversation IDs

**Symptoms:**

- Device 2 writes to `typing/abc123/user1`
- Device 1 subscribes to `typing/xyz456/user2`
- No data received

**Solution:**

- Both users must be in the SAME conversation
- Check console logs for conversationId
- Verify both devices show the same conversationId

### Issue 4: Network/Emulator Issues

**Symptoms:**

- Intermittent connection
- Delayed updates
- No logs appearing

**Solution:**

```bash
# Restart expo
npm start -- --clear

# Check Firebase connection
# Look for: ✅ Realtime Database initialized
```

---

## 📊 Expected Console Output

### Device 2 (Typing):

```
✍️ Set typing status for user123 in conv456: true
✍️ Set typing status for user123 in conv456: true
✍️ Set typing status for user123 in conv456: true
[After 2s of no typing]
✍️ Set typing status for user123 in conv456: false
```

### Device 1 (Receiving):

```
📝 Typing data received: null
❌ No typing data
🔔 Typing users updated: []
🔔 Number of typing users: 0

[When Device 2 starts typing]
📝 Typing data received: { user123: true }
👤 User user123: isTyping=true, shouldInclude=true, currentUser=user789
✅ Typing users array: [ { userId: 'user123', isTyping: true } ]
🔔 Typing users updated: [ { userId: 'user123', isTyping: true } ]
🔔 Number of typing users: 1
DEBUG: 1 user(s) typing  [RED BANNER VISIBLE]

[After 2s]
📝 Typing data received: { user123: false }
👤 User user123: isTyping=false, shouldInclude=false, currentUser=user789
✅ Typing users array: []
🔔 Typing users updated: []
🔔 Number of typing users: 0
[RED BANNER DISAPPEARS]
```

---

## 🔧 Firebase Console Checks

### 1. Check Realtime Database Data

1. Open Firebase Console
2. Go to Realtime Database
3. Look for data structure:

   ```
   typing/
     └── [conversationId]/
           └── [userId]: true/false
   ```

4. When Device 2 types, you should see the value change to `true` in real-time

### 2. Check Rules

Click on "Rules" tab, should show:

```json
{
  "rules": {
    "typing": {
      ".read": true,
      ".write": true
    }
  }
}
```

Or more restrictive:

```json
{
  "rules": {
    "typing": {
      "$conversationId": {
        "$uid": {
          ".read": true,
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

---

## ✅ Success Checklist

Once working, you should see:

- [ ] Device 2: Console shows `✍️ Set typing status` when typing
- [ ] Device 1: Console shows `📝 Typing data received` with data
- [ ] Device 1: Console shows `✅ Typing users array` with 1 user
- [ ] Device 1: Red DEBUG banner appears
- [ ] Device 1: Typing indicator with animated dots appears
- [ ] Indicator disappears after Device 2 stops typing (2s delay)

---

## 🧹 Cleanup

Once the typing indicator is working, **remove the debug code**:

### 1. Remove Console Logs

In `useTypingIndicator.ts`, remove all `console.log()` statements

### 2. Remove Debug Banner

In `ChatScreen.tsx`, remove:

```tsx
<Text style={{ padding: 10, color: "yellow", backgroundColor: "red" }}>
  DEBUG: {typingUsers.length} user(s) typing
</Text>
```

Keep only:

```tsx
{
  typingUsers.length > 0 && (
    <TypingIndicator
      isTyping={true}
      userName={
        conversation?.type === "dm"
          ? displayTitle
          : typingUsers.length === 1
          ? senderNames[typingUsers[0].userId]
          : undefined
      }
    />
  );
}
```

---

## 🆘 Still Not Working?

**Share these details:**

1. Console output from Device 1 (receiving)
2. Console output from Device 2 (typing)
3. Screenshot of Firebase RTDB data structure
4. Screenshot of Firebase RTDB rules
5. Are you testing with 2 different user accounts?
6. What's the conversationId you're testing with?

---

**Debug mode enabled:** Run the app now and check console logs! 🚀
