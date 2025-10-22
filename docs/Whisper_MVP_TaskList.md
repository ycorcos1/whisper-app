# Whisper — MVP Final Task List (CollabCanvas Format)

## 🧭 Overview

This document defines the full execution plan for the **Whisper** MVP — a production-ready mobile messaging app built using **React Native (Expo Go + TypeScript)** and **Firebase (Auth, Firestore, RTDB, Storage, Functions)**.

It should be used together with:

- `/docs/Whisper_MVP_Final_PRD.md` – Product Requirements and Technical Specifications
- `/docs/Whisper_App_Design_Spec.md` – Visual Design System and UI Behavior
- `/docs/Cursor_Bootstrap_Prompt.md` – Cursor setup and initialization instructions

**Goal:** Deliver an offline-capable, real-time chat app (one-on-one and group messaging) with message persistence, presence, image support, optimistic UI, and CI-backed verification.

---

## 📁 Repository Structure

```
whisper/
│
├── app.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── /src
│   ├── /screens
│   │   ├── AuthScreen.tsx
│   │   ├── ConversationsScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── NewChatScreen.tsx
│   ├── /components
│   │   ├── Banner.tsx
│   │   ├── PresenceBadge.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── FullImageModal.tsx
│   ├── /features
│   │   ├── /auth
│   │   ├── /conversations
│   │   ├── /messages
│   │   ├── /profiles
│   │   └── /presence
│   ├── /lib
│   │   ├── firebase.ts
│   │   └── storageUtils.ts
│   ├── /state
│   ├── /hooks
│   └── /utils
│
├── /memory
│   ├── active_context.md
│   └── progress.md
│
├── /functions
│   └── src/index.ts
│
├── /docs
│   ├── Whisper_MVP_Final_PRD.md
│   ├── Whisper_App_Design_Spec.md
│   ├── Cursor_Bootstrap_Prompt.md
│   └── Whisper_MVP_Final_Task_List_CollabFormat.md
│
└── /tests
    ├── /unit
    ├── /integration
    └── /firebase
```

---

## PR #1 — Project Scaffold + Navigation Setup

**Goal:** Initialize Whisper using `npx create-expo-app@latest whisper`, configure base dependencies, navigation flow, and environment handling.

**Branch:** `feature/pr01-scaffold`

### Tasks

- [ ] Initialize project with Expo Go (latest stable SDK, TypeScript template).
- [ ] Create `.env.example` and add Firebase key placeholders.
- [ ] Set up `app.config.ts` to read from env variables.
- [ ] Add `.github/workflows/ci.yml` with `predev` and `verify` jobs.
- [ ] Configure base navigation: `AuthScreen → HomeTabs (Conversations, Profile) → ChatScreen`.
- [ ] Add memory folder (`/memory/active_context.md`, `/memory/progress.md`).
- [ ] Apply design system colors and fonts from Design Spec.

### Files

`app.config.ts`, `.env.example`, `src/index.tsx`, `src/screens/*`, `.github/workflows/ci.yml`

### Testing & Verification

- [ ] Launch app on Expo emulator; verify navigation works.
- [ ] CI passes with `npm run predev`.
- [ ] Confirm no ESLint or TypeScript errors.

### CI & Memory

- [ ] Update `/memory/active_context.md` after PR merge.
- [ ] Update `/memory/progress.md` with scaffold summary.

✅ **Merge Criteria:** App launches successfully in emulator with working navigation and CI workflow configured.

---

## PR #2 — Firebase Wiring (Auth, Firestore, RTDB, Storage)

**Goal:** Connect Firebase SDKs and implement modular services.

**Branch:** `feature/pr02-firebase`

### Tasks

- [ ] Add Firebase SDK dependencies.
- [ ] Implement `src/lib/firebase.ts` for all services.
- [ ] Enable Firestore offline persistence.
- [ ] Add Firestore, RTDB, Storage security rules and emulator config.
- [ ] Document `.env` setup instructions.

### Files

`src/lib/firebase.ts`, `firebase.rules`, `functions/package.json`

### Testing & Verification

- [ ] Verify Firestore write/read from emulator.
- [ ] Confirm Storage upload works.
- [ ] Check RTDB connection logs presence.

### CI & Memory

- [ ] Run `npm run verify` post-setup.
- [ ] Update `/memory/progress.md` with Firebase wiring summary.

✅ **Merge Criteria:** Firebase initialized with all core services working locally.

---

## PR #3 — Authentication (Email/Password)

**Goal:** Implement Firebase Auth signup, login, and logout with persistence.

**Branch:** `feature/pr03-auth`

### Tasks

- [ ] Build `AuthScreen.tsx` with login/signup toggle.
- [ ] Add context provider for auth state.
- [ ] Implement persistent login (stay signed in).
- [ ] Add logout logic and route guarding.

### Files

`src/features/auth/*`, `src/screens/AuthScreen.tsx`

### Testing & Verification

- [ ] Verify account creation and login.
- [ ] Confirm session persists after restart.
- [ ] CI test suite passes auth tests.

### CI & Memory

- [ ] Update `/memory/progress.md` with Auth context details.

✅ **Merge Criteria:** Auth flow functional with persistent session and route guard working.

---

## PR #4 — Conversations (Create + List)

**Goal:** Enable users to create, list, and display conversations.

**Branch:** `feature/pr04-conversations`

### Tasks

- [ ] Implement `ConversationsScreen.tsx` UI.
- [ ] Create new conversation logic in Firestore.
- [ ] Display list sorted by `updatedAt desc`.
- [ ] Add “+” button for new chat creation.

### Files

`src/features/conversations/*`, `src/screens/ConversationsScreen.tsx`, `src/screens/NewChatScreen.tsx`

### Testing & Verification

