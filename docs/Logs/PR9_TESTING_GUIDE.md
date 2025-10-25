# PR #9 Testing Guide

**Quick testing checklist for User Profiles + Avatars**

---

## 🧪 Essential Tests

### ✅ Test 1: Upload Avatar

1. Go to Profile tab
2. Tap avatar or "Upload Profile Picture"
3. Select image
4. **Verify:** Progress bar → Success alert → Image appears

### ✅ Test 2: Avatar Displays

1. Upload avatar (Test 1)
2. Go to Conversations tab
3. **Verify:** Avatar shows in your DM conversations
4. Open a chat
5. **Verify:** Other user's avatar in header

### ✅ Test 3: Initials Fallback

1. Create account without uploading avatar
2. **Verify:** Colored initials show in:
   - Profile screen (large)
   - Conversations list (medium)
   - Chat header (small)

### ✅ Test 4: Real-Time Sync

**Two devices:**

1. Device A: Upload new avatar
2. Device B: View conversation with that user
3. **Verify:** Avatar updates immediately on Device B

---

## 🐛 Edge Cases

### Test 5: Error Handling

- Cancel image picker → No error
- Deny permission → Clear error message
- Upload large file (>10MB) → Size limit error

### Test 6: Groups

- Create group chat
- **Verify:** Group initials (not personal avatars)
- No avatar in group chat header

---

## ✅ Success Criteria

All tests pass:

- ✅ Avatar upload works
- ✅ Displays in all screens
- ✅ Initials fallback works
- ✅ Real-time sync functional
- ✅ Errors handled gracefully

**Merge when all green!** 🎉
