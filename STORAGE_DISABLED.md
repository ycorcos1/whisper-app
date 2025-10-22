# Storage Features Disabled (Free Plan Limitation)

Firebase Storage is not available on the Spark (free) plan for this project.

## Features Affected

### Currently Disabled

- ❌ Profile picture uploads
- ❌ Image messaging
- ❌ Thumbnail generation (Cloud Functions)

### Still Working

- ✅ Text messaging
- ✅ Conversations
- ✅ User authentication
- ✅ Real-time typing indicators
- ✅ Presence status
- ✅ Read receipts
- ✅ All other app features

## Workarounds

### For Testing/Development

You can still build and test all features except media:

- Profile pictures will show as initials/placeholders
- Image message button can be hidden or disabled

### Implementation Notes

The app code includes Storage initialization, but it won't be used:

**In `src/lib/firebase.ts`:**

```typescript
// Storage is initialized but won't be used without Firebase Storage enabled
storage = getStorage(app);
```

**In future PRs:**

- PR #8 (Image Messaging): Skip implementation or make conditional
- PR #9 (User Profiles): Use placeholder avatars instead of uploads

## When You Upgrade

Once you upgrade to the Blaze (pay-as-you-go) plan:

1. Enable Storage in Firebase Console
2. Deploy Storage rules:
   ```bash
   firebase deploy --only storage:rules
   ```
3. Uncomment/enable image upload features in the app
4. Deploy Cloud Functions for thumbnail generation (PR #8)

## Storage Rules (Ready for Future Use)

The `storage.rules` file is already created and ready to deploy when you enable Storage.

---

**Note:** The app will work perfectly for text-based messaging without Storage enabled.