- [ ] Create chat, confirm it appears instantly.
- [ ] Verify updates on new messages.
- [ ] Firestore index query works.

✅ **Merge Criteria:** Conversations list syncs correctly and updates live.

---

## PR #5 — Messaging Core + Optimistic UI + Persistence

**Goal:** Enable message send/receive, optimistic updates, and local cache persistence.

**Branch:** `feature/pr05-messaging`

### Tasks

- [ ] Implement `ChatScreen.tsx` with message composer and list.
- [ ] Add optimistic UI (temporary send state).
- [ ] Paginate 30 newest messages.
- [ ] Persist drafts and scroll position.
- [ ] Add `APP_STATE_SCHEMA_VERSION` migrations.

### Files

`src/features/messages/*`, `src/screens/ChatScreen.tsx`, `src/state/*`

### Testing & Verification

- [ ] Message appears instantly on send.
- [ ] Draft survives restart.
- [ ] No duplicate sends on reconnect.

✅ **Merge Criteria:** Messaging fully functional with optimistic UI and offline persistence.

---

## PR #6 — Presence & Typing Indicators

**Goal:** Add live user status and typing indicators via RTDB.

**Branch:** `feature/pr06-presence`

### Tasks

- [ ] Implement heartbeat every 25s, idle timeout 60s.
- [ ] Add typing indicator (250ms debounce, TTL 2s).
- [ ] Create `PresenceBadge.tsx` and `TypingIndicator.tsx`.

### Files

`src/features/presence/*`, `src/components/PresenceBadge.tsx`, `src/components/TypingIndicator.tsx`

### Testing & Verification

- [ ] Verify real-time presence toggling.
- [ ] Typing indicators reset correctly.

✅ **Merge Criteria:** Presence and typing behaviors function across devices.

---

## PR #7 — Delivery States + Read Receipts

**Goal:** Implement delivery tracking for messages.

**Branch:** `feature/pr07-delivery`

### Tasks

- [ ] Add delivery state transitions.
- [ ] Create Firestore receipts collection.
- [ ] Display message states (sent/delivered/read).

### Files

`src/features/messages/api.ts`, `src/features/messages/MessageItem.tsx`

### Testing & Verification

- [ ] Send message between users and verify delivery states.

✅ **Merge Criteria:** Delivery and read receipts sync accurately.

---

## PR #8 — Image Messaging + Thumbnail Function

**Goal:** Enable image sending and thumbnail generation.

**Branch:** `feature/pr08-images`

### Tasks

- [ ] Integrate image picker (≤10MB, jpeg/png/webp).
- [ ] Upload to Storage at `/message_media/{cid}/{mid}`.
- [ ] Create Cloud Function to generate 960px thumbnail.
- [ ] Display preview + full-screen modal viewer.

### Files

`src/features/images/*`, `functions/src/index.ts`, `src/components/FullImageModal.tsx`

### Testing & Verification

- [ ] Send image and confirm thumbnail loads.
- [ ] Thumbnail auto-refreshes after generation.

✅ **Merge Criteria:** Image upload and preview work seamlessly.

---

## PR #9 — User Profiles + Avatars

**Goal:** Implement avatar uploads and fallback logic.

**Branch:** `feature/pr09-profiles`

### Tasks

- [ ] Allow user to upload profile picture (square).
- [ ] Circle crop on display, initials fallback.
- [ ] Sync avatar updates in all chats.

### Files

`src/features/profiles/*`, `src/screens/ProfileScreen.tsx`

### Testing & Verification

- [ ] Upload new avatar, verify instant refresh.
- [ ] Check fallback avatar when no image exists.

✅ **Merge Criteria:** Avatars display correctly and update in real time.

---

## PR #10 — Group Chats (3+ Users)

**Goal:** Extend chat support to multiple participants.

**Branch:** `feature/pr10-groups`

### Tasks

- [ ] Allow conversation creation with multiple members.
- [ ] Show sender attribution per message.
- [ ] Handle group message delivery logic.

✅ **Merge Criteria:** Group messaging works for 3+ users.

---

## PR #11 — Notifications + Message Timestamps

**Goal:** Add simulated notifications and consistent timestamps.

**Branch:** `feature/pr11-notifications`

### Tasks

- [ ] Create `Banner.tsx` for in-app notifications.
- [ ] Display message timestamps in UI.

✅ **Merge Criteria:** Notifications appear in-app; timestamps display correctly.

---

## PR #12 — Persistence Hardening + Logout Hygiene

**Goal:** Finalize cache and state management behaviors.

**Branch:** `feature/pr12-persistence`

### Tasks

- [ ] Validate queue survival after restart.
- [ ] Ensure logout clears all caches (keep prefs).

✅ **Merge Criteria:** State restores smoothly post-restart.

---

## PR #13 — Testing & CI Verification

**Goal:** Establish final test suite for all core features.

**Branch:** `feature/pr13-testing`

### Tasks

- [ ] Add Jest + Firebase Emulator rule tests.
- [ ] Organize tests by feature (`/tests/unit`, `/tests/integration`, `/tests/firebase`).
- [ ] Ensure CI passes all stages.

✅ **Merge Criteria:** All automated tests pass in CI.

---

## PR #14 — Final QA + Emulator Runbook

**Goal:** Verify full functionality and emulator setup documentation.

**Branch:** `feature/pr14-finalqa`

### Tasks

- [ ] Document emulator setup in `README.md`.
- [ ] Verify message flow, presence, receipts, and media on both Android/iOS emulators.
- [ ] Conduct end-to-end functional test.

✅ **Merge Criteria:** Whisper MVP fully functional and documented for handoff.

---

## 🚀 Post-MVP Placeholder

Future roadmap includes voice messages, emoji reactions, FCM push notifications, and advanced media previews.
