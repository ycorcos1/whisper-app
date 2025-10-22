# Firebase Complete Setup Checklist

This guide ensures all Firebase services are properly configured before starting PR #3.

---

## Part 1: Firebase Console Setup (Manual Steps)

### 1. Enable Authentication (Email/Password)

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get Started** (if not already enabled)
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Enable **Email/Password** (first toggle)
6. Leave **Email link (passwordless sign-in)** disabled
7. Click **Save**

✅ **Expected Result:** Email/Password should show as "Enabled"

---

### 2. Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll deploy production rules next)
4. Select a location (e.g., `us-central1` or closest to your users)
5. Click **Enable**

✅ **Expected Result:** Empty Firestore database with these collections ready:

- `users/` (will be created when first user signs up)
- `conversations/` (will be created when first conversation is made)

---

### 3. Create Realtime Database

1. Go to **Build** → **Realtime Database**
2. Click **Create Database**
3. Choose a location (should match Firestore location)
4. Choose **Start in locked mode** (we'll deploy rules next)
5. Click **Enable**

✅ **Expected Result:** Empty Realtime Database at:

```
https://whisper-app-aa915-default-rtdb.firebaseio.com/
```

**⚠️ IMPORTANT:** Copy this URL and verify it matches your `.env` file:

```
FIREBASE_DATABASE_URL=https://whisper-app-aa915-default-rtdb.firebaseio.com
```

---

### 4. Verify Storage Bucket

1. Go to **Build** → **Storage**
2. Click **Get started**
3. Choose **Start in test mode** (we'll deploy production rules next)
4. Choose same location as Firestore
5. Click **Done**

✅ **Expected Result:** Storage bucket created at:

```
gs://whisper-app-aa915.appspot.com
```

This should match your `.env` file:

```
FIREBASE_STORAGE_BUCKET=whisper-app-aa915.appspot.com
```

---

## Part 2: Deploy Security Rules via CLI

Now deploy your production-ready security rules:

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open your browser for authentication.

### 3. Initialize Your Project

```bash
cd /Users/yahavcorcos/Desktop/whisper-app
firebase use --add
```

- Select: `whisper-app-aa915`
- Alias: `default`

✅ **Expected Result:** A `.firebaserc` file is created with your project ID

### 4. Deploy All Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules,database:rules
```

✅ **Expected Output:**

```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/whisper-app-aa915/overview
```

### 5. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

✅ **Expected Output:**

```
✔ Deploy complete!
```

---

## Part 3: Verify Everything in Console

### 1. Verify Firestore Rules

1. Go to **Firestore Database** → **Rules** tab
2. Should see rules starting with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
```

### 2. Verify Storage Rules

1. Go to **Storage** → **Rules** tab
2. Should see rules starting with:

```
rules_version = '2';
service firebase.storage {
```

### 3. Verify Realtime Database Rules

1. Go to **Realtime Database** → **Rules** tab
2. Should see:

```json
{
  "rules": {
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "typing": {
      "$conversationId": {
        "$uid": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

### 4. Verify Firestore Indexes

1. Go to **Firestore Database** → **Indexes** tab
2. Should see 2 composite indexes (they may be "Building" for a few minutes):
   - **conversations**: `members` (Array) + `updatedAt` (Descending)
   - **messages**: `conversationId` (Ascending) + `timestamp` (Descending)

---

## Part 4: Test Firebase Connection

Run this command to test your app connects to Firebase:

```bash
cd /Users/yahavcorcos/Desktop/whisper-app
npx expo start --clear
```

Then scan the QR code and check your terminal for:

✅ **Expected Console Logs:**

```
✅ Firebase configuration validated
✅ Firebase app initialized
✅ Firebase Auth initialized
✅ Firestore initialized with offline persistence
✅ Realtime Database initialized
✅ Storage initialized
```

---

## Complete Checklist

Before moving to PR #3, verify all these are complete:

### Firebase Console

- [ ] Authentication: Email/Password provider enabled
- [ ] Firestore Database: Created and active
- [ ] Realtime Database: Created with correct URL in `.env`
- [ ] Storage: Bucket created and active

### Security Rules Deployed

- [ ] Firestore rules deployed (check Rules tab)
- [ ] Storage rules deployed (check Rules tab)
- [ ] Realtime Database rules deployed (check Rules tab)
- [ ] Firestore indexes deployed (check Indexes tab)

### Environment Variables

- [ ] `.env` file has all Firebase values
- [ ] `FIREBASE_DATABASE_URL` matches Realtime Database URL
- [ ] `FIREBASE_STORAGE_BUCKET` matches Storage bucket

### App Connection

- [ ] App starts without Firebase errors
- [ ] All Firebase services log "✅ initialized"
- [ ] No missing configuration errors in console

---

## Troubleshooting

### "Permission denied" when deploying rules

**Solution:**

```bash
firebase login --reauth
firebase use whisper-app-aa915
```

### Indexes stuck on "Building"

**Normal!** Composite indexes can take 1-5 minutes to build. They'll work once status changes to "Enabled".

### "Database URL not found" error

1. Go to Realtime Database in Console
2. Copy the URL from the top of the page
3. Update your `.env` file:

```
FIREBASE_DATABASE_URL=https://your-actual-url.firebaseio.com
```

4. Restart Expo: `npx expo start --clear`

---

## After Setup is Complete

Once all checkboxes above are checked:

✅ **Your Firebase backend is fully configured!**

You're ready to proceed to **PR #3: Authentication** where we'll implement:

- User signup and login
- Auth state management
- Route guarding
- User profile creation

---

**Questions or Issues?** Check the Firebase Console for any error messages or warnings.
