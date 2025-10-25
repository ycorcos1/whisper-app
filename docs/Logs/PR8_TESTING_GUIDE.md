# PR #8 Testing Guide - Image Messaging

## 🚀 Quick Start

### Prerequisites

- Firebase Storage enabled in Firebase Console
- Storage rules deployed
- Cloud Functions dependencies installed

### Deployment Steps

```bash
# 1. Install function dependencies
cd functions
npm install
cd ..

# 2. Build functions
cd functions
npm run build
cd ..

# 3. Deploy storage rules
firebase deploy --only storage

# 4. Deploy cloud functions
firebase deploy --only functions
```

---

## ✅ Test Checklist

### Test 1: Basic Image Upload ⭐ **Most Important**

1. Open any chat conversation
2. Tap the 📷 camera button
3. Grant media library permission if prompted
4. Select an image
5. **Verify:**
   - Upload progress bar shows percentage
   - Image appears in chat after upload
   - Message has delivery status indicator

### Test 2: Thumbnail Generation

1. Send an image (Test 1)
2. Wait 5 seconds
3. Check Firebase Console Storage:
   - `message_media/{cid}/{mid}_thumb.jpg` should exist
4. Reload chat
5. **Verify:** Image loads faster (using thumbnail)

### Test 3: Full-Screen Viewer

1. Tap any image in chat
2. **Verify:**
   - Full-screen modal opens
   - Close button (✕) appears
   - Tap close button returns to chat

### Test 4: Error Handling

1. Try uploading a large file (>10MB)
2. **Verify:** Error alert appears

### Test 5: Group Chat Images

1. Open a group chat
2. Send an image
3. **Verify:** Image displays correctly in group context

---

## 🔍 What to Look For

### ✅ Success Indicators

- Images upload with progress indicator
- Images display in message bubbles
- Tap image opens full-screen viewer
- Thumbnails generate within 5 seconds
- Status indicators show (sent/delivered/read)

### ❌ Issues to Report

- Upload fails silently
- Images don't display
- Thumbnails never generate
- Full-screen viewer doesn't open
- App crashes on image selection

---

## 🐛 Common Issues & Solutions

### Issue: "Permission denied"

**Solution:** Grant media library permission in device settings

### Issue: Thumbnails not generating

**Solution:**

1. Check Cloud Function logs: `firebase functions:log`
2. Verify function is deployed: `firebase functions:list`
3. Check Storage rules are deployed

### Issue: Upload progress stuck at 0%

**Solution:** Check internet connection and Firebase Storage configuration

---

## 📱 Device Testing

Test on both:

- ✅ iOS Simulator/Device
- ✅ Android Emulator/Device

Verify:

- Image picker permissions work
- Upload progress displays correctly
- Images render with proper aspect ratio
- Full-screen viewer works smoothly

---

## 🎯 Acceptance Criteria

PR #8 is ready to merge when:

- ✅ Users can pick and send images
- ✅ Images display in chat messages
- ✅ Thumbnails generate automatically
- ✅ Full-screen viewer works
- ✅ Error handling provides clear feedback
- ✅ No linter errors or TypeScript issues
- ✅ Works in both DM and group chats

---

## 📞 Need Help?

If you encounter issues:

1. Check `firebase functions:log` for Cloud Function errors
2. Verify Storage rules: `firebase deploy --only storage`
3. Rebuild functions: `cd functions && npm run build`
4. Restart Expo: `r` in terminal or close and reopen app

---

**Status:** Ready for testing and deployment! 🚀
