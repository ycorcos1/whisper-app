# Whisper

A production-ready mobile messaging app built with React Native (Expo Go) and Firebase.

## 🔑 Run This App Locally (No Access to Private .env Needed)

Follow these steps to run Whisper end-to-end on your own device using your own Firebase project. This takes ~10 minutes and requires no access to private credentials.

### 1) Prerequisites

- Node.js 20+
- npm (or yarn)
- Expo CLI: `npm i -g expo-cli`
- Expo Go on your iOS/Android phone
- macOS users: install Watchman to avoid file watcher issues: `brew install watchman`

### 2) Clone and install

```bash
git clone <your-fork-or-this-repo>
cd whisper-app
npm install
```

### 3) Create a Firebase project and app (Console)

1. Go to the Firebase Console (`https://console.firebase.google.com`)
2. Create a new project (any name)
3. Add a Web App to the project (no hosting required) and copy its config values
4. Enable the following services in the Console:
   - Authentication → Sign-in method → Email/Password: Enable
   - Firestore Database → Create database (Production mode)
   - Realtime Database → Create database (Production mode)
   - Storage → Get started (enable the default bucket)
5. Recommended: Keep the Firebase Console open for quick checks

### 4) Create your .env

Create a file named `.env` in the project root with the values from your Firebase Web App:

```bash
# .env
FIREBASE_API_KEY=YOUR_API_KEY
FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
FIREBASE_APP_ID=YOUR_APP_ID
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com

# Optional (kept for app state migrations; safe default)
APP_STATE_SCHEMA_VERSION=1
```

Notes:

- All fields above are required by the app at startup. Missing any will cause a clear validation error.
- Storage must be enabled in the Console to prevent initialization errors, even if you don’t upload media yet.

### 5) Deploy security rules (recommended)

Install the Firebase CLI if you don’t have it: `npm i -g firebase-tools`

```bash
# Login and select your project
firebase login
firebase use --add   # choose the project you created

# From the project root, deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,database:rules
```

This deploys production-grade rules for users, conversations, messages, and presence.

### 6) Start the app with Expo Go

```bash
npm start
```

Then:

- Scan the QR code with Expo Go on your device
- Create two test accounts via the app (email/password)
- Start a new chat (New Chat) and send messages between the two accounts
- Try swipe-to-delete and multi-select deletion in Conversations

If the QR code isn’t visible, press `c` in the terminal to toggle, or use the “Tunnel” connection option in the Expo Dev Tools.

---

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Add a Web App to your project
4. Copy the configuration values to your `.env` file:

   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `FIREBASE_DATABASE_URL`

5. Enable the following Firebase services:

   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Realtime Database**
   - **Cloud Storage** (enable the default bucket)
   - **Cloud Functions** (optional for image thumbnails)

6. (Recommended) Deploy project rules and indexes from this repo (see steps above under “Deploy security rules”).

## 📱 Running the App

### iOS Simulator (macOS only)

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Expo Go (Mobile Device)

1. Install Expo Go on your iOS or Android device
2. Scan the QR code from the terminal after running `npm start`

## 🧭 App Walkthrough

### Authentication (PR #3)

- Email/password signup, login, and logout using Firebase Auth
- Session persistence via `initializeAuth` with React Native `AsyncStorage`
- User-friendly error alerts, no console error spam for invalid credentials

### Conversations (PR #4)

- Real-time list of your conversations from Firestore
- Start new direct messages by searching users by email (case-insensitive via `emailLower`)
- Display names resolved from user profiles; falls back to email or UID
- Timestamps show hour:minute only for consistency
- Consistent tab icons (💬 Conversations, 👤 Profile)
- Delete options:
  - Swipe a conversation to delete it
  - Select mode: tap “Select” in the header, choose multiple threads, tap “Delete”, then “Done” to exit

### Presence (UI hook)

- Presence badge UI is wired for future Realtime Database presence; rules are included. Live presence will be added in a later PR.

