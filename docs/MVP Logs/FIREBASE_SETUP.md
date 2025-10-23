# Firebase Setup Instructions

This document explains how to deploy Firebase security rules and set up your Firebase project.

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created (see main README.md)
3. `.env` file configured with Firebase credentials

## Initial Setup

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase Project

```bash
firebase use --add
```

Select your Firebase project (`whisper-app-aa915`) and give it an alias (e.g., `default`).

## Deploy Security Rules

### Deploy All Rules

```bash
firebase deploy --only firestore:rules,storage:rules,database:rules
```

### Deploy Individual Rules

```bash
# Firestore rules only
firebase deploy --only firestore:rules

# Storage rules only
firebase deploy --only storage:rules

# Realtime Database rules only
firebase deploy --only database:rules
```

## Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## Deploy Cloud Functions (PR #8)

```bash
# Install function dependencies first
cd functions
npm install
cd ..

# Deploy functions
firebase deploy --only functions
```

## Test with Emulators (Optional)

You can test your rules locally before deploying:

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only auth,firestore,database,storage
```

Then update your `.env` to point to emulators (see Firebase docs).

## Security Rules Overview

### Firestore Rules (`firestore.rules`)

- **Users**: Read by all authenticated users, write only by owner
- **Conversations**: Read/write only by conversation members
- **Messages**: Read/write only by conversation members

### Storage Rules (`storage.rules`)

- **Profile Pictures**: Read by all, write only by owner (max 10MB)
- **Message Media**: Read by all authenticated, write by sender (max 10MB)
- **Thumbnails**: Read by all, write only by Cloud Functions

### Realtime Database Rules (`database.rules.json`)

- **Presence**: Each user can only write their own presence
- **Typing**: Each user can only write their own typing status in conversations

## Firestore Indexes

Two composite indexes are created:

1. **Conversations by member and updatedAt**: For fetching user's conversations sorted by most recent
2. **Messages by conversationId and timestamp**: For paginated message fetching

## Verify Deployment

After deploying, verify in Firebase Console:

1. **Firestore**: Go to Firestore Database → Rules tab
2. **Storage**: Go to Storage → Rules tab
3. **Realtime Database**: Go to Realtime Database → Rules tab
4. **Indexes**: Go to Firestore Database → Indexes tab

## Troubleshooting

### "Permission denied" errors

- Ensure you're logged in: `firebase login`
- Check you've selected the correct project: `firebase use`
- Verify your Firebase project permissions in the Console

### Index not found errors

- Deploy indexes: `firebase deploy --only firestore:indexes`
- Wait 1-2 minutes for indexes to build
- Check index status in Firebase Console

### Rules validation errors

- Test rules syntax: `firebase deploy --only firestore:rules --dry-run`
- Check Firebase Console for detailed error messages

## Next Steps

After deploying rules:

1. Test authentication (PR #3)
2. Test creating conversations (PR #4)
3. Test sending messages (PR #5)

## Important Notes

- ⚠️ **Test mode rules expire in 30 days** - deploy production rules before launch
- 🔒 **Never deploy test mode rules to production**
- 📊 **Monitor rule evaluations** in Firebase Console Analytics
- 🚀 **Deploy rules before deploying app updates** that rely on them

---

For more information, see the [Firebase Security Rules documentation](https://firebase.google.com/docs/rules).




