# 🔥 Firebase Verification Guide

Use this checklist to verify your Firebase setup is complete and working.

---

## 1️⃣ Firebase Console Verification

### Authentication

🔗 https://console.firebase.google.com/project/whisper-app-aa915/authentication/users

**Check:**

- [ ] **Sign-in method** tab shows **Email/Password** as **Enabled**
- [ ] No users yet (will be created when you test signup in PR #3)

---

### Firestore Database

🔗 https://console.firebase.google.com/project/whisper-app-aa915/firestore

**Check:**

- [ ] Database is **created and active**
- [ ] **Rules** tab shows production rules (not test mode)
- [ ] Rules start with: `rules_version = '2';`
- [ ] **Indexes** tab shows 2 composite indexes:
  - `conversations`: `members` + `updatedAt`
  - `messages`: `conversationId` + `timestamp`
- [ ] Index status: **Enabled** (or **Building**, which is normal)

---

### Realtime Database

🔗 https://console.firebase.google.com/project/whisper-app-aa915/database

**Check:**

- [ ] Database is **created and active**
- [ ] Database URL matches your `.env` file
- [ ] **Rules** tab shows custom rules (not default)
- [ ] Rules include `presence` and `typing` paths

---

### Storage

🔗 https://console.firebase.google.com/project/whisper-app-aa915/storage

**Status:** ⏭️ **Disabled** (requires Blaze plan upgrade)

**Check:**

- [ ] You're aware Storage is disabled
- [ ] You've read `STORAGE_DISABLED.md`
- [ ] You understand profile pictures and image messaging won't work yet

---

## 2️⃣ App Verification

### Firebase Initialization Logs

Open your **Expo Go app** on your phone and check the console logs in your terminal or the app's debug panel.

**Expected logs:**

```
✅ Firebase configuration validated
✅ Firebase app initialized
✅ Firebase Auth initialized
✅ Firestore initialized with offline persistence
✅ Realtime Database initialized
✅ Storage initialized
```

**If you see these, Firebase is connected!** ✅

---

### Test Firebase Connection (Optional)

You can test the connection by temporarily adding this to your app:

1. Open `src/screens/AuthScreen.tsx`
2. Add a test button that calls:

```typescript
import { firebaseAuth } from "../lib/firebase";
console.log("Auth instance:", firebaseAuth);
```

3. You should see the Auth instance logged without errors

---

## 3️⃣ Firebase CLI Verification

Run these commands in your terminal:

### Check Firebase version

```bash
firebase --version
```

**Expected:** `14.19.1` or higher ✅

### Check logged in user

```bash
firebase login:list
```

**Expected:** Your email address ✅

### Check current project

```bash
firebase use
```

**Expected:** `whisper-app-aa915` ✅

### Verify deployed rules

```bash
firebase deploy --only firestore:rules,database:rules --dry-run
```

**Expected:** No errors, shows what would be deployed ✅

---

## 4️⃣ Environment Variables Verification

Check your `.env` file has all required variables:

```bash
# Required for all features
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=whisper-app-aa915.firebaseapp.com
FIREBASE_PROJECT_ID=whisper-app-aa915
FIREBASE_STORAGE_BUCKET=whisper-app-aa915.appspot.com
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_DATABASE_URL=https://whisper-app-aa915-default-rtdb.firebaseio.com

# App versioning
APP_STATE_SCHEMA_VERSION=1
```

**Critical:** Make sure `FIREBASE_DATABASE_URL` matches the URL shown in your Realtime Database Console!

---

## 5️⃣ Files Created/Modified

### New Files ✅

- [ ] `.firebaserc` — Project connection config
- [ ] `FIREBASE_DEPLOYMENT_SUMMARY.md` — Deployment documentation
- [ ] `FIREBASE_VERIFICATION.md` — This file
- [ ] `STORAGE_DISABLED.md` — Storage limitations doc

### Firebase Configuration Files ✅

- [ ] `firebase.json` — Firebase services config
- [ ] `firestore.rules` — Firestore security rules
- [ ] `firestore.indexes.json` — Composite indexes
- [ ] `database.rules.json` — Realtime Database rules
- [ ] `storage.rules` — Storage rules (not deployed)

### App Files ✅

- [ ] `src/lib/firebase.ts` — Firebase SDK initialization

---

## 6️⃣ Security Rules Verification

### Test Firestore Rules (Optional)

You can test your rules in the Firebase Console:

1. Go to **Firestore** → **Rules** tab
2. Click **Rules Playground**
3. Test these scenarios:

**Scenario 1: Unauthenticated user tries to read users**

```
Collection: /users
Document: test-user-id
Mode: get
Authenticated: NO
Expected: ❌ Access denied
```

**Scenario 2: Authenticated user reads users**

```
Collection: /users
Document: test-user-id
Mode: get
Authenticated: YES
Expected: ✅ Access granted
```

---

## 7️⃣ Final Checklist

Before moving to PR #3:

### Firebase Console

- [ ] Authentication enabled
- [ ] Firestore Database created
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed (or building)
- [ ] Realtime Database created
- [ ] Realtime Database rules deployed

### Local Setup

- [ ] Firebase CLI installed
- [ ] Logged in to Firebase
- [ ] Project connected (`.firebaserc` exists)
- [ ] `.env` file configured with all variables
- [ ] App runs without Firebase errors

### App Connection

- [ ] Expo Go app loads successfully
- [ ] Firebase initialization logs appear
- [ ] No "Missing configuration" errors
- [ ] No "Permission denied" errors

---

## ✅ Verification Complete!

If all items above are checked, your Firebase backend is **fully configured and ready**!

You can now proceed to **PR #3: Authentication** where you'll implement:

- User signup with email/password
- User login with email/password
- Auth state management and persistence
- Route guarding based on auth state
- User profile creation in Firestore

---

## 🐛 Troubleshooting

### "Missing Firebase configuration" error

- Check your `.env` file has all variables
- Restart Expo: `npx expo start --clear`
- Verify environment variables are loaded in `app.config.ts`

### "Permission denied" in Firestore

- Verify rules are deployed: Check Firestore → Rules tab
- Re-deploy rules: `firebase deploy --only firestore:rules`
- Check you're authenticated in the app

### "Database URL not found" error

- Copy URL from Realtime Database Console
- Update `.env` file with correct URL
- Restart Expo: `npx expo start --clear`

### Indexes not working

- Wait 1-5 minutes for indexes to build
- Check status in Firestore → Indexes tab
- If stuck, try re-deploying: `firebase deploy --only firestore:indexes`

---

**Need help?** Check the detailed guides:

- `FIREBASE_COMPLETE_SETUP.md` — Full setup instructions
- `FIREBASE_DEPLOYMENT_SUMMARY.md` — What was deployed
- `STORAGE_DISABLED.md` — Storage limitations

**Ready to code?** Move on to PR #3! 🚀




