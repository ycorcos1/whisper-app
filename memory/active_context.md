# Whisper — Active Context

**Last Updated:** PR #12 (Persistence Hardening + Logout Hygiene)  
**Schema Version:** 1  
**Current Phase:** Persistence Layer Complete

---

## Architecture Overview

### Tech Stack

- **Framework:** React Native with Expo Go (~54.0.0)
- **Language:** TypeScript (strict mode)
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State Management:** React hooks + Context + Firebase Realtime
- **Backend:** Firebase (Auth, Firestore, RTDB, Storage, Functions)

### Project Structure

```
whisper-app/
├── docs/                    # Product documentation (PRD, Task List, Design Spec)
├── src/
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Screen components
│   ├── theme/               # Design system (colors, typography, spacing)
│   ├── features/            # Feature modules (to be added in later PRs)
│   ├── lib/                 # Utilities and Firebase setup (PR #2)
│   └── state/               # State management (PR #5)
├── memory/                  # Memory Bank for context tracking
├── scripts/                 # Build and validation scripts
├── .github/workflows/       # CI/CD configuration
└── [config files]
```

---

## Completed PRs

### PR #1 — Repo Scaffolding ✅

**Status:** Complete  
**Files Created:**

- Configuration: `package.json`, `tsconfig.json`, `app.config.ts`, `.env.example`
- CI/CD: `.github/workflows/ci.yml`, `scripts/check-env.js`
- Navigation: `src/navigation/RootNavigator.tsx`, `src/navigation/types.ts`
- Screens: `AuthScreen`, `HomeTabs`, `ConversationsScreen`, `ProfileScreen`, `ChatScreen`, `NewChatScreen`
- Design System: `src/theme/` (colors, typography, spacing)
- Entry Points: `App.tsx`, `index.js`
- Memory Bank: `memory/active_context.md`, `memory/progress.md`

**Key Decisions:**