## 🏗️ Project Structure

## 🏗️ Project Structure

```
whisper-app/
├── docs/                    # Product documentation
│   ├── Whisper_MVP_Final_PRD.md
│   ├── Whisper_MVP_Final_Task_List.md
│   └── Whisper_App_Design_Spec.md
├── src/
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Screen components
│   ├── theme/               # Design system
│   ├── features/            # Feature modules (conversations, etc.)
│   ├── lib/                 # Firebase initialization and shared SDK exports
│   └── state/               # Auth context and hooks
├── memory/                  # Development context tracking
├── scripts/                 # Build and validation scripts
├── .github/workflows/       # CI/CD configuration
└── [configuration files]
```

## 📋 Available Scripts

- `npm start` — Start Expo development server
- `npm run ios` — Run on iOS simulator
- `npm run android` — Run on Android emulator
- `npm run predev` — Validate environment variables
- `npm run verify` — Run tests (Jest)
- `npm run type-check` — TypeScript type checking
- `npm run lint` — Run ESLint

## 🧪 Testing

```bash
npm test
```

Tests are added incrementally after each feature PR. Initial setup uses `jest --passWithNoTests` to avoid blocking development.

## 📖 Documentation

All product requirements, task breakdowns, and design specifications are in the `/docs` folder:

- **PRD:** Complete product requirements and Firebase structure
- **Task List:** PR-by-PR implementation roadmap
- **Design Spec:** Visual design system and UI guidelines

## 🎯 Development Roadmap

This project follows a structured PR-based development approach:

- ✅ **PR #1** — Repo Scaffolding + Navigation + Env Protocol
- ✅ **PR #2** — Firebase Wiring
- ✅ **PR #3** — Authentication
- ✅ **PR #4** — Conversations
- ✅ **PR #5** — Messaging Core + Optimistic UI
- ✅ **PR #6** — Presence & Typing
- ✅ **PR #7** — Delivery States + Read Receipts
- ⏳ **PR #8** — Image Messaging
- ⏳ **PR #9** — User Profiles + Avatars
- ✅ **PR #10** — Group Chats
- ✅ **PR #11** — In-App Notifications
- ✅ **PR #12** — Persistence Hardening
- ✅ **PR #13** — Testing & CI Verification
- ✅ **PR #14** — Emulator Runbook + Final QA

## 🎨 Design System

### Colors

- **Primary:** Deep Twilight (#1B1325), Amethyst Glow (#9C7AFF)
- **Accents:** Lavender Haze (#C7B8FF), Silver Mist (#C9C9D1)

### Typography

- **Font:** System (Inter/SF Pro on iOS, Roboto on Android)
- **Scale:** 11px → 13px → 15px → 17px → 20px → 24px → 30px → 36px

## 🔐 Security

- All Firebase rules follow least-privilege principle
- Environment variables never committed to repository
- Offline persistence enabled for reliability
- Message encryption planned for post-MVP

## 🛠️ Troubleshooting

- EMFILE: too many open files (macOS): install Watchman `brew install watchman`
- Expo QR not visible: press `c` to toggle QR or use Tunnel in Dev Tools
- Dependency conflicts: try a clean install `rm -rf node_modules package-lock.json && npm install`
- Missing `babel-preset-expo`: ensure it’s in devDependencies and reinstall
- Firebase Storage not set up: enable Storage in the Console (avoid init errors)
- Type errors after edits: run `npm run type-check` and `npm run lint`

## ❓FAQ

- Do I need your private credentials? No. Create your own Firebase project and fill `.env` using the Web App config.
- Can I run on iOS/Android simulators? Yes. Use `npm run ios` or `npm run android` if you have Xcode/Android Studio set up. Otherwise, Expo Go on device works great.
- Do I need Firebase emulators? Not required for the mobile app. You can use emulators for rules testing from the CLI if desired.

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. For questions or suggestions, please contact the project owner.

---

**Built with ❤️ using React Native, Expo, and Firebase**