- Using dark mode as default theme (Deep Twilight #1B1325)
- Purple/silver color palette per Design Spec
- Strict TypeScript configuration enabled
- Navigation flow: Auth → HomeTabs (Conversations, Profile) → ChatScreen

### PR #2 — Firebase Wiring ✅

**Status:** Complete  
**Files Created:**

- Firebase Integration: `src/lib/firebase.ts`
- Security Rules: `firestore.rules`, `storage.rules`, `database.rules.json`
- Cloud Functions: `functions/src/index.ts`, `functions/package.json`, `functions/tsconfig.json`
- Configuration: `firebase.json`, `firestore.indexes.json`
- Documentation: `FIREBASE_SETUP.md`

**Key Decisions:**

- Firestore offline persistence enabled with `experimentalForceLongPolling`
- Member-based access control for all conversation data
- Cloud Functions structure ready for PR #8 (thumbnail generation)
- Type-safe Firebase SDK exports for clean importing

### PR #3 — Authentication ✅

**Status:** Complete  
**Files Created:**

- Auth Context: `src/state/auth/AuthContext.tsx`, `src/state/auth/useAuth.ts`
- User Types: `src/types/user.ts`
- Functional AuthScreen with email/password auth

**Key Features:**

- Email/password signup and login
- Persistent auth state with AsyncStorage
- User profile creation in Firestore
- Route guarding based on auth state
- Online/offline status tracking

### PR #4 — Conversations (Create + List) ✅

**Status:** Complete  
**Files Created:**

- Conversations API: `src/features/conversations/api.ts`
- NewChatScreen for creating conversations
- Real-time conversation list

**Key Features:**

- Real-time conversation sync sorted by `updatedAt`
- Support for DM and group types
- User lookup by email
- Swipe-to-delete and bulk delete
- Select mode for batch operations

### PR #5 — Messaging Core + Optimistic UI + Persistence ✅

**Status:** Complete  
**Files Created:**

- Messages API: `src/features/messages/api.ts`
- Persistence Layer: `src/features/messages/persistence.ts`
- Optimistic UI Hook: `src/features/messages/useOptimisticMessages.ts`
- Public API: `src/features/messages/index.ts`

**Key Features:**

- Real-time message subscription (30 message pagination)
- Optimistic UI with instant feedback
- Draft persistence with 500ms debounce
- Scroll position restoration
- Offline queue with exponential backoff retry (1s → 2s → 4s → 8s → 16s → 32s)
- Schema migrations with `APP_STATE_SCHEMA_VERSION`
- Cache clearing on logout (preserves theme prefs)

**Modified Files:**

- `src/screens/ChatScreen.tsx` - Full messaging implementation
- `App.tsx` - Added migration runner
- `src/state/auth/AuthContext.tsx` - Added cache clearing on logout

### PR #6 — Presence & Typing Indicators ✅

**Status:** Complete  
**Files Created:**

- Presence Hooks: `src/features/presence/usePresence.ts`, `src/features/presence/useUserPresence.ts`, `src/features/presence/useTypingIndicator.ts`
- Components: `src/components/PresenceBadge.tsx`, `src/components/TypingIndicator.tsx`
- Public API: `src/features/presence/index.ts`

**Key Features:**

- User presence tracking with 25s heartbeat and 60s idle timeout
- Auto-disconnect handling with RTDB onDisconnect
- Real-time typing indicators with 250ms debounce and 2s TTL
- Animated typing dots indicator component
- Online/offline presence badge with color coding
- AppState integration for background/foreground detection

**Modified Files:**

- `App.tsx` - Added AppWithPresence wrapper for presence initialization
- `src/screens/ChatScreen.tsx` - Integrated typing indicators
- `src/screens/ConversationsScreen.tsx` - Added presence badges to conversation list
- `src/features/conversations/api.ts` - Added otherUserId to ConversationListItem

### PR #7 — Delivery States + Read Receipts ✅

**Status:** Complete  
**Files Created:**

- MessageItem Component: `src/components/MessageItem.tsx`
- Updated Messages API: `src/features/messages/api.ts` (added delivery tracking functions)

**Key Features:**

- Message status tracking: sending → sent → delivered → read
- `markMessagesAsDelivered()` - Auto-marks messages as delivered when recipient opens conversation
- `markMessagesAsRead()` - Auto-marks messages as read after 1 second of viewing
- Visual delivery indicators with checkmarks:
  - ⏱ Sending (clock icon)
  - ✓ Sent (single checkmark)
  - ✓✓ Delivered (double checkmark)
  - ✓✓ Read (blue double checkmark)
- Timestamp formatting (time for today, date for older messages)
- Only sender sees status indicators

**Modified Files:**

- `src/screens/ChatScreen.tsx` - Integrated MessageItem and delivery tracking
- `src/features/messages/index.ts` - Exported new delivery functions
- `firestore.rules` - Updated to allow members to update message status
- `firestore.indexes.json` - Added composite index for senderId + status queries

### PR #10 — Group Chats (3+ Users) ✅

**Status:** Complete  
**Files Modified:**

- Conversations API: `src/features/conversations/api.ts` (+51 lines)
- New Chat Screen: `src/screens/NewChatScreen.tsx` (+24 lines)
- Chat Screen: `src/screens/ChatScreen.tsx` (+39 lines)
- Message Item: `src/components/MessageItem.tsx` (+12 lines)
- Messages API: `src/features/messages/api.ts` (+1 line)

**Key Features:**

- **Group Conversation Creation:**

  - `createGroupConversation(userIds)` - Creates group with 3+ users
  - Multi-user selection in NewChatScreen
  - Dynamic button text: "Create Chat" (DM) vs "Create Group (N)"
  - Auto-generated group name from member display names

- **Sender Attribution:**

  - Messages in groups show sender name above text
  - Only displayed for messages from other users
  - Styled in amethyst color for visibility
  - Own messages don't show sender name

- **Group Display:**

  - Conversations list shows comma-separated member names
  - No presence badge for groups (DM only)
  - Typing indicators work for groups
  - Delivery states function for groups

- **Helper Functions:**
  - `getConversation(conversationId)` - Retrieves conversation details
  - `getUserDisplayName(userId)` - Resolves user display names
  - Enhanced `subscribeToUserConversations()` for group naming

**Data Model:**

```typescript
// Conversation document structure
{
  members: string[]              // All member UIDs (sorted)
  type: "dm" | "group"           // Distinguishes conversation type
  lastMessage?: {...}
  updatedAt: Timestamp
}

// Message interface (client-side)
interface Message {
  // ... existing fields
  senderName?: string            // For group chat sender attribution
}
```

**Implementation Notes:**

- Conversation type detected on ChatScreen mount
- Member names loaded and cached for groups
- Messages enriched with sender names client-side
- MessageItem conditionally displays sender based on `showSender` prop
- No custom group names or avatars (MVP limitation)
- No member management (add/remove) in MVP

### PR #11 — Notifications + Message Timestamps ✅

**Status:** Complete  
**Files Created:**

- Banner Component: `src/components/Banner.tsx`
- Notification Context: `src/state/NotificationContext.tsx`
- Notification Wrapper: `src/components/NotificationBanner.tsx`

**Key Features:**

- **In-App Banner Notifications:**

  - Animated slide-in banner for new messages
  - Swipe-to-dismiss gesture support (up, left, right)
  - Auto-dismiss after 5 seconds
  - Tap to navigate to conversation
  - Safe area aware positioning with z-index 9999
  - Purple accent border matching design system

- **Intelligent Notification Filtering:**

  - Only shows notifications for messages from other users
  - Suppresses notifications when in active conversation
  - Only shows when app is in foreground
  - Tracks last seen messages per conversation
  - Detects new messages via timestamp + content comparison

- **Message Timestamps:**
  - Verified implementation in MessageItem.tsx
  - Today's messages show time (e.g., "3:45 PM")
  - Older messages show date (e.g., "Oct 20")
  - Displayed alongside delivery status indicators

**Modified Files:**

- `App.tsx` - Added NotificationProvider and NotificationBanner components
- `src/screens/ChatScreen.tsx` - Integrated active conversation tracking

**Technical Implementation:**

- React Native Animated API for smooth animations
- PanResponder for gesture handling
- Context API for global notification state
- AppState listener for foreground detection
- Firestore conversation listener for message detection

### PR #12 — Persistence Hardening + Logout Hygiene ✅

**Status:** Complete  
**Files Created:**

- Queue Processor: `src/features/messages/queueProcessor.ts`
- Persistence Tests: `src/features/messages/__tests__/persistence.test.ts`
- Documentation: `PR12_COMPLETION_SUMMARY.md`

**Key Features:**

- **Global Queue Processor:**

  - Runs automatically on app startup and every 30 seconds
  - Processes queued messages even if user doesn't navigate to chat
  - Exponential backoff retry logic (1s → 2s → 4s → 8s → 16s → 32s)
  - Max 6 retries per message before marking as failed
  - Queue status debugging function

- **Queue Survival After Restart:**

  - All queued messages persist in AsyncStorage
  - Queue automatically restored and processed on app restart
  - Works offline and retries when connection returns
  - No message loss during app restarts

- **Logout Hygiene:**

  - Clears: drafts, scroll positions, outbound queue, selected conversation
  - Preserves: theme preferences, schema version
  - `clearAllCachesExceptPrefs()` function in persistence.ts
  - Integrated into AuthContext logout flow

- **Comprehensive Testing:**
  - 25 test cases covering all persistence scenarios
  - All tests passing (100% success rate)
  - Tests for queue survival, logout hygiene, retry logic, migrations

**Modified Files:**

- `App.tsx` - Added global queue processor initialization on startup
- `src/features/messages/index.ts` - Exported queue processor functions

**Test Coverage:**

- Schema migrations (3 tests)
- Outbound queue operations (5 tests)
- Retry logic with exponential backoff (5 tests)
- Drafts management (3 tests)
- Scroll position (2 tests)
- Selected conversation (2 tests)
- Theme preferences (2 tests)
- Logout hygiene verification (1 test)
- Queue survival after restart (2 tests)

---

## Next Steps

### PR #8 — Image Messaging + Thumbnail Function (Recommended Next)

- Integrate Expo image picker
- Upload images to Firebase Storage
- Create Cloud Function for thumbnail generation (960px max-edge)
- Display image preview and full-screen viewer
- Support image delivery states

### PR #9 — User Profiles + Avatars

- Allow avatar uploads to Firebase Storage
- Circle crop display with initials fallback
- Sync avatar updates across all chats

### PR #13 — Testing & CI Verification

- Organize tests by feature
- Add Firebase Emulator rule tests
- Ensure CI passes all stages

### PR #14 — Final QA + Emulator Runbook

- Document emulator setup
- End-to-end functional testing
- Production readiness verification

---

## Schema Version

**APP_STATE_SCHEMA_VERSION:** 1  
**Migration Strategy:** Defined in PR #5 (Persistence)

---

## Known Issues / Technical Debt

1. Icon components in HomeTabs.tsx use emoji placeholders (should add icon library in future)
2. Image messaging not yet implemented (planned for PR #8)
3. Message pagination is one-way (no "load more" for older messages)
4. Group chat typing indicators show generic "typing..." (no multi-user names)
5. Delivery/read receipts update in batch (not per-message tracking)
6. ~~Banner notifications show for all new messages~~ ✅ Fixed in PR #11
7. Queue processor logs to console (can be removed in production)

---

## Environment Configuration

**Required Variables:**

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_DATABASE_URL`

**Validation:** `npm run predev` checks all required env vars before running

---

## Design System Reference

**Primary Colors:**

- Deep Twilight: `#1B1325` (background)
- Amethyst Glow: `#9C7AFF` (primary accent)
- Lavender Haze: `#C7B8FF` (secondary accent)
- Silver Mist: `#C9C9D1` (neutral)

**Typography:**

- Font: System (Inter/SF Pro on iOS, Roboto on Android)
- Scale: xs(11) → sm(13) → base(15) → lg(17) → xl(20) → 2xl(24) → 3xl(30) → 4xl(36)

**Spacing:**

- Scale: xs(4) → sm(8) → md(16) → lg(24) → xl(32) → 2xl(48) → 3xl(64)

---

**Next Action:** Ready for PR #8 (Image Messaging + Thumbnail Function) or PR #9 (User Profiles + Avatars). PR #12 (Persistence Hardening) is complete.
